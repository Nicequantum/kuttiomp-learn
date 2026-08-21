import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { KeeperEmptyState } from "@/components/content/KeeperEmptyState";
import { WordCard } from "@/components/content/WordCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getDomains, searchWords, getChapters, getCorpusMeta } from "@/lib/content/corpus";
import { cn } from "@/lib/utils";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";

type WordsSearch = {
  chapter?: string;
};

export const Route = createFileRoute("/app/words/")({
  component: WordsPage,
  validateSearch: (search: Record<string, unknown>): WordsSearch => ({
    chapter: typeof search.chapter === "string" ? search.chapter : undefined,
  }),
});

function WordsPage() {
  const { chapter: chapterParam } = Route.useSearch();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(chapterParam ?? null);
  const domains = getDomains();
  const chapters = getChapters().filter((c) => c.count > 0);
  const isDemo = getCorpusMeta().isDemo;

  useEffect(() => {
    setChapter(chapterParam ?? null);
  }, [chapterParam]);

  const results = useMemo(() => {
    let list = searchWords(q);
    if (domain) list = list.filter((w) => w.semanticDomain === domain);
    if (chapter) list = list.filter((w) => w.chapter === chapter);
    return list;
  }, [q, domain, chapter]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display text-display">Words</h1>
        <p className="text-content text-[var(--color-muted)]">
          {isDemo
            ? "Search modern English or Narragansett (Williams spelling). Full Key seed — living forms appear when published."
            : "Search approved public words from Knowledge Keepers."}
        </p>
      </header>

      {!isDemo && results.length === 0 && !q && !domain && !chapter && (
        <KeeperEmptyState />
      )}

      <HistoricalBanner compact />
      <OrthographyGuide compact />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-subtle)]"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search words or phrases…"
          className="pl-10"
          aria-label="Search lexicon"
        />
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="listbox"
        aria-label="Domains"
      >
        <button
          type="button"
          onClick={() => setDomain(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm",
            !domain
              ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All domains
        </button>
        {domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDomain(d.id === domain ? null : d.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
              domain === d.id
                ? "border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {d.label}
            <span className="ml-1 tabular-nums opacity-70">{d.count}</span>
          </button>
        ))}
      </div>

      {chapters.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="listbox"
          aria-label="Chapters"
        >
          <button
            type="button"
            onClick={() => setChapter(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm",
              !chapter
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            All chapters
          </button>
          {chapters.map((c) => (
            <button
              key={c.num}
              type="button"
              onClick={() => setChapter(c.title === chapter ? null : c.title)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                chapter === c.title
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {c.num}. {c.title}
              <span className="ml-1 opacity-70">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-subtle)]">
          {results.length} result{results.length === 1 ? "" : "s"}
        </p>
        {isDemo && <Badge tone="warn">Historical seed</Badge>}
      </div>

      <div className="grid gap-3">
        {results.slice(0, 80).map((w) => (
          <WordCard key={w.id} word={w} />
        ))}
        {results.length > 80 && (
          <p className="text-center text-sm text-[var(--color-subtle)]">
            Showing 80 of {results.length}. Narrow with search or filters.
          </p>
        )}
        {results.length === 0 && (q || domain || chapter) && (
          <div className="surface-card pad-mode text-center text-[var(--color-muted)]">
            No matches. Try a shorter search or clear filters.
          </div>
        )}
      </div>
    </div>
  );
}
