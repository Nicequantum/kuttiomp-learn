import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clapperboard,
  Film,
  RefreshCw,
  Sun,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getMediaCatalog,
  MEDIA_KIND_LABEL,
  MEDIA_UPLOAD_DIRS,
  type MediaSlot,
} from "@/lib/content/media-catalog";
import type { MediaKind } from "@/lib/media/community-media";
import {
  invalidateCommunityMediaCache,
  probeCommunityUpload,
} from "@/lib/media/community-media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/media")({
  component: CommunityMediaPage,
});

type SlotStatus = {
  present: boolean;
  reason?: string;
  checking: boolean;
};

function CommunityMediaPage() {
  const catalog = useMemo(() => getMediaCatalog(), []);
  const [filter, setFilter] = useState<MediaKind | "all" | "awaiting">("all");
  const [status, setStatus] = useState<Record<string, SlotStatus>>({});

  const slots = useMemo(() => {
    if (filter === "all") return catalog;
    if (filter === "awaiting") return catalog.filter((s) => s.awaitingUpload);
    return catalog.filter((s) => s.kind === filter);
  }, [catalog, filter]);

  const probeOne = useCallback(async (slot: MediaSlot) => {
    setStatus((s) => ({
      ...s,
      [slot.uploadSrc]: {
        present: s[slot.uploadSrc]?.present ?? false,
        reason: s[slot.uploadSrc]?.reason,
        checking: true,
      },
    }));
    invalidateCommunityMediaCache(slot.uploadSrc);
    const r = await probeCommunityUpload(slot.uploadSrc);
    setStatus((s) => ({
      ...s,
      [slot.uploadSrc]: {
        present: r.present,
        reason: r.reason,
        checking: false,
      },
    }));
  }, []);

  const probeAll = useCallback(async () => {
    invalidateCommunityMediaCache();
    // Probe in small batches to avoid hammering the host
    const batch = 6;
    for (let i = 0; i < catalog.length; i += batch) {
      await Promise.all(catalog.slice(i, i + batch).map(probeOne));
    }
  }, [catalog, probeOne]);

  useEffect(() => {
    void probeAll();
  }, [probeAll]);

  const presentCount = Object.values(status).filter((s) => s.present).length;
  const awaiting = catalog.filter((s) => s.awaitingUpload);

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
        <p className="label-eyebrow text-[var(--color-primary)]">
          Keepers & community
        </p>
        <h1 className="font-display text-display">Community media</h1>
        <p className="text-content text-[var(--color-muted)] leading-relaxed max-w-prose">
          Drop real recordings into the upload folders and the app prefers them
          automatically — no code changes. Reconstructions stay as fallback
          until living media is ready.
        </p>
      </header>

      <section className="surface-card pad-mode space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
        <p className="font-medium text-[var(--color-fg)]">How replacement works</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Export <strong className="text-[var(--color-fg)]">MP4</strong>{" "}
            (H.264). Prefer{" "}
            <code className="text-[var(--color-fg)]">+faststart</code> for long
            films.
          </li>
          <li>
            Name the file exactly after the slot id (see table below).
          </li>
          <li>
            Place it in the matching public folder and redeploy (or PR).
          </li>
          <li>
            Open the scene / act / story — the player probes the upload path and
            plays community media when the file is a real video (not an HTML
            fallback page).
          </li>
        </ol>
        <div className="grid gap-2 pt-1">
          <p>
            <Clapperboard className="mr-1 inline h-4 w-4 text-[var(--color-primary)]" />
            Scenes →{" "}
            <code className="text-[var(--color-fg)]">
              {MEDIA_UPLOAD_DIRS.scene}
            </code>
          </p>
          <p>
            <Sun className="mr-1 inline h-4 w-4 text-[var(--color-primary)]" />
            Full Day →{" "}
            <code className="text-[var(--color-fg)]">
              {MEDIA_UPLOAD_DIRS["day-act"]}
            </code>
          </p>
          <p>
            <Film className="mr-1 inline h-4 w-4 text-[var(--color-primary)]" />
            Stories →{" "}
            <code className="text-[var(--color-fg)]">
              {MEDIA_UPLOAD_DIRS.story}
            </code>
          </p>
        </div>
        <p className="text-[var(--color-subtle)]">
          Full notes: <code className="text-[var(--color-fg)]">docs/COMMUNITY_MEDIA.md</code>
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">
          {presentCount} community file{presentCount === 1 ? "" : "s"} detected
        </Badge>
        <Badge tone="warn">
          {awaiting.length} stand-in slot{awaiting.length === 1 ? "" : "s"}
        </Badge>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void probeAll()}
        >
          <RefreshCw className="h-4 w-4" />
          Recheck all
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "All slots"],
            ["story", "Stories"],
            ["day-act", "Full Day"],
            ["scene", "Scenes"],
            ["awaiting", "Awaiting upload"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-sm",
              filter === key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {(["story", "day-act", "scene"] as MediaKind[]).map((kind) => {
        const list = slots.filter((s) => s.kind === kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="space-y-3">
            <h2 className="font-display text-title">{MEDIA_KIND_LABEL[kind]}</h2>
            <ul className="grid gap-2">
              {list.map((slot) => {
                const st = status[slot.uploadSrc];
                const present = st?.present;
                const checking = st?.checking;
                return (
                  <li
                    key={slot.uploadSrc}
                    className="surface-card flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-[var(--color-fg)]">
                        {slot.title}
                      </p>
                      <p className="text-xs text-[var(--color-subtle)]">
                        id: <code>{slot.id}</code>
                      </p>
                      <p className="break-all text-xs text-[var(--color-muted)]">
                        {slot.uploadSrc}
                      </p>
                      <p className="text-xs text-[var(--color-subtle)]">
                        {slot.tip}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {checking && <Badge tone="neutral">Checking…</Badge>}
                      {!checking && present && (
                        <Badge tone="land">
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                          Community file
                        </Badge>
                      )}
                      {!checking && !present && (
                        <Badge tone={slot.awaitingUpload ? "warn" : "neutral"}>
                          <Upload className="mr-1 inline h-3 w-3" />
                          {slot.awaitingUpload
                            ? "Needs upload"
                            : "Using reconstruction"}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void probeOne(slot)}
                      >
                        Recheck
                      </Button>
                      <Button asChild size="sm" variant="primary">
                        <a href={slot.playHref}>Open</a>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {slots.length === 0 && (
        <p className="text-[var(--color-muted)]">No slots match this filter.</p>
      )}
    </div>
  );
}
