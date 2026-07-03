import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyMatches, getMyProfile } from "@/lib/app.functions";
import { getIsAdmin } from "@/lib/admin.functions";
import { ArrowLeft, LayoutGrid, MessageCircle, Shield, Sparkles, Trophy, User } from "lucide-react";

import { useT, LangSwitch } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    // getSession recovers from localStorage and refreshes the token if expired
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) throw redirect({ to: "/auth", search: { redirect: undefined, join: undefined } });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: undefined, join: undefined } });
    return { user: data.user };
  },
  component: AuthShell,
});

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
              aria-label="Back to home"
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--ball)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("shell.home")}</span>
            </Link>
          ) : (
            <Link
              to="/app"
              aria-label="Back to Grid"
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/70 hover:text-[var(--ball)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Grid</span>
            </Link>
          )}
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--ball)] ball-glow" />
            <span className="text-display text-xl tracking-wider truncate">PADEL · MATCH</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <Link to="/app/admin" className="text-xs uppercase tracking-widest text-[var(--ball)] hover:opacity-80">
              Admin
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
        <nav className="fixed bottom-0 left-0 right-0 backdrop-blur bg-[var(--court-deep)]/85 border-t border-[var(--cream)]/10 z-40">
          <div className="max-w-md mx-auto grid" style={{ gridTemplateColumns: `repeat(${isAdmin ? 6 : 5}, minmax(0, 1fr))` }}>
            <NavTab to="/app/questions" label={t("shell.tab.questions")} icon={<Sparkles className="w-5 h-5" />} active={path.startsWith("/app/questions")} />
            <NavTab to="/app" label="Grid" icon={<LayoutGrid className="w-5 h-5" />} active={path === "/app" || path === "/app/"} />
            <NavTab to="/app/events" label="Play" icon={<Trophy className="w-5 h-5" />} active={path.startsWith("/app/events")} />
            <NavTab to="/app/matches" label={`${t("shell.tab.matches")}${matchesQ.data?.length ? ` · ${matchesQ.data.length}` : ""}`} icon={<MessageCircle className="w-5 h-5" />} active={path.startsWith("/app/matches")} badge={matchesQ.data?.reduce((n, m) => n + (m.unread ?? 0), 0) ?? 0} />
            <NavTab to="/app/profile" label={t("shell.tab.me")} icon={<User className="w-5 h-5" />} active={path.startsWith("/app/profile")} />
            {isAdmin && <NavTab to="/app/admin" label="Admin" icon={<Shield className="w-5 h-5" />} active={path.startsWith("/app/admin")} />}
          </div>
        </nav>
      )}
    </div>
  );
}

function NavTab({ to, label, icon, active, highlight, badge }: { to: string; label: string; icon: React.ReactNode; active: boolean; highlight?: boolean; badge?: number }) {
  const isHighlight = highlight && !active;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center py-3 text-[11px] uppercase tracking-widest relative ${active ? "text-[var(--ball)]" : isHighlight ? "text-[var(--ball)]" : "text-[var(--cream)]/60"}`}>
      <span className="relative">
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-[10px] font-bold flex items-center justify-center ball-glow">{badge > 9 ? "9+" : badge}</span>
        )}
        {isHighlight && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--ball)] ball-glow animate-ping" />
        )}
      </span>
      <span className="mt-1 text-center leading-tight">{label}</span>
      {isHighlight && (
        <span className="absolute -top-1 text-[8px] tracking-wider text-[var(--ball)] opacity-90">★ core</span>
      )}
    </Link>
  );
}
