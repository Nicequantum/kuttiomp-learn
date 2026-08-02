import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Client-side onboarding check happens on welcome / app routes via store.
    // Default landing is welcome for first-time, app if already set — handled in welcome.
    throw redirect({ to: "/welcome" });
  },
});
