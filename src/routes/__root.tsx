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
import { purgeServiceWorkers } from "@/lib/pwa/register";
import { ScenicBackdrop } from "@/components/layout/ScenicBackdrop";

/** Runs in HTML before modules — kills broken production SW immediately */
const SW_KILL_SCRIPT = `
(function(){
  try {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(r){ r.unregister(); });
    });
    if (window.caches) {
      caches.keys().then(function(keys){
        keys.forEach(function(k){ caches.delete(k); });
      });
    }
  } catch (e) {}
})();
`;

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
    scripts: [
      {
        children: SW_KILL_SCRIPT,
      },
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
    void purgeServiceWorkers();
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
