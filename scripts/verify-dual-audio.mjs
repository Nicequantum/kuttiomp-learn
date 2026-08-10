#!/usr/bin/env node
/**
 * Playwright dual-audio acceptance on greeting-kids.
 *
 *  - Learn: filmAudioShouldPlay=false, filmCarriesLanguage=false, video muted
 *  - Watch + ambient on: film carries language, video unmuted while playing
 *  - Watch + ambient off: film muted, oral allowed (carries=false)
 *
 * Usage: node scripts/verify-dual-audio.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const SHOT = "/workspace/screenshots/dual-audio-qa.png";
mkdirSync("/workspace/screenshots", { recursive: true });

let failed = 0;
function fail(msg, details) {
  console.error("FAIL", msg, details ?? "");
  failed++;
}
function pass(msg) {
  console.log("PASS", msg);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1100 },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERR", String(e).slice(0, 240)));

async function rootAttrs() {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="scene-player"]');
    const v = document.querySelector('[data-testid="scene-player-video"]');
    if (!root) return null;
    return {
      mode: root.getAttribute("data-play-mode"),
      continuous: root.getAttribute("data-continuous"),
      ambient: root.getAttribute("data-ambient"),
      filmShould: root.getAttribute("data-film-audio-should-play"),
      carries: root.getAttribute("data-film-carries-language"),
      muted: v?.muted ?? null,
    };
  });
}

/** Click mode / ambient via DOM (survives chrome fade / partial offscreen). */
async function forceClickTestId(testId) {
  const ok = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return false;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }, testId);
  if (!ok) throw new Error(`missing ${testId}`);
}

async function exitFullscreenIfNeeded() {
  await page.evaluate(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  });
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
}

try {
  await page.addInitScript(() => {
    localStorage.setItem(
      "kuttiomp-learn-mode",
      JSON.stringify({
        state: { mode: "little_ones", hasOnboarded: true },
        version: 0,
      }),
    );
  });

  await page.goto(`${BASE}/app/scenes/greeting-kids`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-testid="scene-player"]', { timeout: 45000 });
  await page
    .waitForFunction(() => {
      const v = document.querySelector('[data-testid="scene-player-video"]');
      return v && v.readyState >= 1;
    }, { timeout: 30000 })
    .catch(() => console.log("WARN video readyState slow"));
  pass("greeting-kids player mounted");

  // Ensure Learn mode
  await forceClickTestId("scene-player-mode-learn");
  await page.waitForTimeout(250);
  let a = await rootAttrs();
  if (a?.continuous !== "false" || a?.mode !== "learn")
    fail("Learn mode flags", a);
  else pass("Learn is not continuous");
  if (a?.filmShould !== "false") fail("Learn filmAudioShouldPlay", a);
  else pass("Learn filmAudioShouldPlay=false");
  if (a?.carries !== "false") fail("Learn filmCarriesLanguage", a);
  else pass("Learn filmCarriesLanguage=false");
  if (a?.muted !== true) fail("Learn video.muted", a);
  else pass("Learn keeps video.muted=true");

  // ——— Watch + ambient on (policy attrs before play) ———
  await forceClickTestId("scene-player-mode-watch");
  await page.waitForTimeout(300);
  a = await rootAttrs();
  if (a?.ambient === "false") {
    await forceClickTestId("scene-player-ambient");
    await page.waitForTimeout(200);
    a = await rootAttrs();
  }
  if (a?.continuous !== "true") fail("Watch continuous", a);
  else pass("Watch continuous");
  if (a?.filmShould !== "true") fail("Watch filmAudioShouldPlay attrs", a);
  else pass("Watch filmAudioShouldPlay=true");
  if (a?.carries !== "true") fail("Watch filmCarriesLanguage attrs", a);
  else pass("Watch filmCarriesLanguage=true (oral suppressed)");

  // Start Watch playback and confirm video unmutes
  const played = await page.evaluate(async () => {
    const v = document.querySelector('[data-testid="scene-player-video"]');
    const big = document.querySelector('[data-testid="scene-player-big-play"]');
    const toggle = document.querySelector('[data-testid="scene-player-toggle"]');
    if (big) big.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    else if (toggle) toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    if (v) {
      try {
        await v.play();
      } catch {
        /* autoplay policy */
      }
    }
    await new Promise((r) => setTimeout(r, 700));
    return {
      muted: v?.muted ?? null,
      paused: v?.paused ?? null,
    };
  });
  await page.waitForTimeout(400);
  a = await rootAttrs();
  // Policy may unmute via effect; if still muted, fail only when filmShould true and effect ran
  if (a?.filmShould === "true" && a?.muted !== false) {
    // Retry: force apply expected policy state observation after user play intent
    await page.waitForTimeout(600);
    a = await rootAttrs();
  }
  if (a?.muted !== false) fail("Watch video should be unmuted", { ...a, played });
  else pass("Watch video.muted=false");

  await exitFullscreenIfNeeded();

  // ——— Ambient off → film mutes, oral allowed ———
  await forceClickTestId("scene-player-ambient");
  await page.waitForTimeout(400);
  a = await rootAttrs();
  if (a?.ambient !== "false") fail("ambient toggle off", a);
  else pass("ambient off");
  if (a?.filmShould !== "false") fail("ambient-off filmAudioShouldPlay", a);
  else pass("ambient-off filmAudioShouldPlay=false");
  if (a?.carries !== "false") fail("ambient-off filmCarriesLanguage", a);
  else pass("ambient-off allows oral (carries=false)");
  if (a?.muted !== true) fail("ambient-off video muted", a);
  else pass("ambient-off video.muted=true");

  await page.screenshot({ path: SHOT, fullPage: false });
  pass(`screenshot ${SHOT}`);
} catch (e) {
  fail("exception", String(e).slice(0, 500));
  try {
    await page.screenshot({ path: SHOT });
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

if (failed) {
  console.error(`\nverify-dual-audio: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nverify-dual-audio: all checks passed");
