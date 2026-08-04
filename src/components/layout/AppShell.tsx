import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Clapperboard, Film, Home, Volume2 } from "lucide-react";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";
import { APP_NAME } from "@/lib/content/config";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "home" as const, to: "/app", icon: Home, match: (p: string) => p === "/app" },
  {
    key: "stories" as const,
    to: "/app/stories",
    icon: Film,
    match: (p: string) => p.startsWith("/app/stories"),
  },
  {
    key: "scenes" as const,
    to: "/app/scenes",
    icon: Clapperboard,
    match: (p: string) =>
      p.startsWith("/app/scenes") || p.startsWith("/app/day"),
  },
  {
    key: "listen" as const,
    to: "/app/listen",
    icon: Volume2,
    match: (p: string) => p.startsWith("/app/listen"),
  },
  {
    key: "words" as const,
    to: "/app/words",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/app/words"),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = useModeStore((s) => s.mode);
  const labels = mode ? MODES[mode].navLabels : MODES.core_adult.navLabels;
  const modeLabel = mode ? MODES[mode].shortLabel : "Learn";
  const isElder = mode === "elder";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-2xl">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="safe-pt sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-bg)_78%,transparent)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-lg tracking-tight text-[var(--color-fg)]">
              {APP_NAME}
            </p>
            <p className="truncate text-sm text-[var(--color-primary)]">
              {modeLabel} path
              {isElder ? " · large type" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/app/guide"
              className={cn(
                "rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]",
                "min-h-10 inline-flex items-center",
              )}
            >
              Guide
            </Link>
            <Link
              to="/app/profile"
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
            >
              Mode
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-4 py-5 pb-[calc(var(--mode-nav-height)+1.75rem)] outline-none"
      >
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="safe-pb fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-bg)_88%,transparent)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 pt-1 md:max-w-2xl">
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            const label = labels[tab.key];
            return (
              <Link
                key={tab.key}
                to={tab.to}
                className={cn(
                  "flex min-h-[var(--mode-nav-height)] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-mode px-1 font-medium transition-colors",
                  isElder ? "text-[0.8rem]" : "text-[0.7rem]",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-subtle)] hover:text-[var(--color-muted)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    active && "stroke-[2.35]",
                    isElder ? "h-6 w-6" : "h-5 w-5",
                  )}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
