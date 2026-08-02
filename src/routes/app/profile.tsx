import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { MODE_LIST, MODES, type LearningMode } from "@/lib/mode/modes";
import { useModeStore } from "@/lib/mode/store";
import { useProgressStore } from "@/lib/progress/store";
import { MasteryPanel } from "@/components/content/MasteryPanel";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllWords, getCorpusMeta, getCorpusLoadState, getPaths } from "@/lib/content/corpus";
import { KEEPER_PORTAL_URL } from "@/lib/content/config";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { checkTtsStatus } from "@/lib/audio/speak";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const mode = useModeStore((s) => s.mode);
  const setMode = useModeStore((s) => s.setMode);
  const resetOnboarding = useModeStore((s) => s.resetOnboarding);
  const clearProgress = useProgressStore((s) => s.clearDemoProgress);
  const meta = getCorpusMeta();
  const loadState = getCorpusLoadState();
  const totalWords = getAllWords().length;
  const totalPaths = getPaths().length;
  const [tts, setTts] = useState<string>("…");

  useEffect(() => {
    void checkTtsStatus().then((s) => {
      if (!s.configured) {
        setTts("Cloud voice not configured — add XAI_API_KEY on Vercel");
        return;
      }
      if (s.provider === "xai-voice-agent") {
        setTts(`Your Voice Agent is connected (${s.voice})`);
        return;
      }
      setTts(`Grok TTS ready (voice: ${s.voice ?? "default"})`);
    });
  }, []);

  function switchMode(id: LearningMode) {
    setMode(id);
  }

  function restartWelcome() {
    resetOnboarding();
    navigate({ to: "/welcome" });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-display">Profile</h1>
        <p className="text-content text-[var(--color-muted)]">
          Your path, progress, and how this demo becomes production.
        </p>
      </header>

      <MasteryPanel />

      <section className="surface-card pad-mode">
        <p className="font-medium">Reading guide</p>
        <p className="mt-1 text-sm text-[var(--color-muted)] leading-relaxed">
          Tips for sounding out historical demo spellings — not living orthography.
        </p>
        <Link to="/app/guide" className="mt-3 inline-flex min-h-[var(--mode-target)] items-center font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Open reading guide
        </Link>
      </section>

      <section className="space-y-3" aria-labelledby="mode-heading">
        <h2 id="mode-heading" className="font-display text-title">
          Learning mode
        </h2>
        <div className="grid gap-2">
          {MODE_LIST.map((id) => {
            const m = MODES[id];
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                className={cn(
                  "surface-card pad-mode text-left transition-colors",
                  active &&
                    "border-[var(--color-primary)] ring-2 ring-[var(--color-ring)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{m.label}</p>
                  {active && <Badge tone="primary">Active</Badge>}
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {m.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="install-heading">
        <h2 id="install-heading" className="font-display text-title">
          Install on phone
        </h2>
        <div className="surface-card pad-mode space-y-2 text-[var(--color-muted)] leading-relaxed">
          <p>
            On iPhone: open this site in{" "}
            <strong className="text-[var(--color-fg)]">Safari</strong>, tap
            Share, then{" "}
            <strong className="text-[var(--color-fg)]">Add to Home Screen</strong>
            .
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="voice-heading">
        <h2 id="voice-heading" className="font-display text-title">
          Voice engine
        </h2>
        <div className="surface-card pad-mode space-y-2">
          <p className="font-medium">{tts}</p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            To use the agent you created, set{" "}
            <code className="text-[var(--color-fg)]">XAI_VOICE_AGENT_ID</code>{" "}
            to your <code className="text-[var(--color-fg)]">agent_…</code> id
            (or put that id in{" "}
            <code className="text-[var(--color-fg)]">XAI_TTS_VOICE</code>). The
            app speaks through that agent’s voice via realtime WebSocket.
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="corpus-heading">
        <h2 id="corpus-heading" className="font-display text-title">
          Content corpus
        </h2>
        <HistoricalBanner />
        <div className="surface-card pad-mode space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="warn">{meta.label}</Badge>
            <Badge tone="neutral">{totalWords} words</Badge>
            <Badge tone="neutral">{totalPaths} paths</Badge>
            <Badge tone="neutral">{loadState.source}</Badge>
          </div>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            {loadState.message}
            {loadState.corpusVersion ? ` · version ${loadState.corpusVersion}` : ""}
          </p>
          <p className="text-[var(--color-muted)] leading-relaxed">
            <strong className="text-[var(--color-fg)]">Source:</strong>{" "}
            {meta.sourceWork.title} ({meta.sourceWork.author},{" "}
            {meta.sourceWork.year}). {meta.sourceWork.note}
          </p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="keepers-heading">
        <h2 id="keepers-heading" className="font-display text-title">
          For speakers & Keepers
        </h2>
        <div className="surface-card pad-mode space-y-3 text-[var(--color-muted)] leading-relaxed">
          <p>
            This is the learner home. The Knowledge Keeper portal stays
            separate.
          </p>
          {KEEPER_PORTAL_URL ? (
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <a href={KEEPER_PORTAL_URL} target="_blank" rel="noreferrer">
                Open Keeper portal
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <p className="text-sm text-[var(--color-subtle)]">
              Set{" "}
              <code className="text-[var(--color-fg)]">VITE_KEEPER_PORTAL_URL</code>{" "}
              to link your admin site.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={clearProgress}>
          Clear demo progress
        </Button>
        <Button type="button" variant="ghost" onClick={restartWelcome}>
          Restart mode selection
        </Button>
      </div>
    </div>
  );
}
