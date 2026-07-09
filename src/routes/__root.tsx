import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { CookieBanner } from "@/components/CookieBanner";
import { QRShareButton } from "@/components/QRShareButton";

function readLang(): "en" | "es" {
  try {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("padel_lang_v1") : null;
    if (stored === "es" || stored === "en") return stored;
  } catch { /* ignore */ }
  if (typeof navigator !== "undefined") {
    const langs = (navigator.languages ?? [navigator.language ?? "en"]).map((s) => s.toLowerCase());
    if (langs.some((l) => l.startsWith("es"))) return "es";
  }
  return "en";
}

function NotFoundComponent() {
  const es = readLang() === "es";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{es ? "Página no encontrada" : "Page not found"}</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {es ? "Ir al inicio" : "Go home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const es = readLang() === "es";
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{es ? "Algo salió mal" : "Something went wrong"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{es ? "Inténtalo de nuevo." : "Please try again."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {es ? "Reintentar" : "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}



export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0d2929" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Padel Match App — More Friends, Better Games" },
      { name: "description", content: "Connect with Padel players nearby you, join games, discover courts, and build your community." },
      { property: "og:site_name", content: "Padel Match App" },
      { property: "og:title", content: "Padel Match App — More Friends, Better Games" },
      { property: "og:description", content: "Connect with Padel players nearby you, join games, discover courts, and build your community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", href: "/padel-icon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "PadelMatch",
              url: "https://padelmatchapp.lovable.app",
              logo: "https://padelmatchapp.lovable.app/icon-512.png",
            },
            {
              "@type": "WebSite",
              name: "PadelMatch",
              url: "https://padelmatchapp.lovable.app",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    // Register the service worker for push notifications (production only)
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isPreview = /^(?:id-preview|preview)--/.test(location.hostname)
        || location.hostname.endsWith(".lovableproject.com")
        || location.hostname.endsWith(".lovableproject-dev.com");
      if (!isPreview) {
        navigator.serviceWorker.getRegistration("/sw.js").then((existing) => {
          if (!existing) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
        });
      }
    }
    return () => { sub.subscription.unsubscribe(); };
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
        <CookieBanner />
        <QRShareButton />
      </I18nProvider>
    </QueryClientProvider>
  );
}
