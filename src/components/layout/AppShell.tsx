import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Home, Route, UserRound, Volume2 } from "lucide-react";
import { useModeStore } from "@/lib/mode/store";
import { MODES } from "@/lib/mode/modes";
import { APP_NAME } from "@/lib/content/config";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "home", to: "/app", icon: Home, match: (p: string) => p === "/app" },
  {
    key: "listen",
    to: "/app/listen",
    icon: Volume2,
    match: (p: string) => p.startsWith("/app/listen"),
  },
  {
    key: "words",
    to: "/app/words",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/app/words"),
  },
  {
    key: "paths",
    to: "/app/paths",
    icon: Route,
    match: (p: string) => p.startsWith("/app/paths"),
  },
  {
    key: "profile",
    to: "/app/profile",
    icon: UserRound,
    match: (p: string) => p.startsWith("/app/profile"),
  },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = useModeStore((s) => s.mode);
  const labels = mode ? MODES[mode].navLabels : MODES.core_adult.navLabels;
  const modeLabel = mode ? MODES[mode].shortLabel : "Learn";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-2xl">
      <header className="safe-pt sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_82%,transparent)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-lg tracking-tight text-[var(--color-fg)]">
              {APP_NAME}
            </p>
            <p className="truncate text-sm text-[var(--color-muted)]">
              {modeLabel} path
            </p>
          </div>
          <Link
            to="/app/profile"
            className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:border-[var(--color-border-strong)]"
          >
            Switch mode
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-[calc(var(--mode-nav-height)+1.5rem)]">
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="safe-pb fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] backdrop-blur-md"
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
                  "flex min-h-[var(--mode-nav-height)] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-mode px-1 text-[0.7rem] font-medium transition-colors",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-subtle)] hover:text-[var(--color-muted)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.25]")}
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
