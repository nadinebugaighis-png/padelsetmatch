import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, useTr } from "@/lib/i18n";
import { photoSrc } from "@/lib/photo-src";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { deleteSlotMessage, listSlotMessages, sendSlotMessage } from "@/lib/who-can-play.functions";
import type { PlaySlot } from "@/lib/who-can-play";

type Props = {
  area: string;
  date: string;
  slot: PlaySlot;
  /** Pinned at the top: day · part of the day · area. */
  pinned: string;
  canWrite: boolean;
  onJoin: () => void;
  joining: boolean;
};

/** WhatsApp-style chat for one area, day and part of the day on "Who can play?". */
export function SlotChat({ area, date, slot, pinned, canWrite, onJoin, joining }: Props) {
  const tr = useTr();
  const { label } = useI18n();
  const qc = useQueryClient();
  const list = useServerFn(listSlotMessages);
  const send = useServerFn(sendSlotMessage);
  const del = useServerFn(deleteSlotMessage);
  const [body, setBody] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const key = ["slot-chat", area, date, slot] as const;
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: { area, date, slot } }), staleTime: 15_000 });
  const messages = q.data?.messages ?? [];

  useEffect(() => {
    const channel = supabase
      .channel(`slot-chat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "play_slot_messages" }, (payload) => {
        const row = (payload.new ?? {}) as { area_key?: string; play_date?: string; slot?: string };
        if (payload.eventType === "INSERT" && (row.area_key !== area || row.play_date !== date || row.slot !== slot)) return;
        qc.invalidateQueries({ queryKey: ["slot-chat", area, date, slot] });
        qc.invalidateQueries({ queryKey: ["play-checkins"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [area, date, slot, qc]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (text: string) => send({ data: { area, date, slot, body: text } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["play-checkins"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["play-checkins"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const submit = () => {
    const text = body.trim();
    if (text && !sendMut.isPending) sendMut.mutate(text);
  };
  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mt-3.5 rounded-xl border border-[var(--ink)]/10 bg-[var(--paper)] overflow-hidden">
      <div className="px-3.5 py-2 border-b border-[var(--ink)]/10 bg-white text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/60 truncate capitalize">
        {pinned}
      </div>
      <div ref={scroller} className="max-h-72 sm:max-h-96 overflow-y-auto px-3 py-3 space-y-2">
        {q.isLoading ? (
          <div className="h-10 rounded-lg bg-[var(--ink)]/5 animate-pulse" />
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-[var(--ink)]/55">
            {tr("Agree the hour, the club and who brings the fourth.", "Acordad la hora, el club y quién trae al cuarto.", "Mettez-vous d'accord sur l'heure, le club et le quatrième.")}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`group flex items-end gap-2 ${m.mine ? "justify-end" : "justify-start"}`}>
              {!m.mine && (
                <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden bg-[var(--ink)]/10">
                  <PlayerPhoto src={photoSrc(m.sender.photo_url, 240)} seed={m.sender.id} alt={m.sender.first_name ?? ""} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-[14px] leading-snug ${m.mine ? "bg-[var(--ink)] text-[var(--paper)] rounded-br-md" : "bg-white text-[var(--ink)] border border-[var(--ink)]/10 rounded-bl-md"}`}>
                {!m.mine && (
                  <div className="text-[11px] font-semibold text-[var(--pitch)] mb-0.5">
                    {m.sender.first_name ?? tr("Player", "Jugador", "Joueur")}
                    {m.sender.level ? <span className="font-normal text-[var(--ink)]/50 capitalize"> · {label(m.sender.level)}</span> : null}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className={`mt-0.5 flex items-center justify-end gap-2 text-[10px] ${m.mine ? "text-[var(--paper)]/60" : "text-[var(--ink)]/45"}`}>
                  {m.mine && (
                    <button type="button" aria-label={tr("Delete message", "Borrar mensaje", "Supprimer le message")} onClick={() => delMut.mutate(m.id)} className="opacity-70 hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {time(m.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {canWrite ? (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-2 border-t border-[var(--ink)]/10 bg-white p-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={1}
            placeholder={tr("Message", "Mensaje", "Message")}
            aria-label={tr("Message", "Mensaje", "Message")}
            className="flex-1 resize-none max-h-28 rounded-2xl border border-[var(--ink)]/15 bg-[var(--paper)] px-3.5 py-2 text-[16px] sm:text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none focus:border-[var(--ink)]/40"
          />
          <button
            type="submit"
            disabled={!body.trim() || sendMut.isPending}
            aria-label={tr("Send", "Enviar", "Envoyer")}
            className="shrink-0 w-10 h-10 rounded-full grid place-items-center bg-[var(--ink)] text-[var(--paper)] disabled:opacity-40"
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--ink)]/10 bg-white px-3.5 py-2.5">
          <p className="text-[12px] text-[var(--ink)]/60">{tr("Free at this time? Join to write.", "¿Libre a esta hora? Únete para escribir.", "Libre à cette heure ? Rejoins pour écrire.")}</p>
          <button type="button" disabled={joining} onClick={onJoin} className="shrink-0 h-8 px-4 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold disabled:opacity-50">
            {tr("Me too", "Yo también", "Moi aussi")}
          </button>
        </div>
      )}
    </div>
  );
}
