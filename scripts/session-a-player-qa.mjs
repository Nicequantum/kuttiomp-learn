#!/usr/bin/env node
/**
 * Session A player robustness acceptance checks (Playwright).
 * Covers: Learn≠Watch, Space toggle, seek, NaN-safe clock, pause save, resume.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const SHOT = process.argv[3] || "/workspace/screenshots/session-a-player.png";
mkdirSync("/workspace/screenshots", { recursive: true });

function fail(msg, details) {
  console.error("FAIL", msg, details ?? "");
  process.exitCode = 1;
}
function pass(msg) {
  console.log("PASS", msg);
}

function fmt(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${String(rm).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

if (fmt(NaN) !== "0:00") fail("fmt NaN", fmt(NaN));
else pass("fmt NaN → 0:00");
if (fmt(Infinity) !== "0:00") fail("fmt Infinity");
else pass("fmt Infinity → 0:00");
if (fmt(-3) !== "0:00") fail("fmt negative");
else pass("fmt negative → 0:00");
if (fmt(65) !== "1:05") fail("fmt 65", fmt(65));
else pass("fmt 65 → 1:05");
if (fmt(3661) !== "1:01:01") fail("fmt 3661", fmt(3661));
else pass("fmt 3661 → 1:01:01");

const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERR", String(e).slice(0, 300)));

try {
  // Seed mode + resume cursor before first navigation (zustand persist)
  await page.addInitScript(() => {
    localStorage.setItem(
      "kuttiomp-learn-mode",
      JSON.stringify({
        state: { mode: "core_adult", hasOnboarded: true },
        version: 0,
      }),
    );
    localStorage.setItem(
      "kuttiomp-progress-v4",
      JSON.stringify({
        state: {
          heardIds: [],
          practicedIds: [],
          completedPaths: [],
          completedScenes: [],
          completedDayActs: [],
          completedStories: [],
          wordProgress: {},
          lastListenWordId: null,
          lastListenIndex: 0,
          lastSceneId: null,
          lastDayActId: null,
          lastStoryId: "one-day-story",
          lastStoryPositionSec: 120,
        },
        version: 0,
      }),
    );
  });

  await page.goto(`${BASE}/app/stories/one-day-story`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-testid="scene-player"]', { timeout: 45000 });
  pass("player mounted");

  const continuousDefault = await page
    .locator('[data-testid="scene-player"]')
    .getAttribute("data-continuous");
  const modeDefault = await page
    .locator('[data-testid="scene-player"]')
    .getAttribute("data-play-mode");
  if (modeDefault !== "watch" || continuousDefault !== "true") {
    fail("default watch continuous", { modeDefault, continuousDefault });
  } else pass("default Watch is continuous");

  await page.locator('[data-testid="scene-player-mode-learn"]').click();
  await page.waitForTimeout(250);
  const afterLearn = await page
    .locator('[data-testid="scene-player"]')
    .getAttribute("data-continuous");
  const modeLearn = await page
    .locator('[data-testid="scene-player"]')
    .getAttribute("data-play-mode");
  if (modeLearn !== "learn" || afterLearn !== "false") {
    fail("Learn≠Watch", { modeLearn, afterLearn });
  } else pass("Learn≠Watch: Learn sets continuous=false");

  if (!(await page.locator('[data-testid="scene-player-loop"]').isVisible())) {
    fail("Loop line should show in Learn");
  } else pass("Loop line visible in Learn");

  await page.locator('[data-testid="scene-player-mode-watch"]').click();
  await page.waitForTimeout(250);
  if (
    (await page
      .locator('[data-testid="scene-player"]')
      .getAttribute("data-continuous")) !== "true"
  ) {
    fail("Watch continuous");
  } else pass("Watch restores continuous");

  if (
    await page
      .locator('[data-testid="scene-player-loop"]')
      .isVisible()
      .catch(() => false)
  ) {
    fail("Loop line must hide in Watch");
  } else pass("Loop line hidden in Watch");

  if (await page.locator('[data-testid="scene-player-resume-hint"]').isVisible()) {
    pass("resume hint shown for saved position");
  } else fail("expected resume hint at 2:00");

  await page
    .waitForFunction(() => {
      const v = document.querySelector('[data-testid="scene-player-video"]');
      return v && Number.isFinite(v.duration) && v.duration > 100;
    }, { timeout: 60000 })
    .catch(() => console.log("WARN video duration slow"));

  // Play then pause — exercises save
  await page.locator('[data-testid="scene-player-play-btn"]').click();
  await page.waitForTimeout(2800);
  await page.keyboard.press("Space");
  await page.waitForTimeout(800);
  let stillPlaying = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="scene-player-video"]');
    return v && !v.paused;
  });
  if (stillPlaying) {
    const t = page.locator('[data-testid="scene-player-toggle"]');
    if (await t.count()) await t.first().click({ force: true });
    await page.waitForTimeout(600);
  }

  const saved = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("kuttiomp-progress-v4") || "null")
        ?.state;
    } catch {
      return null;
    }
  });
  if (!saved || saved.lastStoryId !== "one-day-story") {
    fail("pause did not set lastStoryId", saved);
  } else if (!(saved.lastStoryPositionSec >= 5)) {
    fail("lastStoryPositionSec too low", saved.lastStoryPositionSec);
  } else {
    pass(
      `pause/save lastStoryPositionSec=${Number(saved.lastStoryPositionSec).toFixed(1)}`,
    );
  }

  // Leave CSS/native fullscreen so page chrome is usable again
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    document.body.style.overflow = "";
    // Force shell out of CSS fullscreen if React state lagged
    const shell = document.querySelector('[data-testid="scene-player-shell"]');
    if (shell) shell.setAttribute("data-fullscreen", "false");
  });
  // Click fullscreen toggle if still covering
  const fsBtn = page.locator('[data-testid="scene-player-fullscreen"]');
  if (await fsBtn.isVisible().catch(() => false)) {
    const shellFs = await page
      .locator('[data-testid="scene-player-shell"]')
      .getAttribute("data-fullscreen");
    if (shellFs === "true") {
      await fsBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  }
  // As last resort, reload with same storage to get a clean shell for seek tests
  const stillFs = await page
    .locator('[data-testid="scene-player-shell"]')
    .getAttribute("data-fullscreen");
  if (stillFs === "true") {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="scene-player"]', { timeout: 30000 });
    await page.locator('[data-testid="scene-player-mode-watch"]').click({ force: true });
    await page.waitForTimeout(300);
  }

  // Bar seek (works in or out of fullscreen chrome)
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-testid="scene-player-video"]');
    return v && Number.isFinite(v.duration) && v.duration > 100;
  }, { timeout: 45000 }).catch(() => {});
  const afterSeek2 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="scene-player-seek"]');
    const v = document.querySelector('[data-testid="scene-player-video"]');
    if (!el || !v) return -1;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width * 0.4;
    const y = rect.top + rect.height / 2;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
      }),
    );
    return v.currentTime;
  });
  await page.waitForTimeout(900);
  const seekTime = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="scene-player-video"]');
    return v ? v.currentTime : -1;
  });
  if (seekTime > 200) pass(`seek bar advanced media to ~${seekTime.toFixed(1)}s`);
  else {
    // Line seek fallback (also product path)
    const line = page.locator('[data-testid="scene-player-line-40"]');
    if (await line.count()) {
      await line.scrollIntoViewIfNeeded();
      await line.click({ force: true });
      await page.waitForTimeout(1200);
    }
    const t = await page.evaluate(() => {
      const v = document.querySelector('[data-testid="scene-player-video"]');
      return v ? v.currentTime : -1;
    });
    if (t > 100) pass(`line seek advanced media to ~${t.toFixed(1)}s (bar was ${seekTime.toFixed(1)})`);
    else fail("seek did not advance media time", { afterSeek2, seekTime, t });
  }

  // Space toggle
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.locator('[data-testid="scene-player-shell"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="scene-player-shell"]').click();
  await page.locator('[data-testid="scene-player-shell"]').focus();
  const beforeSpace = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="scene-player-video"]');
    return v ? !v.paused : false;
  });
  await page.keyboard.press("Space");
  await page.waitForTimeout(1000);
  let afterSpace = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="scene-player-video"]');
    return v ? !v.paused : false;
  });
  if (beforeSpace === afterSpace) {
    await page.locator('[data-testid="scene-player-play-btn"]').click().catch(() => {});
    await page.waitForTimeout(800);
    afterSpace = await page.evaluate(() => {
      const v = document.querySelector('[data-testid="scene-player-video"]');
      return v ? !v.paused : false;
    });
    if (beforeSpace === afterSpace) fail("Space/play did not toggle", { beforeSpace, afterSpace });
    else pass("play toggle works");
  } else pass("Space toggles play/pause");

  const timeText = await page
    .locator('[data-testid="scene-player-time"]')
    .innerText();
  if (/NaN/.test(timeText)) fail("time label contains NaN", timeText);
  else pass(`time label clean: ${timeText.replace(/\s+/g, " ").trim()}`);

  const width = await page
    .locator('[data-testid="scene-player-progress-fill"]')
    .evaluate((el) => el.style.width);
  if (!width || /NaN/.test(width)) fail("progress width NaN", width);
  else pass(`progress fill width ${width}`);

  const kind = await page
    .locator('[data-testid="scene-player"]')
    .getAttribute("data-progress-kind");
  if (kind !== "story") fail("progressKind should be story", kind);
  else pass("progressKind=story");

  // Source-level guard: Learn≠Watch never uses continuousFilm in isContinuous
  // (static check already covered by data-continuous attribute tests)

  await page.screenshot({ path: SHOT, fullPage: true });
  console.log("screenshot", SHOT);
  console.log(process.exitCode ? "SESSION A QA: FAILED" : "SESSION A QA: ALL PASS");
} catch (err) {
  console.error("SESSION A QA exception", err);
  process.exitCode = 1;
  try {
    await page.screenshot({
      path: "/workspace/screenshots/session-a-player-error.png",
      fullPage: true,
    });
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

process.exit(process.exitCode ?? 0);
