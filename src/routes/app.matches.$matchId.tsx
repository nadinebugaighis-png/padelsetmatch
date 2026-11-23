import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { playerLevel } from "@/lib/level-label";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchDetail, sendMessage, blockProfile, reportProfile, markMatchRead, editMessage, deleteMessage } from "@/lib/app.functions";
import { REPORT_REASONS } from "@/lib/types";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUp, Check, ChevronLeft, Flag, MoreHorizontal, Pencil, Shield, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n, useTr } from "@/lib/i18n";
import { draftAfterSuccessfulSend } from "@/lib/qa-safety";
import { HoldMenu } from "@/components/HoldMenu";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { CourtViewCard } from "@/components/CourtViewCard";
import { photoSrc } from "@/lib/photo-src";

export const Route = createFileRoute("/app/matches/$matchId")({
  head: () => ({ meta: [{ title: "Player conversation \u00b7 PadelSetMatch" }, { name: "description", content: "Coordinate your next padel game in your private player conversation." }, { property: "og:title", content: "Player conversation \u00b7 PadelSetMatch" }, { property: "og:description", content: "Coordinate your next padel game in your private player conversation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: ChatRoom,
});

// Full-screen conversation on phones (the app's top bar and bottom menu step aside);
// on desktop it sits under the main header.
function ChatFrame({ children }: { children: ReactNode }) {
  return (
    <main
      className="programme-page fixed inset-0 z-30 flex flex-col bg-[var(--paper)] text-[var(--ink)] lg:static lg:z-auto lg:mx-auto lg:max-w-3xl lg:h-[calc(100dvh-5.5rem)] lg:border-x lg:border-[var(--ink)]/10"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {children}
    </main>
  );
}

function Avatar({ id, name, url, size }: { id: string; name: string | null; url: string | null | undefined; size: string }) {
  return (
    <div className={`${size} rounded-full overflow-hidden shrink-0 bg-[var(--paper-2)]`}>
      {url
        ? <PlayerPhoto src={photoSrc(url, 240)} seed={id} alt={name ?? ""} decoding="async" className="w-full h-full object-cover" />
        : <CourtViewCard seed={id} name={name} role="img" className="w-full h-full" letterClassName="text-[14px]" />}
    </div>
  );
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function ChatRoom() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const tr = useTr();
  const getDetail = useServerFn(getMatchDetail);
  const send = useServerFn(sendMessage);
  const block = useServerFn(blockProfile);
  const report = useServerFn(reportProfile);
  const editFn = useServerFn(editMessage);
  const delFn = useServerFn(deleteMessage);

  const q = useQuery({ queryKey: ["match", matchId], queryFn: () => getDetail({ data: { matchId } }) });
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
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, () => {
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

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else navigate({ to: "/app/matches" });
  };
  const backButton = (
    <button type="button" onClick={goBack} className="-ml-2 p-2 rounded-full hover:bg-[var(--ink)]/5" aria-label={tr("Back", "Atrás", "Retour")}>
      <ChevronLeft className="w-6 h-6" strokeWidth={1.75} />
    </button>
  );

  if (q.isLoading || !q.data) {
    return (
      <ChatFrame>
        <div className="px-4 h-16 flex items-center border-b border-[var(--ink)]/10">{backButton}</div>
        <div className="flex-1 grid place-items-center text-sm text-[var(--ink)]/70">{t("chat.opening")}</div>
      </ChatFrame>
    );
  }
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

  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const dayLabel = (iso: string) => {
    const k = dayKey(iso);
    if (k === today) return tr("Today", "Hoy", "Aujourd'hui");
    if (k === yesterday) return tr("Yesterday", "Ayer", "Hier");
    return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <ChatFrame>
      <header className="px-4 h-16 flex items-center gap-3 border-b border-[var(--ink)]/10 bg-[var(--paper)]/95 backdrop-blur shrink-0">
        {backButton}
        <Avatar id={other.id} name={other.first_name} url={other.photo_url} size="w-9 h-9" />
        <div className="flex-1 min-w-0">
          <div className="text-display text-[19px] leading-tight truncate">{other.first_name}</div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink)]/70 truncate">
            {[other.zone, playerLevel(other.level, other.level_rating, tr)].filter(Boolean).join(" · ")}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="p-2 -mr-2 rounded-full hover:bg-[var(--ink)]/5" aria-label={tr("More", "Más", "Plus")}>
              <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44 bg-white text-[var(--ink)] border-[var(--ink)]/12">
            <DropdownMenuItem onSelect={onBlock} className="gap-2.5 py-2.5">
              <Shield className="w-4 h-4" strokeWidth={1.75} /> {t("chat.block")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setReportOpen(true)} className="gap-2.5 py-2.5 text-[var(--clay)] focus:text-[var(--clay)]">
              <Flag className="w-4 h-4" strokeWidth={1.75} /> {t("chat.report")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--ink)]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setReportOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-[var(--paper)] border border-[var(--ink)]/10 shadow-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-display text-xl">{tr("Report", "Reportar", "Signaler")} {other.first_name}</h3>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--ink)]/75">{tr("Reason", "Motivo", "Raison")}</label>
            <select className="w-full bg-white border border-[var(--ink)]/16 rounded-xl h-11 px-3 text-base" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              {REPORT_REASONS.map((r) => <option key={r} value={r} className="bg-[var(--paper)] text-[var(--ink)]">{r}</option>)}
            </select>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[var(--ink)]/75">{tr("Details (optional)", "Detalles (opcional)", "Détails (optionnel)")}</label>
            <Input value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} placeholder={tr("Anything else we should know?", "¿Algo más que debamos saber?", "Autre chose à savoir ?")} maxLength={400} />
            <p className="text-xs text-[var(--ink)]/75">{tr("The account will be auto-suspended immediately while our team reviews.", "La cuenta se suspenderá al instante mientras nuestro equipo la revisa.", "Le compte sera suspendu automatiquement pendant que notre équipe vérifie.")}</p>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" className="rounded-full" onClick={() => setReportOpen(false)}>{tr("Cancel", "Cancelar", "Annuler")}</Button>
              <Button onClick={submitReport} className="rounded-full bg-[var(--clay)] text-[var(--paper)] hover:brightness-105">{tr("Send report", "Enviar reporte", "Envoyer")}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--ink)]/70 mt-16 px-8 leading-relaxed">
            {t("chat.empty")}
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_profile_id === my_profile_id;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          const firstOfGroup = newDay || prev?.sender_profile_id !== m.sender_profile_id;
          const lastOfGroup = !next || next.sender_profile_id !== m.sender_profile_id || dayKey(next.created_at) !== dayKey(m.created_at);
          const isEditing = editingId === m.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-4 text-center text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink)]/60">{dayLabel(m.created_at)}</div>
              )}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${firstOfGroup ? "mt-3" : "mt-1"}`}>
                {!mine && (
                  lastOfGroup
                    ? <Avatar id={other.id} name={other.first_name} url={other.photo_url} size="w-7 h-7" />
                    : <div className="w-7 shrink-0" />
                )}
                <HoldMenu
                  disabled={!mine || isEditing}
                  hint={tr("Press and hold to edit or delete", "Mantén pulsado para editar o borrar", "Appui long pour modifier ou supprimer")}
                  items={[
                    { label: tr("Edit", "Editar", "Modifier"), icon: <Pencil className="w-4 h-4" />, onSelect: () => { setEditingId(m.id); setEditingText(m.body); } },
                    { label: tr("Delete", "Borrar", "Supprimer"), icon: <Trash2 className="w-4 h-4" />, destructive: true, onSelect: () => { if (window.confirm(tr("Delete this message?", "¿Borrar este mensaje?", "Supprimer ce message ?"))) deleteM.mutate(m.id); } },
                  ]}
                  className={`max-w-[78%] sm:max-w-[68%] rounded-t-[20px] px-4 py-2.5 text-[15px] leading-[1.45] ${
                    mine
                      ? `bg-[var(--ink)]/90 text-[var(--paper)] rounded-bl-[20px] ${lastOfGroup ? "rounded-br-[6px]" : "rounded-br-[20px]"}`
                      : `bg-white text-[var(--ink)] border border-[var(--ink)]/8 shadow-sm rounded-br-[20px] ${lastOfGroup ? "rounded-bl-[6px]" : "rounded-bl-[20px]"}`
                  }`}
                >
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
                        className="w-full bg-[var(--paper)]/15 text-[var(--paper)] rounded-lg p-2 text-base resize-none placeholder:text-[var(--paper)]/50 outline-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => { setEditingId(null); setEditingText(""); }} className="p-1 rounded hover:bg-[var(--paper)]/15" aria-label={tr("Cancel", "Cancelar", "Annuler")}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button type="submit" disabled={editM.isPending} className="p-1 rounded hover:bg-[var(--paper)]/15" aria-label={tr("Save", "Guardar", "Enregistrer")}>
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {m.body}
                      <span className={`ml-2.5 inline-block align-baseline text-[10px] tracking-wide translate-y-[1px] ${mine ? "text-[var(--paper)]/60" : "text-[var(--ink)]/50"}`}>
                        {m.edited_at && <>{tr("edited", "editado", "modifié")} · </>}{time}
                      </span>
                    </p>
                  )}
                </HoldMenu>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendM.mutate(text.trim()); }}
        className="px-3 pt-2 border-t border-[var(--ink)]/8 bg-[var(--paper)] shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)" }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white border border-[var(--ink)]/12 shadow-sm pl-4 pr-1.5 py-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={messages.length === 0 ? t("chat.placeholder") : tr("Message", "Mensaje", "Message")}
            className="flex-1 min-w-0 bg-transparent text-base outline-none placeholder:text-[var(--ink)]/45"
            aria-label={tr("Message", "Mensaje", "Message")}
          />
          <button
            type="submit"
            disabled={!text.trim() || sendM.isPending}
            className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-[var(--ink)] text-[var(--paper)] transition-opacity disabled:opacity-30"
            aria-label={tr("Send", "Enviar", "Envoyer")}
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
          </button>
        </div>
      </form>
    </ChatFrame>
  );
}
