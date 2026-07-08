import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyMatches, getMyProfile } from "@/lib/app.functions";
import { getIsAdmin } from "@/lib/admin.functions";
import { listMyPendingInvites } from "@/lib/match-events.functions";
import { getConnectLatest } from "@/lib/connect.functions";
import { Home, MessageCircle, User, Mail, X, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { PlayMenuIcon } from "@/components/PlayMenuIcon";
import { BrandMark } from "@/components/BrandMark";
import { useT, useTr, LangSwitch } from "@/lib/i18n";

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
    <div className="min-h-screen flex items-center justify-center px-6 text-center programme-page">
      <div className="max-w-sm">
        <h1 className="text-serif text-3xl tracking-tight text-[var(--ink)]">{t("shell.err.title")}</h1>
        <p className="mt-3 text-sm text-[var(--ink)]/70">{t("shell.err.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { reset(); window.location.reload(); }}
            className="rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
          >
            {t("shell.err.retry")}
          </button>
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined }}
            className="rounded-full border border-[var(--ink)]/30 text-[var(--ink)] text-[11px] uppercase tracking-widest font-bold px-4 py-2"
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
  return <div className="min-h-screen flex items-center justify-center text-[var(--ink)]/70">{t("shell.notFound")}</div>;
}


function AuthShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const getProfile = useServerFn(getMyProfile);
  const getMatches = useServerFn(getMyMatches);
  const checkAdmin = useServerFn(getIsAdmin);
  const getInvites = useServerFn(listMyPendingInvites);
  const getConnect = useServerFn(getConnectLatest);
  const tr = useTr();

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
  const invitesQ = useQuery({
    queryKey: ["my-pending-invites"],
    queryFn: () => safe(() => getInvites()),
    enabled: !!profileQ.data,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const rawInvites = (invitesQ.data?.invites ?? []) as Array<{
    id: string;
    event: { id: string; starts_at: string; club_name: string | null; city: string | null; status: string; host: { first_name: string | null } | null } | null;
  }>;
  const invites = rawInvites.filter((i) => i.event && new Date(i.event.starts_at).getTime() > Date.now() && i.event.status !== "cancelled");

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("invite-banner-dismissed") ?? "[]"); } catch { return []; }
  });
  const visibleInvites = invites.filter((i) => !dismissedIds.includes(i.id));

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("invite-banner-dismissed", JSON.stringify(dismissedIds));
  }, [dismissedIds]);



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
    <div className="min-h-screen pb-20 programme-page">
      <header className="px-5 sm:px-8 lg:px-12 py-4 sm:py-5 flex items-center justify-between border-b border-[var(--ink)]/10 gap-3 max-w-7xl mx-auto w-full">
        <BrandMark size="sm" />
        <div className="flex items-center gap-2.5 shrink-0">
          {isAdmin && (
            <Link to="/app/admin" className="text-[11px] uppercase tracking-[0.18em] text-[var(--plum)] hover:opacity-80">
              {t("shell.admin")}
            </Link>
          )}
          <LangSwitch />
          <button onClick={onSignOut} className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/55 hover:text-[var(--ink)]">
            {t("shell.signout")}
          </button>
        </div>

      </header>

      {hasProfile && !onOnboarding && visibleInvites.length > 0 && (
        <div className="border-b border-[var(--ink)]/10 bg-[var(--paper-2)]">
          <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-3 space-y-2">
            {visibleInvites.slice(0, 3).map((inv) => {
              const ev = inv.event!;
              const when = new Date(ev.starts_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
              const host = ev.host?.first_name ?? tr("Someone", "Alguien", "Quelqu'un");
              const where = ev.club_name ?? ev.city ?? "";
              return (
                <div key={inv.id} className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--plum)] shrink-0" />
                  <Link
                    to="/app/events/$eventId"
                    params={{ eventId: ev.id }}
                    className="flex-1 min-w-0 text-sm text-[var(--ink)] hover:opacity-80"
                  >
                    <span className="font-semibold text-[var(--plum)]">{tr("You're invited", "Te han invitado", "Tu es invité·e")}</span>{" "}
                    <span className="text-[var(--ink)]/80">
                      {tr(
                        `by ${host} · ${when}${where ? " · " + where : ""} — tap to view`,
                        `por ${host} · ${when}${where ? " · " + where : ""} — toca para ver`,
                        `par ${host} · ${when}${where ? " · " + where : ""} — appuie pour voir`,
                      )}
                    </span>
                  </Link>
                  <button
                    onClick={() => setDismissedIds((d) => [...d, inv.id])}
                    aria-label={tr("Dismiss", "Descartar", "Fermer")}
                    className="text-[var(--ink)]/50 hover:text-[var(--ink)] shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Outlet />

      {hasProfile && !onOnboarding && (
        <nav
          className="fixed left-0 right-0 programme-nav z-40"
          style={{
            bottom: 0,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            willChange: "transform",
          }}
        >
          <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto grid px-4" style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))` }}>
            <NavTab to="/app/grid" label={t("shell.tab.grid")} icon={<Home className="w-[22px] h-[22px]" strokeWidth={2.25} />} active={path.startsWith("/app/grid")} />
            <NavTab to="/app/events" label={t("shell.tab.play")} icon={<PlayMenuIcon className="w-6 h-6" />} active={path.startsWith("/app/events")} />

            <NavTab to="/app/connect" label={t("shell.tab.connect")} icon={<Users className="w-[22px] h-[22px]" strokeWidth={2.25} />} active={path.startsWith("/app/connect")} />
            <NavTab to="/app/profile" label={t("shell.tab.me")} icon={<User className="w-[22px] h-[22px]" strokeWidth={2.25} />} active={path.startsWith("/app/profile")} badge={matchesQ.data?.reduce((n, m) => n + (m.unread ?? 0), 0) ?? 0} />
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
    <Link to={to} aria-label={ariaLabel} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] relative ${active ? "text-[var(--cream)]" : isHighlight ? "text-[var(--plum)]" : "text-[var(--cream)]/85"}`}>
      <span className="relative">
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--plum)] text-white text-[10px] font-bold flex items-center justify-center ink-ring">{badge > 9 ? "9+" : badge}</span>
        )}
        {isHighlight && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--plum)] ink-ring animate-ping" />
        )}
      </span>
      <span className="h-[1.15em] text-center leading-none whitespace-nowrap">{label}</span>
      {active && (
        <span className="absolute bottom-2 w-1 h-1 rounded-full bg-[var(--cream)]" />
      )}
      {isHighlight && (
        <span className="absolute -top-1 text-[8px] tracking-wider text-[var(--plum)] opacity-90">{t("shell.core")}</span>
      )}
    </Link>
  );
}
