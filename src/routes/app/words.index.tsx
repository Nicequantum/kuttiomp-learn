import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { HistoricalBanner } from "@/components/content/HistoricalBanner";
import { WordCard } from "@/components/content/WordCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getDomains, searchWords } from "@/lib/content/corpus";
import { cn } from "@/lib/utils";
import { OrthographyGuide } from "@/components/content/OrthographyGuide";

export const Route = createFileRoute("/app/words/")({
  component: WordsPage,
});

function WordsPage() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string | null>(null);
  const domains = getDomains();

  const results = useMemo(() => {
    let list = searchWords(q);
    if (domain) list = list.filter((w) => w.semanticDomain === domain);
    return list;
  }, [q, domain]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-display text-display">Words</h1>
        <p className="text-content text-[var(--color-muted)]">
          Search English or Narragansett. Search English or Narragansett. Historical demo forms and any living mock/API forms appear together.
        </p>
      </header>

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
          All
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-subtle)]">
          {results.length} result{results.length === 1 ? "" : "s"}
        </p>
        <Badge tone="warn">Historical seed</Badge>
      </div>

      <div className="grid gap-3">
        {results.map((w) => (
          <WordCard key={w.id} word={w} />
        ))}
        {results.length === 0 && (
          <div className="surface-card pad-mode text-center text-[var(--color-muted)]">
            No matches. Try a shorter search or clear the domain filter.
          </div>
        )}
      </div>
    </div>
  );
}
