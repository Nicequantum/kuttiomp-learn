import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import {
  ORTHOGRAPHY_DISCLAIMER,
  ORTHOGRAPHY_PRACTICE_ORDER,
  ORTHOGRAPHY_TIPS,
} from "@/lib/content/orthography-guide";
import { cn } from "@/lib/utils";

export function OrthographyGuide({
  compact = false,
  defaultOpen = false,
  className,
}: {
  compact?: boolean;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (compact) {
    return (
      <div className={cn("surface-card overflow-hidden", className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 pad-mode text-left min-target"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 font-medium">
            <BookOpen
              className="h-5 w-5 text-[var(--color-primary)]"
              aria-hidden
            />
            How to read historical spellings
          </span>
          {open ? (
            <ChevronUp className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />
          )}
        </button>
        {open && (
          <div className="space-y-4 border-t border-[var(--color-border)] px-[var(--mode-card-pad)] pb-[var(--mode-card-pad)]">
            <p className="text-sm leading-relaxed text-[var(--color-muted)]">
              {ORTHOGRAPHY_DISCLAIMER}
            </p>
            <ul className="space-y-3">
              {ORTHOGRAPHY_TIPS.slice(0, 5).map((tip) => (
                <li key={tip.id}>
                  <p className="font-medium">{tip.pattern}</p>
                  <p className="text-sm leading-snug text-[var(--color-muted)]">
                    {tip.guidance}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              to="/app/guide"
              className="inline-flex min-h-[var(--mode-target)] items-center text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              Open full reading guide
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <aside
        role="note"
        className="rounded-mode-lg border border-[var(--color-border-strong)] bg-[var(--color-warn-soft)] px-4 py-3.5 text-[var(--color-warn-fg)]"
      >
        <p className="font-medium leading-snug">Historical reading aid only</p>
        <p className="mt-1 text-[length:calc(var(--mode-font-body)*0.95)] leading-relaxed opacity-95">
          {ORTHOGRAPHY_DISCLAIMER}
        </p>
      </aside>

      <section className="space-y-3" aria-labelledby="practice-order">
        <h2 id="practice-order" className="font-display text-title">
          A calm practice order
        </h2>
        <ol className="surface-card pad-mode list-decimal space-y-3 pl-6">
          {ORTHOGRAPHY_PRACTICE_ORDER.map((step) => (
            <li key={step} className="pl-1 text-content leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3" aria-labelledby="patterns">
        <h2 id="patterns" className="font-display text-title">
          Patterns you will see
        </h2>
        <div className="grid gap-3">
          {ORTHOGRAPHY_TIPS.map((tip) => (
            <article key={tip.id} className="surface-card pad-mode space-y-2">
              <h3 className="font-display text-lg">{tip.pattern}</h3>
              <p className="leading-relaxed text-[var(--color-muted)]">
                {tip.guidance}
              </p>
              {tip.example && (
                <p className="narr-word text-[var(--color-fg)]" lang="nax">
                  e.g. {tip.example}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
