import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useModeStore } from "@/lib/mode/store";

/**
 * Soft client navigate — avoid HTTP 307 on "/".
 * Old service workers cached that redirect and broke production (FetchEvent error).
 */
export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const hasOnboarded = useModeStore((s) => s.hasOnboarded);
  return <Navigate to={hasOnboarded ? "/app" : "/welcome"} />;
}
