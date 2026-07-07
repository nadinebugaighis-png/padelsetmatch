import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyMatches, getMyProfile } from "@/lib/app.functions";
import { getIsAdmin } from "@/lib/admin.functions";
import { ArrowLeft, LayoutGrid, MessageCircle, User } from "lucide-react";
import { RacketIcon } from "@/components/RacketIcon";


import { useT, LangSwitch } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    // getSession recovers from localStorage and refreshes the token if expired.
    // If the stored refresh token is stale (e.g. right after signup on a device
    // where the session hasn't finished persisting, or after a server-side
    // token rotation), clear it and bounce to /auth instead of blanking the app.
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        throw redirect({ to: "/auth", search: { redirect: undefined, join: undefined } });
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        throw redirect({ to: "/auth", search: { redirect: undefined, join: undefined } });
      }
      return { user: data.user };
    } catch (err) {
      // Re-throw router redirects; only swallow unexpected auth errors
      if (err && typeof err === "object" && "to" in (err as Record<string, unknown>)) throw err;
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      throw redirect({ to: "/auth", search: { redirect: undefined, join: undefined } });
    }
  },
  component: AuthShell,
  errorComponent: ({ error, reset }) => {
    // Never leave the user on a blank dark screen. Show a recoverable message.
    // eslint-disable-next-line no-console
    console.error("[/app errorComponent]", error);
    return <AppErrorFallback reset={reset} />;
  },
  notFoundComponent: () => <AppNotFoundFallback />,
});

function AppErrorFallback({ reset }: { reset: () => void }) {
  const t = useT();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-display text-3xl tracking-wider text-[var(--cream)]">{t("shell.err.title")}</h1>
        <p className="mt-3 text-sm text-[var(--cream)]/70">{t("shell.err.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { reset(); window.location.reload(); }}
            className="rounded-full bg-[var(--cream)] text-[var(--court-deep)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
          >
            {t("shell.err.retry")}
          </button>
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined }}
            className="rounded-full border border-[var(--cream)]/30 text-[var(--cream)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
          >
            {t("shell.err.signin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AppNotFoundFallback() {
  const t = useT();
  return <div className="min-h-screen flex items-center justify-center text-[var(--cream)]/70">{t("shell.notFound")}</div>;
}


function AuthShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const getProfile = useServerFn(getMyProfile);
  const getMatches = useServerFn(getMyMatches);
  const checkAdmin = useServerFn(getIsAdmin);

  const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      return await fn();
    } catch {
      return null;
    }
  };
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => safe(() => getProfile()), retry: false });
  const matchesQ = useQuery({ queryKey: ["my-matches"], queryFn: () => safe(() => getMatches()), enabled: !!profileQ.data, retry: false });
  const adminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => safe(() => checkAdmin()),
    retry: false,
  });


  const onSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined, join: undefined }, replace: true });
  };

  const hasProfile = !!profileQ.data;
  const onOnboarding = path.startsWith("/app/onboarding");
  const isAdmin = adminQ.data === true;

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 py-4 flex items-center justify-between border-b border-[var(--cream)]/10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {path === "/app" || path === "/app/" ? (
            <Link
              to="/"
              aria-label={t("shell.back.home")}
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--cream)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("shell.home")}</span>
            </Link>
          ) : (
            <Link
              to="/app"
              aria-label={t("shell.back.grid")}
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--cream)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("shell.grid")}</span>

            </Link>
          )}
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--ball)] ball-glow" />
            <span className="text-display text-xl tracking-wider truncate text-[var(--ball)]">PADEL · MATCH</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <Link to="/app/admin" className="text-xs uppercase tracking-widest text-[var(--ball)] hover:opacity-80">
              {t("shell.admin")}
            </Link>
          )}
          <LangSwitch />
          <button onClick={onSignOut} className="text-xs uppercase tracking-widest text-[var(--cream)]/60 hover:text-[var(--cream)]">
            {t("shell.signout")}
          </button>
        </div>

      </header>

      <Outlet />

      {hasProfile && !onOnboarding && (
        <nav
          className="fixed left-0 right-0 backdrop-blur bg-[var(--court-deep)]/85 border-t border-[var(--cream)]/10 z-40"
          style={{
            bottom: 0,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            willChange: "transform",
          }}
        >
          <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto grid px-4" style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))` }}>
            <NavTab to="/app" label={t("shell.tab.grid")} icon={<LayoutGrid className="w-5 h-5" />} active={path === "/app" || path === "/app/"} />
            <NavTab to="/app/events" label={t("shell.tab.play")} icon={<RacketIcon className="w-5 h-5" />} active={path.startsWith("/app/events")} />

            <NavTab to="/app/matches" label={t("shell.tab.matches")} icon={<MessageCircle className="w-5 h-5" />} active={path.startsWith("/app/matches")} badge={matchesQ.data?.reduce((n, m) => n + (m.unread ?? 0), 0) ?? 0} />
            <NavTab to="/app/profile" label={t("shell.tab.me")} icon={<User className="w-5 h-5" />} active={path.startsWith("/app/profile")} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavTab({ to, label, ariaLabel, icon, active, highlight, badge }: { to: string; label: string; ariaLabel?: string; icon: React.ReactNode; active: boolean; highlight?: boolean; badge?: number }) {
  const t = useT();
  const isHighlight = highlight && !active;

  return (
    <Link to={to} aria-label={ariaLabel} className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em] relative ${active ? "text-[var(--cream)]" : isHighlight ? "text-[var(--cream)]" : "text-[var(--cream)]/60"}`}>
      <span className="relative">
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--cream)] text-[var(--court-deep)] text-[10px] font-bold flex items-center justify-center ball-glow">{badge > 9 ? "9+" : badge}</span>
        )}
        {isHighlight && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--cream)] ball-glow animate-ping" />
        )}
      </span>
      <span className="h-[1.15em] text-center leading-none whitespace-nowrap">{label}</span>
      {isHighlight && (
        <span className="absolute -top-1 text-[8px] tracking-wider text-[var(--cream)] opacity-90">{t("shell.core")}</span>
      )}
    </Link>
  );
}
