import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { playerLevel } from "@/lib/level-label";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchDetail, sendMessage, blockProfile, reportProfile, confirmPlayed, reportNoShow, getPlayedStatus, markMatchRead, editMessage, deleteMessage, submitMatchRating, getMyMatchRating } from "@/lib/app.functions";
import { REPORT_REASONS } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowUp, Check, Flag, MoreHorizontal, Shield, UserX, Pencil, Trash2, X, Star } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { draftAfterSuccessfulSend } from "@/lib/qa-safety";
import { HoldMenu } from "@/components/HoldMenu";


export const Route = createFileRoute("/app/matches/$matchId")({
  head: () => ({ meta: [{ title: "Player conversation \u00b7 PadelSetMatch" }, { name: "description", content: "Coordinate your next padel game in your private player conversation." }, { property: "og:title", content: "Player conversation \u00b7 PadelSetMatch" }, { property: "og:description", content: "Coordinate your next padel game in your private player conversation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, lang } = useI18n();
  const tr = useTr();
  const getDetail = useServerFn(getMatchDetail);
  const send = useServerFn(sendMessage);
  const block = useServerFn(blockProfile);
  const report = useServerFn(reportProfile);
  const confirmFn = useServerFn(confirmPlayed);
  const noShowFn = useServerFn(reportNoShow);
  const statusFn = useServerFn(getPlayedStatus);
  const editFn = useServerFn(editMessage);
  const delFn = useServerFn(deleteMessage);

  const q = useQuery({ queryKey: ["match", matchId], queryFn: () => getDetail({ data: { matchId } }) });
  const statusQ = useQuery({
    queryKey: ["match-status", matchId],
    queryFn: () => statusFn({ data: { matchId } }),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data && (query.state.data as { count: number }).count >= 2 ? false : 20_000),
  });
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const getRatingFn = useServerFn(getMyMatchRating);
  const ratingQ = useQuery({
    queryKey: ["match-rating", matchId],
    queryFn: () => getRatingFn({ data: { matchId } }),
    enabled: !!statusQ.data && statusQ.data.count >= 2,
  });
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetail, setReportDetail] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, () => {
        qc.invalidateQueries({ queryKey: ["match", matchId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "played_confirmations", filter: `match_id=eq.${matchId}` }, () => {
        qc.invalidateQueries({ queryKey: ["match-status", matchId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }, [q.data?.messages.length]);

  const markRead = useServerFn(markMatchRead);
  useEffect(() => {
    if (!q.data) return;
    markRead({ data: { matchId } }).then(() => {
      qc.invalidateQueries({ queryKey: ["my-matches"] });
    }).catch(() => {});
  }, [matchId, q.data?.messages.length, markRead, qc]);

  const sendM = useMutation({
    mutationFn: (body: string) => send({ data: { matchId, body } }),
    onSuccess: (_result, body) => {
      setText((current) => draftAfterSuccessfulSend(current, body));
      return qc.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("chat.sendFail")),
  });

  const safetyDone = (msg: string) => () => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["my-matches"] });
    navigate({ to: "/app/matches" });
  };
  const blockM = useMutation({
    mutationFn: (id: string) => block({ data: { blockedProfileId: id } }),
    onSuccess: safetyDone(t("chat.blockedDone")),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.blockFail")),
  });
  const reportM = useMutation({
    mutationFn: (vars: { id: string; reason: string }) => report({ data: { reportedProfileId: vars.id, reason: vars.reason } }),
    onSuccess: safetyDone(t("chat.reportDone")),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("disc.reportFail")),
  });
  const confirmM = useMutation({
    mutationFn: () => confirmFn({ data: { matchId } }),
    onSuccess: () => { toast.success(tr("Marked as played", "Marcado como jugado", "Marqué comme joué")); qc.invalidateQueries({ queryKey: ["match-status", matchId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't confirm", "No se pudo confirmar", "Impossible de confirmer")),
  });
  const noShowM = useMutation({
    mutationFn: () => noShowFn({ data: { matchId } }),
    onSuccess: () => toast.success(tr("Reported, thank you", "Reportado, gracias", "Signalé, merci")),
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't report", "No se pudo reportar", "Impossible de signaler")),
  });
  const editM = useMutation({
    mutationFn: (v: { messageId: string; body: string }) => editFn({ data: v }),
    onSuccess: () => { setEditingId(null); setEditingText(""); qc.invalidateQueries({ queryKey: ["match", matchId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't edit", "No se pudo editar", "Impossible de modifier")),
  });
  const deleteM = useMutation({
    mutationFn: (messageId: string) => delFn({ data: { messageId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't delete", "No se pudo eliminar", "Impossible de supprimer")),
  });


  if (q.isLoading || !q.data) return <div className="px-4 py-10 text-center text-[var(--ink)]/82">{t("chat.opening")}</div>;
  const { other, my_profile_id, messages } = q.data;

  const onBlock = () => {
    if (!window.confirm(t("disc.blockConfirm", { name: other.first_name }))) return;
    blockM.mutate(other.id);
  };
  const submitReport = () => {
    const full = reportDetail.trim() ? `${reportReason}: ${reportDetail.trim()}` : reportReason;
    reportM.mutate({ id: other.id, reason: full });
    setReportOpen(false);
  };
  const onNoShow = () => {
    if (!window.confirm(tr(`Report that ${other.first_name} didn't show up? Repeat no-shows lead to auto-suspension.`, `¿Reportar que ${other.first_name} no se presentó? Los no-shows repetidos causan suspensión automática.`))) return;
    noShowM.mutate();
  };

  const played = !!statusQ.data && statusQ.data.count >= 2;
  const waiting = !!statusQ.data?.iConfirmed && !played;
  const hasRated = !!ratingQ.data;
  const locale = lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : "en-GB";
  const dayLabel = (d: Date) => {
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return tr("Today", "Hoy", "Aujourd'hui");
    if (d.toDateString() === y.toDateString()) return tr("Yesterday", "Ayer", "Hier");
    return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  };
  const GROUP_MS = 5 * 60 * 1000;

  return (
    <main className="programme-page chat-room max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex flex-col text-[var(--ink)]" style={{ height: "calc(100dvh - 160px - env(safe-area-inset-bottom, 0px))" }}>
      <header className="px-3 py-2.5 flex items-center gap-3 border-b border-[var(--card-edge)]">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
            else navigate({ to: "/app/matches" });
          }}
          className="-ml-1 grid place-items-center w-9 h-9 rounded-full hover:bg-[var(--ink)]/6 transition"
          aria-label={tr("Back", "Atrás", "Retour")}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.6} />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--ink)]/8 shrink-0 ring-1 ring-[var(--card-edge)]">
          {other.photo_url && <img src={other.photo_url} alt={other.first_name} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-display text-[20px] leading-tight truncate">{other.first_name}</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink)]/70 truncate">
            {[other.zone, playerLevel(other.level, other.level_rating, tr)].filter(Boolean).join(" · ")}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={tr("More options", "Más opciones", "Plus d'options")}
              className="relative grid place-items-center w-9 h-9 rounded-full hover:bg-[var(--ink)]/6 transition"
            >
              <MoreHorizontal className="w-5 h-5" strokeWidth={1.6} />
              {played && !hasRated && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-56 rounded-2xl p-1.5 bg-white text-[var(--ink)] border-[var(--card-edge)] shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--ink)_28%,transparent)]">
            <DropdownMenuItem
              disabled={!!statusQ.data?.iConfirmed || confirmM.isPending}
              onSelect={() => confirmM.mutate()}
              className="rounded-xl px-3 py-2.5 text-[14px] gap-2.5"
            >
              <Check className="w-4 h-4" strokeWidth={1.6} />
              {played
                ? tr("Played together", "Habéis jugado juntos", "Joué ensemble")
                : waiting
                  ? tr("Waiting for them to confirm", "Esperando su confirmación", "En attente de sa confirmation")
                  : tr("We played a match", "Jugamos un partido", "Nous avons joué un match")}
            </DropdownMenuItem>
            {played && (
              <DropdownMenuItem onSelect={() => setRatingOpen(true)} className="rounded-xl px-3 py-2.5 text-[14px] gap-2.5">
                <Star className={`w-4 h-4 ${hasRated ? "fill-[var(--ink)]" : ""}`} strokeWidth={1.6} />
                {hasRated ? tr("Your rating", "Tu valoración", "Ta note") : tr("Rate the match", "Valorar el partido", "Noter le match")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onNoShow} className="rounded-xl px-3 py-2.5 text-[14px] gap-2.5">
              <UserX className="w-4 h-4" strokeWidth={1.6} />
              {tr("Report a no-show", "Reportar que no vino", "Signaler une absence")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-[var(--card-edge)]" />
            <DropdownMenuItem onSelect={onBlock} className="rounded-xl px-3 py-2.5 text-[14px] gap-2.5">
              <Shield className="w-4 h-4" strokeWidth={1.6} />
              {t("chat.block")} {other.first_name}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setReportOpen(true)} className="rounded-xl px-3 py-2.5 text-[14px] gap-2.5 text-destructive focus:text-destructive">
              <Flag className="w-4 h-4" strokeWidth={1.6} />
              {t("chat.report")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {ratingOpen && <MatchRatingPanel matchId={matchId} otherName={other.first_name} onClose={() => setRatingOpen(false)} />}

      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setReportOpen(false)}>
          <div className="surface-card p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-display text-xl">{tr("Report", "Reportar", "Signaler")} {other.first_name}</h3>
            <label className="text-xs uppercase tracking-widest text-[var(--ink)]/82">{tr("Reason", "Motivo", "Raison")}</label>
            <select className="w-full bg-transparent border border-[var(--ink)]/20 rounded-md h-10 px-2" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r} value={r} className="bg-[var(--paper)] text-[var(--ink)]">{r}</option>)}
            </select>
            <label className="text-xs uppercase tracking-widest text-[var(--ink)]/82">{tr("Details (optional)", "Detalles (opcional)", "Détails (optionnel)")}</label>
            <Input value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} placeholder={tr("Anything else we should know?", "¿Algo más que debamos saber?", "Autre chose à savoir ?")} maxLength={400} />
            <p className="text-xs text-[var(--ink)]/82">{tr("The account will be auto-suspended immediately while our team reviews.", "La cuenta se suspenderá al instante mientras nuestro equipo la revisa.", "Le compte sera suspendu automatiquement pendant que notre équipe vérifie.")}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReportOpen(false)}>{tr("Cancel", "Cancelar", "Annuler")}</Button>
              <Button onClick={submitReport} className="bg-red-500 hover:bg-red-600 text-white">{tr("Submit report", "Enviar reporte", "Envoyer le signalement")}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        {messages.length === 0 && (
          <div className="mt-14 text-center">
            <div className="text-display text-[22px] leading-tight">{tr(`Say hello to ${other.first_name}`, `Saluda a ${other.first_name}`, `Dites bonjour à ${other.first_name}`)}</div>
            <p className="mt-1.5 text-[13px] text-[var(--ink)]/70">{tr("A good start: suggest a day and a club.", "Un buen comienzo: propón un día y un club.", "Un bon début : proposez un jour et un club.")}</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_profile_id === my_profile_id;
          const isEditing = editingId === m.id;
          const at = new Date(m.created_at);
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const prevAt = prev ? new Date(prev.created_at) : null;
          const nextAt = next ? new Date(next.created_at) : null;
          const newDay = !prevAt || prevAt.toDateString() !== at.toDateString();
          const joinsPrev = !!prev && !newDay && prev.sender_profile_id === m.sender_profile_id && at.getTime() - (prevAt as Date).getTime() < GROUP_MS;
          const joinsNext = !!next && !!nextAt && nextAt.toDateString() === at.toDateString() && next.sender_profile_id === m.sender_profile_id && nextAt.getTime() - at.getTime() < GROUP_MS;
          const time = at.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
          const shape = mine
            ? `rounded-[20px] ${joinsPrev ? "rounded-tr-[6px]" : ""} ${joinsNext ? "rounded-br-[6px]" : ""}`
            : `rounded-[20px] ${joinsPrev ? "rounded-tl-[6px]" : ""} ${joinsNext ? "rounded-bl-[6px]" : ""}`;
          return (
            <div key={m.id}>
              {newDay && (
                <div className="flex items-center gap-3 my-5 first:mt-2">
                  <span className="h-px flex-1 bg-[var(--card-edge)]" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/60">{dayLabel(at)}</span>
                  <span className="h-px flex-1 bg-[var(--card-edge)]" />
                </div>
              )}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${joinsPrev ? "mt-[3px]" : newDay ? "" : "mt-4"}`}>
                {!mine && (
                  <div className="w-7 shrink-0">
                    {!joinsNext && (
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--ink)]/8 ring-1 ring-[var(--card-edge)]">
                        {other.photo_url && <img src={other.photo_url} alt={other.first_name} className="w-full h-full object-cover" />}
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex flex-col max-w-[78%] sm:max-w-[65%] ${mine ? "items-end" : "items-start"}`}>
                  <HoldMenu
                    disabled={!mine || isEditing}
                    hint={tr("Press and hold to edit or delete", "Mantén pulsado para editar o borrar", "Appui long pour modifier ou supprimer")}
                    items={[
                      { label: tr("Edit", "Editar", "Modifier"), icon: <Pencil className="w-4 h-4" />, onSelect: () => { setEditingId(m.id); setEditingText(m.body); } },
                      { label: tr("Delete", "Borrar", "Supprimer"), icon: <Trash2 className="w-4 h-4" />, destructive: true, onSelect: () => { if (window.confirm(tr("Delete this message?", "¿Borrar este mensaje?", "Supprimer ce message ?"))) deleteM.mutate(m.id); } },
                    ]}
                    className={`chat-bubble ${mine ? "chat-bubble-mine" : "chat-bubble-theirs"} ${shape} px-4 py-[9px] text-[15px] leading-[1.45]`}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const body = editingText.trim();
                          if (body && body !== m.body) editM.mutate({ messageId: m.id, body });
                          else { setEditingId(null); setEditingText(""); }
                        }}
                        className="flex flex-col gap-1.5 min-w-[200px]"
                      >
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-white/70 text-[var(--ink)] rounded-xl px-2.5 py-1.5 text-base resize-none placeholder:text-[var(--ink)]/45 outline-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="p-1 rounded-full hover:bg-[var(--ink)]/8" aria-label={tr("Cancel", "Cancelar", "Annuler")}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button type="submit" disabled={editM.isPending} className="p-1 rounded-full hover:bg-[var(--ink)]/8" aria-label={tr("Save", "Guardar", "Enregistrer")}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                  </HoldMenu>
                  {!joinsNext && !isEditing && (
                    <div className={`mt-1 px-1.5 text-[10px] tracking-[0.08em] text-[var(--ink)]/55 tabular-nums`}>
                      {time}{m.edited_at ? ` · ${tr("Edited", "Editado", "Modifié")}` : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {played && !hasRated && messages.length > 0 && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setRatingOpen(true)} className="text-[12px] tracking-[0.04em] text-[var(--ink)]/75 underline decoration-[var(--gold)] decoration-1 underline-offset-4 hover:text-[var(--ink)]">
              {tr(`How was your match with ${other.first_name}?`, `¿Qué tal el partido con ${other.first_name}?`, `Comment s'est passé le match avec ${other.first_name} ?`)}
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendM.mutate(text.trim()); }}
        className="px-3 pt-2 pb-3"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-white border border-[var(--card-edge)] pl-4 pr-1.5 py-1.5 shadow-[0_6px_20px_-12px_color-mix(in_oklab,var(--ink)_30%,transparent)] focus-within:border-[var(--ink)]/30 transition-colors">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr("Message", "Mensaje", "Message")}
            aria-label={tr("Message", "Mensaje", "Message")}
            className="flex-1 min-w-0 bg-transparent text-[16px] leading-6 py-1 !outline-none !ring-0 !shadow-none !border-0 placeholder:text-[var(--ink)]/45"
            enterKeyHint="send"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendM.isPending}
            aria-label={tr("Send", "Enviar", "Envoyer")}
            className="grid place-items-center w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] transition disabled:opacity-25 hover:brightness-110"
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </form>
    </main>
  );
}

const RATING_TAGS_EN = ["Great vibe", "Skill match", "Would play again", "Punctual", "Communicative", "Fun off-court", "Mismatched level", "Low energy"];
const RATING_TAGS_ES = ["Buen rollo", "Nivel similar", "Repetiría", "Puntual", "Comunicativo", "Divertido fuera de pista", "Nivel distinto", "Poca energía"];

function MatchRatingPanel({ matchId, otherName, onClose }: { matchId: string; otherName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const tr = useTr();
  const getRatingFn = useServerFn(getMyMatchRating);
  const submitFn = useServerFn(submitMatchRating);
  const ratingQ = useQuery({
    queryKey: ["match-rating", matchId],
    queryFn: () => getRatingFn({ data: { matchId } }),
  });
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (ratingQ.data) {
      setStars(ratingQ.data.stars);
      setTags(ratingQ.data.tags ?? []);
      setComment(ratingQ.data.comment ?? "");
    }
  }, [ratingQ.data]);

  const submitM = useMutation({
    mutationFn: () => submitFn({ data: { matchId, stars, tags, comment: comment.trim() || undefined } }),
    onSuccess: () => {
      toast.success(tr("Thank you", "Gracias", "Merci"));
      qc.invalidateQueries({ queryKey: ["match-rating", matchId] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't save", "No se pudo guardar", "Impossible d'enregistrer")),
  });

  const hasRated = !!ratingQ.data;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-[var(--ink)]/16 bg-[var(--paper)] p-4 space-y-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-[var(--ink)]/82">{tr("Rate your match", "Valora tu partido", "Note ton match")}</div>
          <button type="button" onClick={onClose} className="p-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex gap-1.5 justify-center">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className="p-1"
              aria-label={tr(`${n} star${n>1?"s":""}`, `${n} estrella${n>1?"s":""}`)}
            >
              <Star className={`w-7 h-7 transition ${n <= stars ? "text-[var(--ink)] fill-[var(--ink)]" : "text-[var(--ink)]/25"}`} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RATING_TAGS_EN.map((tag, i) => {
            const active = tags.includes(tag);
            const displayLabel = tr(tag, RATING_TAGS_ES[i] ?? tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition ${active ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]" : "border-[var(--ink)]/20 text-[var(--ink)]/88 hover:bg-[var(--ink)]/5"}`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={tr("Optional note (private, helps us learn)", "Nota opcional (privada, nos ayuda a aprender)", "Note optionnelle (privée, nous aide à apprendre)")}
          maxLength={400}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>{tr("Cancel", "Cancelar", "Annuler")}</Button>
          <Button size="sm" disabled={stars === 0 || submitM.isPending} onClick={() => submitM.mutate()}>
            {submitM.isPending ? tr("Saving…", "Guardando…", "Enregistrement…") : hasRated ? tr("Update", "Actualizar", "Mettre à jour") : tr("Submit", "Enviar", "Envoyer")}
          </Button>
        </div>
      </div>
    </div>
  );
}

