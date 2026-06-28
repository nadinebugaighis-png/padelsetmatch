import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchDetail, sendMessage, blockProfile, reportProfile } from "@/lib/app.functions";
import { playtomicLink } from "@/lib/affinity";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, Send, Flag, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/matches/$matchId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t, label } = useI18n();
  const getDetail = useServerFn(getMatchDetail);
  const send = useServerFn(sendMessage);
  const block = useServerFn(blockProfile);
  const report = useServerFn(reportProfile);

  const q = useQuery({ queryKey: ["match", matchId], queryFn: () => getDetail({ data: { matchId } }) });
  const [text, setText] = useState("");
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [q.data?.messages.length]);

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

  if (q.isLoading || !q.data) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">{t("chat.opening")}</div>;
  const { other, my_profile_id, messages } = q.data;

  const onBlock = () => {
    if (!window.confirm(t("disc.blockConfirm", { name: other.first_name }))) return;
    blockM.mutate(other.id);
  };
  const onReport = () => {
    const reason = window.prompt(t("disc.reportPrompt", { name: other.first_name }));
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm(t("disc.reportConfirm", { name: other.first_name }))) return;
    reportM.mutate({ id: other.id, reason: reason.trim() });
  };

  return (
    <main className="max-w-md mx-auto flex flex-col h-[calc(100vh-150px)]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--cream)]/10">
        <Link to="/app/matches" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--cream)]/10 shrink-0">
          {other.photo_url && <img src={other.photo_url} alt={other.first_name} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-display text-xl leading-none">{other.first_name}, {other.age}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60">{other.zone} · {label(other.level)}</div>
        </div>
        <button onClick={onBlock} title={t("chat.block")} aria-label={t("chat.block")} className="p-1.5 rounded-full hover:bg-[var(--cream)]/10">
          <Shield className="w-4 h-4" />
        </button>
        <button onClick={onReport} title={t("chat.report")} aria-label={t("chat.report")} className="p-1.5 rounded-full hover:bg-red-600/30">
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--cream)]/60 mt-10">
            {t("chat.empty")}
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_profile_id === my_profile_id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-[var(--ball)] text-[var(--court-deep)]" : "bg-[var(--cream)]/10 text-[var(--cream)]"}`}>
                {m.body}
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
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("chat.placeholder")} />
        <Button type="submit" size="icon" disabled={!text.trim() || sendM.isPending}><Send className="w-4 h-4" /></Button>
      </form>
    </main>
  );
}
