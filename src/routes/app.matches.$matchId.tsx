import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchDetail, sendMessage, blockProfile, reportProfile, confirmPlayed, reportNoShow, getPlayedStatus, markMatchRead, editMessage, deleteMessage, submitMatchRating, getMyMatchRating } from "@/lib/app.functions";
import { playtomicLink } from "@/lib/affinity";
import { REPORT_REASONS } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, ExternalLink, Send, Flag, Shield, ShieldCheck, UserX, Pencil, Trash2, X, Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";

export const Route = createFileRoute("/app/matches/$matchId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
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
  const statusQ = useQuery({ queryKey: ["match-status", matchId], queryFn: () => statusFn({ data: { matchId } }) });
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetail, setReportDetail] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, () => {
        qc.invalidateQueries({ queryKey: ["match", matchId] });
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
    onMutate: () => setText(""),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
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
    onSuccess: () => { toast.success(tr("Marked as played ✅", "Marcado como jugado ✅")); qc.invalidateQueries({ queryKey: ["match-status", matchId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't confirm", "No se pudo confirmar")),
  });
  const noShowM = useMutation({
    mutationFn: () => noShowFn({ data: { matchId } }),
    onSuccess: () => toast.success(tr("No-show reported. Thanks — we'll look into it.", "No-show reportado. Gracias — lo revisaremos.")),
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't report", "No se pudo reportar")),
  });
  const editM = useMutation({
    mutationFn: (v: { messageId: string; body: string }) => editFn({ data: v }),
    onSuccess: () => { setEditingId(null); setEditingText(""); qc.invalidateQueries({ queryKey: ["match", matchId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't edit", "No se pudo editar")),
  });
  const deleteM = useMutation({
    mutationFn: (messageId: string) => delFn({ data: { messageId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't delete", "No se pudo eliminar")),
  });


  if (q.isLoading || !q.data) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">{t("chat.opening")}</div>;
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

  return (
    <main className="max-w-md mx-auto flex flex-col h-[calc(100dvh-150px)]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--cream)]/10">
        <Link to="/app/matches" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--cream)]/10 shrink-0">
          {other.photo_url && <img src={other.photo_url} alt={other.first_name} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-display text-xl leading-none">{other.first_name}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60">{other.zone} · {label(other.level)}</div>
        </div>
        <button onClick={onBlock} title={t("chat.block")} aria-label={t("chat.block")} className="p-1.5 rounded-full hover:bg-[var(--cream)]/10">
          <Shield className="w-4 h-4" />
        </button>
        <button onClick={() => setReportOpen(true)} title={t("chat.report")} aria-label={t("chat.report")} className="p-1.5 rounded-full hover:bg-red-600/30">
          <Flag className="w-4 h-4" />
        </button>
      </div>

      <a
        href={playtomicLink(other.zone)}
        target="_blank"
        rel="noreferrer"
        className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-[var(--ball)]/40 bg-[var(--ball)]/10 px-3 py-2 text-xs text-[var(--cream)]"
      >
        <ShieldCheck className="w-4 h-4 text-[var(--ball)] shrink-0" />
        <span className="flex-1">
          <b>{t("chat.safetyTitle")}</b> {t("chat.safety")}
        </span>
        <span className="chip chip-ball shrink-0">{t("chat.open")} <ExternalLink className="w-3 h-3" /></span>
      </a>


      <div className="mx-3 mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => confirmM.mutate()}
          disabled={statusQ.data?.iConfirmed || confirmM.isPending}
          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--cream)]/15 bg-[var(--cream)]/5 px-3 py-2 text-xs hover:bg-[var(--cream)]/10 disabled:opacity-60"
        >
          <Check className="w-3.5 h-3.5 text-[var(--ball)]" />
          {statusQ.data?.iConfirmed
            ? (statusQ.data.count >= 2 ? tr("Played together ✓", "Jugado juntos ✓") : tr("Waiting for them to confirm…", "Esperando que confirmen…"))
            : tr("We played a match", "Jugamos un partido")}
        </button>
        <button
          type="button"
          onClick={onNoShow}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
        >
          <UserX className="w-3.5 h-3.5" /> {tr("No-show", "No-show")}
        </button>

      </div>

      {statusQ.data && statusQ.data.count >= 2 && (
        <MatchRatingPanel matchId={matchId} otherName={other.first_name} />
      )}


      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setReportOpen(false)}>
          <div className="surface-card p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-display text-xl">{tr("Report", "Reportar")} {other.first_name}</h3>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Reason", "Motivo")}</label>
            <select className="w-full bg-transparent border border-[var(--cream)]/20 rounded-md h-10 px-2" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r} value={r} className="bg-[var(--court-deep)]">{r}</option>)}
            </select>
            <label className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Details (optional)", "Detalles (opcional)")}</label>
            <Input value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} placeholder={tr("Anything else we should know?", "¿Algo más que debamos saber?")} maxLength={400} />
            <p className="text-xs text-[var(--cream)]/60">{tr("The account will be auto-suspended immediately while our team reviews.", "La cuenta se suspenderá al instante mientras nuestro equipo la revisa.")}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReportOpen(false)}>{tr("Cancel", "Cancelar")}</Button>
              <Button onClick={submitReport} className="bg-red-500 hover:bg-red-600 text-white">{tr("Submit report", "Enviar reporte")}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--cream)]/60 mt-10">
            {t("chat.empty")}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_profile_id === my_profile_id;
          const isEditing = editingId === m.id;
          return (
            <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {mine && !isEditing && (
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setEditingId(m.id); setEditingText(m.body); }}
                    className="p-1.5 rounded-full bg-[var(--cream)]/10 hover:bg-[var(--cream)]/20 text-[var(--cream)]"
                    aria-label="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(tr("Delete this message?", "¿Borrar este mensaje?"))) deleteM.mutate(m.id); }}
                    className="p-1.5 rounded-full bg-[var(--cream)]/10 hover:bg-red-500/20 text-[var(--cream)] hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-[var(--ball)] text-[var(--court-deep)]" : "bg-[var(--cream)]/10 text-[var(--cream)]"}`}>
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const body = editingText.trim();
                      if (body && body !== m.body) editM.mutate({ messageId: m.id, body });
                      else { setEditingId(null); setEditingText(""); }
                    }}
                    className="flex flex-col gap-1.5 min-w-[180px]"
                  >
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full bg-[var(--court-deep)]/20 text-[var(--court-deep)] rounded p-1.5 text-base resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="p-1 rounded hover:bg-[var(--court-deep)]/10" aria-label="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button type="submit" disabled={editM.isPending} className="p-1 rounded hover:bg-[var(--court-deep)]/10" aria-label="Save">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {m.body}
                    {m.edited_at && <span className={`ml-1.5 text-[10px] ${mine ? "text-[var(--court-deep)]/60" : "text-[var(--cream)]/50"}`}>{tr("(edited)", "(editado)")}</span>}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendM.mutate(text.trim()); }}
        className="px-3 py-3 border-t border-[var(--cream)]/10 flex gap-2"
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={messages.length === 0 ? t("chat.placeholder") : ""} />
        <Button type="submit" size="icon" disabled={!text.trim() || sendM.isPending}><Send className="w-4 h-4" /></Button>
      </form>
    </main>
  );
}

const RATING_TAGS_EN = ["Great vibe", "Skill match", "Would play again", "Punctual", "Communicative", "Fun off-court", "Mismatched level", "Low energy"];
const RATING_TAGS_ES = ["Buen rollo", "Nivel similar", "Repetiría", "Puntual", "Comunicativo", "Divertido fuera de pista", "Nivel distinto", "Poca energía"];

function MatchRatingPanel({ matchId, otherName }: { matchId: string; otherName: string }) {
  const qc = useQueryClient();
  const tr = useTr();
  const getRatingFn = useServerFn(getMyMatchRating);
  const submitFn = useServerFn(submitMatchRating);
  const ratingQ = useQuery({
    queryKey: ["match-rating", matchId],
    queryFn: () => getRatingFn({ data: { matchId } }),
  });
  const [expanded, setExpanded] = useState(false);
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
      toast.success(tr("Thanks — this makes future matches smarter", "Gracias — así mejoramos tus próximos matches"));
      qc.invalidateQueries({ queryKey: ["match-rating", matchId] });
      setExpanded(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : tr("Couldn't save", "No se pudo guardar")),
  });

  const hasRated = !!ratingQ.data;

  if (!expanded && hasRated) {
    return (
      <div className="mx-3 mt-2 rounded-xl border border-[var(--cream)]/10 bg-[var(--cream)]/5 px-3 py-2 text-xs text-[var(--cream)]/70 flex items-center gap-2">
        <div className="flex">
          {[1,2,3,4,5].map((n) => (
            <Star key={n} className={`w-3.5 h-3.5 ${n <= (ratingQ.data?.stars ?? 0) ? "text-[var(--ball)] fill-[var(--ball)]" : "text-[var(--cream)]/25"}`} />
          ))}
        </div>
        <span className="flex-1">{tr("You rated this match", "Valoraste este partido")}</span>
        <button type="button" onClick={() => setExpanded(true)} className="text-[var(--ball)] underline">{tr("Edit", "Editar")}</button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mx-3 mt-2 rounded-xl border border-[var(--ball)]/40 bg-[var(--ball)]/10 px-3 py-2.5 text-xs text-[var(--cream)] flex items-center gap-2 hover:bg-[var(--ball)]/15 transition"
      >
        <Star className="w-4 h-4 text-[var(--ball)]" />
        <span className="flex-1 text-left">{tr(`How was your match with ${otherName}? Rate to help us learn.`, `¿Qué tal tu partido con ${otherName}? Valóralo para ayudarnos a aprender.`)}</span>
        <span className="text-[var(--ball)] font-semibold">{tr("Rate", "Valorar")}</span>
      </button>
    );
  }

  return (
    <div className="mx-3 mt-2 rounded-xl border border-[var(--ball)]/40 bg-[var(--court)]/60 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-[var(--cream)]/60">{tr("Rate your match", "Valora tu partido")}</div>
        <button type="button" onClick={() => setExpanded(false)} className="p-1 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1.5 justify-center">
        {[1,2,3,4,5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            className="p-1"
            aria-label={`${n} star${n>1?"s":""}`}
          >
            <Star className={`w-7 h-7 transition ${n <= stars ? "text-[var(--ball)] fill-[var(--ball)]" : "text-[var(--cream)]/25"}`} />
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
              className={`px-2.5 py-1 rounded-full text-[11px] border transition ${active ? "bg-[var(--ball)] text-[var(--court-deep)] border-[var(--ball)]" : "border-[var(--cream)]/20 text-[var(--cream)]/80 hover:bg-[var(--cream)]/5"}`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={tr("Optional note (private, helps us learn)", "Nota opcional (privada, nos ayuda a aprender)")}
        maxLength={400}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>{tr("Cancel", "Cancelar")}</Button>
        <Button size="sm" disabled={stars === 0 || submitM.isPending} onClick={() => submitM.mutate()}>
          {submitM.isPending ? tr("Saving…", "Guardando…") : hasRated ? tr("Update", "Actualizar") : tr("Submit", "Enviar")}
        </Button>
      </div>
    </div>
  );
}

