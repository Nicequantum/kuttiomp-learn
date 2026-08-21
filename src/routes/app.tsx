import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useModeStore } from "@/lib/mode/store";
import { useCorpusTick } from "@/lib/content/corpus";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const hasOnboarded = useModeStore((s) => s.hasOnboarded);
  const mode = useModeStore((s) => s.mode);
  const [ready, setReady] = useState(false);
  useCorpusTick();

  useEffect(() => {
    const unsub = useModeStore.persist.onFinishHydration(() => setReady(true));
    if (useModeStore.persist.hasHydrated()) setReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!hasOnboarded || !mode) {
      window.location.replace("/welcome");
    }
  }, [ready, hasOnboarded, mode]);

  if (!ready || !hasOnboarded || !mode) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--color-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
