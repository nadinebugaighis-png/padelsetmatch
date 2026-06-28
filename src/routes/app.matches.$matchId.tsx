import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatchDetail, sendMessage } from "@/lib/app.functions";
import { playtomicLink } from "@/lib/affinity";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/matches/$matchId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = Route.useParams();
  const qc = useQueryClient();
  const getDetail = useServerFn(getMatchDetail);
  const send = useServerFn(sendMessage);

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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send"),
  });

  if (q.isLoading || !q.data) return <div className="px-4 py-10 text-center text-[var(--cream)]/60">Opening chat…</div>;
  const { other, my_profile_id, messages } = q.data;

  return (
    <main className="max-w-md mx-auto flex flex-col h-[calc(100vh-150px)]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--cream)]/10">
        <Link to="/app/matches" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--cream)]/10 shrink-0">
          {other.photo_url && <img src={other.photo_url} alt={other.first_name} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-display text-xl leading-none">{other.first_name}, {other.age}</div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60">{other.zone} · {other.level}</div>
        </div>
        <a href={playtomicLink(other.zone)} target="_blank" rel="noreferrer" className="chip chip-ball">
          Playtomic <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--cream)]/60 mt-10">
            You both tapped. Say hi 👋
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
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cuándo jugamos?" />
        <Button type="submit" size="icon" disabled={!text.trim() || sendM.isPending}><Send className="w-4 h-4" /></Button>
      </form>
    </main>
  );
}
