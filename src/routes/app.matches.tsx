import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";
import { getMyMatches, respondToIntro, deleteMatchThread } from "@/lib/app.functions";
import { useI18n, useTr } from "@/lib/i18n";


export const Route = createFileRoute("/app/matches")({
  component: Matches,
});

function Matches() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const getMatches = useServerFn(getMyMatches);
  const respond = useServerFn(respondToIntro);
  const deleteThread = useServerFn(deleteMatchThread);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-matches"], queryFn: () => getMatches(), staleTime: 60_000, placeholderData: keepPreviousData });
  const { t, label } = useI18n();
  const tr = useTr();
  const [busyId, setBusyId] = useState<string | null>(null);

  const isMatchesList = path === "/app/matches" || path === "/app/matches/";
  if (!isMatchesList) return <Outlet />;

  const decide = async (matchId: string, accept: boolean) => {
    setBusyId(matchId);
    try {
      await respond({ data: { matchId, accept } });
      toast.success(accept
        ? tr("Chat opened", "Chat abierto", "Discussion ouverte")
        : tr("Request ignored", "Solicitud ignorada", "Demande ignorée"));
      qc.invalidateQueries({ queryKey: ["my-matches"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Something went wrong", "Algo salió mal", "Erreur"));
    } finally {
      setBusyId(null);
    }
  };

  const removeThread = async (matchId: string, name: string) => {
    const confirmMsg = tr(
      `Delete entire conversation with ${name}? This cannot be undone.`,
      `¿Eliminar toda la conversación con ${name}? No se puede deshacer.`,
      `Supprimer toute la conversation avec ${name} ? Irréversible.`,
    );
    if (!window.confirm(confirmMsg)) return;
    setBusyId(matchId);
    try {
      await deleteThread({ data: { matchId } });
      toast.success(tr("Conversation deleted", "Conversación eliminada", "Conversation supprimée"));
      qc.invalidateQueries({ queryKey: ["my-matches"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Something went wrong", "Algo salió mal", "Erreur"));
    } finally {
      setBusyId(null);
    }
  };

  const items = q.data ?? [];
  const requests = items.filter((m) => m.pending_incoming && m.other);
  const chats = items.filter((m) => !m.pending_incoming && m.other);

  return (
    <main className="programme-page px-4 sm:px-6 lg:px-10 py-5 sm:py-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <h1 className="text-serif text-4xl sm:text-5xl lg:text-6xl text-[var(--ink)]">{t("ml.h1")}</h1>
        <p className="text-sm sm:text-base text-[var(--ink)]/70 mt-1 sm:mt-2">{t("ml.sub")}</p>

        {q.isLoading && !q.data ? (
          <ul className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="rounded-2xl border border-[var(--ink)]/8 bg-white p-4 space-y-2.5">
                <div className="h-4 w-1/2 rounded bg-[var(--ink)]/8 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-[var(--ink)]/6 animate-pulse" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="mt-12 text-center text-[var(--ink)]/60">
            <p>{t("ml.empty")}</p>
            <Link to="/app" className="underline mt-2 inline-block">{t("ml.discoverLink")}</Link>
          </div>
        ) : (
          <>
            {requests.length > 0 && (
              <section className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--plum)] font-semibold">
                    {tr("Message requests", "Solicitudes", "Demandes")}
                  </span>
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--plum)] text-white text-[11px] font-bold flex items-center justify-center">{requests.length}</span>
                </div>
                <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {requests.map((m) => m.other && (
                    <li key={m.match_id} className="programme-card p-3 sm:p-4 border-l-4 border-[var(--plum)]">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--paper-2)] shrink-0">
                          {m.other.photo_url && <img src={m.other.photo_url} alt={m.other.first_name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-serif text-2xl text-[var(--ink)] truncate">{m.other.first_name}</div>
                          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/60">{m.other.zone} · {label(m.other.level)}</div>
                        </div>
                      </div>
                      {m.last_message && (
                        <blockquote className="mt-2.5 text-sm text-[var(--ink)]/85 italic border-l-2 border-[var(--ink)]/15 pl-3 line-clamp-3">
                          &ldquo;{m.last_message.body}&rdquo;
                        </blockquote>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          disabled={busyId === m.match_id}
                          onClick={() => decide(m.match_id, true)}
                          className="flex-1 h-9 rounded-full bg-[var(--plum)] text-white text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> {tr("Accept", "Aceptar", "Accepter")}
                        </button>
                        <button
                          disabled={busyId === m.match_id}
                          onClick={() => decide(m.match_id, false)}
                          className="flex-1 h-9 rounded-full border border-[var(--ink)]/25 text-[var(--ink)]/70 text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> {tr("Ignore", "Ignorar", "Ignorer")}
                        </button>
                        <button
                          disabled={busyId === m.match_id}
                          onClick={() => removeThread(m.match_id, m.other!.first_name)}
                          aria-label={tr("Delete conversation", "Eliminar conversación", "Supprimer")}
                          className="h-9 w-9 rounded-full border border-[var(--ink)]/20 text-[var(--ink)]/60 hover:text-red-600 hover:border-red-500/40 disabled:opacity-50 inline-flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {chats.length > 0 && (
              <ul className="mt-5 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {chats.map((m) => m.other && (
                  <li key={m.match_id} className="relative">
                    <Link to="/app/matches/$matchId" params={{ matchId: m.match_id }} className="flex items-center gap-3 sm:gap-4 programme-card p-3 sm:p-4 pr-11 hover:bg-[var(--ink)]/[0.03] relative h-full">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--paper-2)] shrink-0 relative">
                        {m.other.photo_url && <img src={m.other.photo_url} alt={m.other.first_name} className="w-full h-full object-cover" />}
                        {m.unread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--plum)] text-white text-[11px] font-bold flex items-center justify-center ink-ring">{m.unread > 9 ? "9+" : m.unread}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-serif text-2xl sm:text-3xl text-[var(--ink)]">{m.other.first_name}</div>
                          {m.pending_outgoing && (
                            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[var(--ink)]/8 text-[var(--ink)]/60">
                              {tr("Sent", "Enviado", "Envoyé")}
                            </span>
                          )}
                          {m.unread > 0 && <span className="w-2 h-2 rounded-full bg-[var(--plum)] ink-ring" />}
                        </div>
                        <div className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60">{m.other.zone} · {label(m.other.level)}</div>
                        <div className={`text-xs sm:text-sm mt-1 line-clamp-2 ${m.unread > 0 ? "text-[var(--ink)] font-medium" : "text-[var(--ink)]/70"}`}>
                          {m.last_message ? `${m.last_message.from_me ? tr("You: ", "Tú: ", "Toi : ") : ""}${m.last_message.body}` : m.other.bio}
                        </div>
                      </div>
                    </Link>
                    <button
                      disabled={busyId === m.match_id}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeThread(m.match_id, m.other!.first_name); }}
                      aria-label={tr("Delete conversation", "Eliminar conversación", "Supprimer")}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-[var(--paper)] border border-[var(--ink)]/15 text-[var(--ink)]/50 hover:text-red-600 hover:border-red-500/40 disabled:opacity-50 inline-flex items-center justify-center z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
