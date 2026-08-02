import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { useModeStore, applyModeToDocument } from "@/lib/mode/store";
import { APP_NAME, APP_TAGLINE } from "@/lib/content/config";
import { registerServiceWorker } from "@/lib/pwa/register";
import { ScenicBackdrop } from "@/components/layout/ScenicBackdrop";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: `${APP_NAME} — Narragansett language learning` },
      { name: "description", content: APP_TAGLINE },
      { name: "theme-color", content: "#2d5a3d" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Kuttiomp" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;500;600&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-180.png" },
      { rel: "icon", href: "/icons/icon-192.png", sizes: "192x192" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const mode = useModeStore((s) => s.mode);

  useEffect(() => {
    applyModeToDocument(mode);
  }, [mode]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="relative min-h-dvh">
        <ScenicBackdrop />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
