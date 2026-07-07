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

function readLang(): "en" | "es" | "fr" {
  try {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("padel_lang_v1") : null;
    if (stored === "es" || stored === "en" || stored === "fr") return stored;
  } catch { /* ignore */ }
  if (typeof navigator !== "undefined") {
    const langs = (navigator.languages ?? [navigator.language ?? "en"]).map((s) => s.toLowerCase());
    if (langs.some((l) => l.startsWith("es"))) return "es";
    if (langs.some((l) => l.startsWith("fr"))) return "fr";
  }
  return "en";
}

function NotFoundComponent() {
  const lang = readLang();
  const title = lang === "es" ? "Página no encontrada" : lang === "fr" ? "Page non trouvée" : "Page not found";
  const cta = lang === "es" ? "Ir al inicio" : lang === "fr" ? "Retour à l'accueil" : "Go home";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-[var(--court-deep)]">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-[var(--court-deep)]">{title}</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center bg-[var(--clay)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--clay-deep)]">
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const lang = readLang();
  const title = lang === "es" ? "Algo salió mal" : lang === "fr" ? "Une erreur s'est produite" : "Something went wrong";
  const body = lang === "es" ? "Inténtalo de nuevo." : lang === "fr" ? "Veuillez réessayer." : "Please try again.";
  const retry = lang === "es" ? "Reintentar" : lang === "fr" ? "Réessayer" : "Retry";
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-[var(--court-deep)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--court)]/70">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center bg-[var(--clay)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--clay-deep)]"
          >
            {retry}
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
      { name: "theme-color", content: "#F5F2ED" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Padel Match App — More Friends, Better Games" },
      { name: "description", content: "Connect with Padel players nearby you, join games, discover courts, and build your community." },
      { property: "og:site_name", content: "Padel Match App" },
      { property: "og:title", content: "Padel Match App — More Friends, Better Games" },
      { property: "og:description", content: "Connect with Padel players nearby you, join games, discover courts, and build your community." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://padelmatchapp.lovable.app/og-share.jpg?v=4" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://padelmatchapp.lovable.app/og-share.jpg?v=4" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
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
    return () => { sub.subscription.unsubscribe(); };
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
        <CookieBanner />
      </I18nProvider>
    </QueryClientProvider>
  );
}
