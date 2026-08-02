import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";

export const Route = createFileRoute("/app/guide")({
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="space-y-6">
      <Link
        to="/app"
        className="inline-flex min-h-[var(--mode-target)] items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="space-y-2">
        <p className="label-eyebrow text-[var(--color-primary)]">Demo aid</p>
        <h1 className="font-display text-display">Reading guide</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed max-w-prose">
          How to approach historical spellings in this demo — slowly, with
          respect, until living speakers replace every form.
        </p>
      </header>

      <HistoricalBanner />

      <OrthographyGuide />
    </div>
  );
}
