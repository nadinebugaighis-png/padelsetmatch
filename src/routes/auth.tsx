import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeInternalPath } from "@/lib/safe-redirect";
import { useTr, LangSwitch } from "@/lib/i18n";
import { BrandMark } from "@/components/BrandMark";
import { SessionLoading } from "@/components/SessionLoading";
import { AuthPanel } from "@/components/AuthPanel";
import { EntranceBackdrop } from "@/components/EntranceBackdrop";

export const Route = createFileRoute("/auth")({
  // Client-only: this page is reached via the /app guard's client redirect,
  // so server-rendering it buys nothing and only risks a hydration mismatch.
  ssr: false,
  head: () => ({ meta: [
    { title: "Sign in · PadelSetMatch" },
    { name: "description", content: "Sign in or create your PadelSetMatch account with Apple, Google or email to meet players and join padel matches." },
    { property: "og:title", content: "Sign in · PadelSetMatch" },
    { property: "og:description", content: "Join your local padel community with PadelSetMatch." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string; join?: string; i?: string; mode?: "signin" | "signup" } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    join: typeof s.join === "string" ? s.join : undefined,
    i: typeof s.i === "string" ? s.i : undefined,
    mode: s.mode === "signup" || s.mode === "signin" ? s.mode : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, join, i, mode } = Route.useSearch();
  const safeRedirect = safeInternalPath(redirect);
  const tr = useTr();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const target = join
      ? { to: "/app/join-setup", search: i ? { join, i } : { join } }
      : safeRedirect ? { to: safeRedirect } : { to: "/app" };
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (cancelled) return;
      if (!error && data.session) { await navigate(target as never); return; }
      setCheckingSession(false);
      // Coming back from Apple/Google with a refusal: say so instead of
      // silently showing the form again, and keep the reason for support.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const reason = hash.get("error_description") ?? query.get("error_description")
        ?? hash.get("error") ?? query.get("error") ?? error?.message ?? null;
      if (reason) {
        console.warn("[auth] sign-in returned an error:", reason);
        toast.error(
          tr("Sign-in didn't finish", "No se pudo completar el acceso", "La connexion n'a pas abouti"),
          { description: reason.replace(/\+/g, " "), duration: 15000 },
        );
        if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }).catch(() => { if (!cancelled) setCheckingSession(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checkingSession) return <SessionLoading />;

  return (
    <main className="programme-page relative min-h-screen overflow-hidden">
      <EntranceBackdrop />
      <header className="relative z-30 flex items-center justify-between px-5 pb-2 pt-3 sm:px-8 lg:px-16 lg:pt-4">
        <BrandMark />
        <LangSwitch />
      </header>
      <section className="relative z-10 flex min-h-[calc(100dvh-56px)] flex-col items-center px-5 pb-10 pt-6 sm:justify-center sm:pt-0">
        <h1 className="text-serif mb-6 text-center text-[2rem] uppercase leading-[0.95] tracking-[-0.01em] text-[var(--ink)] sm:text-[2.6rem]">
          {tr("Your padel club,", "Tu club de pádel,", "Ton club de padel,")}
          <span className="block text-[var(--plum)]">{tr("everywhere.", "en todas partes.", "partout.")}</span>
        </h1>
        <AuthPanel redirect={redirect} join={join} i={i} initialMode={mode ?? "signup"} />
      </section>
    </main>
  );
}
