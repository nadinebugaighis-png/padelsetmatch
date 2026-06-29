import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getIsAdmin, getMyMatches, getMyProfile } from "@/lib/app.functions";
import { ArrowLeft, LayoutGrid, MessageCircle, Star, User } from "lucide-react";
import { useT, LangSwitch } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
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

  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => getProfile() });
  const matchesQ = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches(), enabled: !!profileQ.data });
  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });


  const onSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const hasProfile = !!profileQ.data;
  const onOnboarding = path.startsWith("/app/onboarding");

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
          {adminQ.data && (
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
          <div className="max-w-md mx-auto grid grid-cols-4">
            <NavTab to="/app/questions" label={t("shell.tab.questions")} icon={<Star className="w-5 h-5" />} active={path.startsWith("/app/questions")} />
            <NavTab to="/app" label="Grid" icon={<LayoutGrid className="w-5 h-5" />} active={path === "/app" || path === "/app/"} />
            <NavTab to="/app/matches" label={`${t("shell.tab.matches")}${matchesQ.data?.length ? ` · ${matchesQ.data.length}` : ""}`} icon={<MessageCircle className="w-5 h-5" />} active={path.startsWith("/app/matches")} />
            <NavTab to="/app/profile" label={t("shell.tab.me")} icon={<User className="w-5 h-5" />} active={path.startsWith("/app/profile")} />
          </div>
        </nav>
      )}
    </div>
  );
}

function NavTab({ to, label, icon, active, highlight }: { to: string; label: string; icon: React.ReactNode; active: boolean; highlight?: boolean }) {
  return (
    <Link to={to} className={`relative flex flex-col items-center justify-center py-3 text-[11px] uppercase tracking-widest ${active ? "text-[var(--ball)]" : highlight ? "text-[var(--ball)]" : "text-[var(--cream)]/60"}`}>
      <div className="relative">
        {icon}
        {highlight && (
          <span className="absolute -top-1 -right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ball)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--ball)]" />
          </span>
        )}
      </div>
      <span className={`mt-1 ${highlight ? "font-bold" : ""}`}>{label}</span>
      {highlight && <span className="text-[8px] tracking-wider text-[var(--ball)]/80 leading-none">core</span>}
    </Link>
  );
}
