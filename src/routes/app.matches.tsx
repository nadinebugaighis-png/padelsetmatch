import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyMatches } from "@/lib/app.functions";
import { ignoreIntro } from "@/lib/intro.functions";
import { useI18n, useTr } from "@/lib/i18n";
import { toast } from "sonner";


export const Route = createFileRoute("/app/matches")({
  component: Matches,
});

function Matches() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const getMatches = useServerFn(getMyMatches);
  const ignoreFn = useServerFn(ignoreIntro);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches() });
  const { t, label } = useI18n();
  const tr = useTr();

  const ignoreM = useMutation({
    mutationFn: (matchId: string) => ignoreFn({ data: { matchId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-matches"] });
      toast(tr("Intro removed", "Presentación descartada", "Intro supprimée"), { duration: 1600 });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const isMatchesList = path === "/app/matches" || path === "/app/matches/";
  if (!isMatchesList) return <Outlet />;

  const data = q.data ?? [];
  const pendingIntros = data.filter((m: any) => m.is_intro_pending && !m.i_initiated);
  const regular = data.filter((m: any) => !(m.is_intro_pending && !m.i_initiated));

  return (
    <main className="programme-page px-4 sm:px-6 lg:px-10 py-5 sm:py-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <h1 className="text-serif text-4xl sm:text-5xl lg:text-6xl text-[var(--ink)]">{t("ml.h1")}</h1>
        <p className="text-sm sm:text-base text-[var(--ink)]/70 mt-1 sm:mt-2">{t("ml.sub")}</p>

        {q.isLoading ? (
          <p className="mt-8 text-center text-[var(--ink)]/60">{t("ml.loading")}</p>
        ) : data.length === 0 ? (
          <div className="mt-12 text-center text-[var(--ink)]/60">
            <p>{t("ml.empty")}</p>
            <Link to="/app" className="underline mt-2 inline-block">{t("ml.discoverLink")}</Link>
          </div>
        ) : (
          <>
            {pendingIntros.length > 0 && (
              <section className="mt-6">
                <h2 className="text-[10px] uppercase tracking-[0.22em] text-[var(--plum)] font-bold mb-2.5">
                  {tr("New intros", "Nuevas presentaciones", "Nouvelles intros")}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingIntros.map((m: any) => m.other && (
                    <li key={m.match_id} className="programme-card p-3 sm:p-4 border-[var(--plum)]/30 border-2">
                      <Link to="/app/matches/$matchId" params={{ matchId: m.match_id }} className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--paper-2)] shrink-0">
                          {m.other.photo_url && <img src={m.other.photo_url} alt={m.other.first_name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-serif text-xl text-[var(--ink)] truncate">{m.other.first_name}</div>
                          <div className="text-[11px] uppercase tracking-widest text-[var(--plum)] font-bold">{tr("Intro", "Presentación", "Intro")}</div>
                          {m.last_message && (
                            <div className="text-xs text-[var(--ink)]/75 mt-1 line-clamp-2 italic">"{m.last_message.body}"</div>
                          )}
                        </div>
                      </Link>
                      <div className="flex gap-2 mt-3">
                        <Link to="/app/matches/$matchId" params={{ matchId: m.match_id }} className="flex-1 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] font-bold uppercase tracking-widest flex items-center justify-center">
                          {tr("Reply", "Responder", "Répondre")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => ignoreM.mutate(m.match_id)}
                          disabled={ignoreM.isPending}
                          className="h-9 px-4 rounded-full border border-[var(--ink)]/20 text-[var(--ink)]/70 text-[11px] font-semibold uppercase tracking-widest hover:bg-[var(--ink)]/5 disabled:opacity-50"
                        >
                          {tr("Ignore", "Ignorar", "Ignorer")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ul className="mt-5 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {regular.map((m: any) => m.other && (
                <li key={m.match_id}>
                  <Link to="/app/matches/$matchId" params={{ matchId: m.match_id }} className="flex items-center gap-3 sm:gap-4 programme-card p-3 sm:p-4 hover:bg-[var(--ink)]/[0.03] relative h-full">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--paper-2)] shrink-0 relative">
                      {m.other.photo_url && <img src={m.other.photo_url} alt={m.other.first_name} className="w-full h-full object-cover" />}
                      {m.unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--plum)] text-white text-[11px] font-bold flex items-center justify-center ink-ring">{m.unread > 9 ? "9+" : m.unread}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-serif text-2xl sm:text-3xl text-[var(--ink)]">{m.other.first_name}</div>
                        {m.unread > 0 && <span className="w-2 h-2 rounded-full bg-[var(--plum)] ink-ring" />}
                        {m.is_intro_pending && m.i_initiated && (
                          <span className="text-[9px] uppercase tracking-widest text-[var(--ink)]/50 font-semibold">{tr("Intro sent", "Enviada", "Envoyée")}</span>
                        )}
                      </div>
                      <div className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60">{m.other.zone} · {label(m.other.level)}</div>
                      <div className={`text-xs sm:text-sm mt-1 line-clamp-2 ${m.unread > 0 ? "text-[var(--ink)] font-medium" : "text-[var(--ink)]/70"}`}>
                        {m.last_message ? `${m.last_message.from_me ? tr("You: ", "Tú: ", "Toi : ") : ""}${m.last_message.body}` : m.other.bio}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

