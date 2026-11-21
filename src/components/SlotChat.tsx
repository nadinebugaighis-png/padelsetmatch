import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, useTr } from "@/lib/i18n";
import { photoSrc } from "@/lib/photo-src";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteSlotMessage, editSlotMessage, listSlotMessages, sendSlotMessage } from "@/lib/who-can-play.functions";
import type { PlaySlot } from "@/lib/who-can-play";

type Props = {
  area: string;
  date: string;
  slot: PlaySlot;
  canWrite: boolean;
  onJoin: () => void;
  joining: boolean;
};

/** WhatsApp-style chat for one area, day and part of the day on "Who can play?". */
export function SlotChat({ area, date, slot, canWrite, onJoin, joining }: Props) {
  const tr = useTr();
  const { label } = useI18n();
  const qc = useQueryClient();
  const list = useServerFn(listSlotMessages);
  const send = useServerFn(sendSlotMessage);
  const edit = useServerFn(editSlotMessage);
  const del = useServerFn(deleteSlotMessage);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["play-checkins"] });
  };
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Error");

  const sendMut = useMutation({
    mutationFn: (text: string) =>
      editingId ? edit({ data: { id: editingId, body: text } }) : send({ data: { area, date, slot, body: text } }),
    onSuccess: () => { setBody(""); setEditingId(null); refresh(); },
    onError: fail,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: refresh,
    onError: fail,
  });

  const submit = () => {
    const text = body.trim();
    if (text && !sendMut.isPending) sendMut.mutate(text);
  };
  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setBody(text);
    setTimeout(() => input.current?.focus(), 50);
  };
  const cancelEdit = () => { setEditingId(null); setBody(""); };
  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const meta = (m: (typeof messages)[number]) => (
    <span className="ml-2 inline-flex translate-y-1 items-center gap-1 whitespace-nowrap text-[10.5px] text-[var(--ink)]/45 float-right">
      {m.edited_at && tr("edited", "editado", "modifié")}
      {" "}{time(m.created_at)}
    </span>
  );

  return (
    <div className="mt-3 -mx-4 -mb-4 rounded-b-2xl bg-[var(--paper)] overflow-hidden">
      <div ref={scroller} className="max-h-80 sm:max-h-96 overflow-y-auto px-3 py-3 space-y-1.5">
        {q.isLoading ? (
          <div className="h-10 rounded-lg bg-[var(--ink)]/5 animate-pulse" />
        ) : messages.length === 0 ? (
          <p className="py-3 text-center text-[12.5px] text-[var(--ink)]/50">
            {tr("Agree the hour, the club and who brings the fourth.", "Acordad la hora, el club y quién trae al cuarto.", "Mettez-vous d'accord sur l'heure, le club et le quatrième.")}
          </p>
        ) : (
          messages.map((m) =>
            m.mine ? (
              <div key={m.id} className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`max-w-[80%] text-left rounded-lg rounded-tr-sm bg-[var(--club-soft)] px-2.5 py-1.5 text-[14.5px] leading-snug text-[var(--ink)] shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] outline-none ${editingId === m.id ? "ring-2 ring-[var(--pitch)]/40" : ""}`}
                    >
                      <span className="whitespace-pre-wrap break-words">{m.body}</span>
                      {meta(m)}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-36 bg-white text-[var(--ink)] border-[var(--ink)]/10">
                    <DropdownMenuItem onSelect={() => startEdit(m.id, m.body)}>
                      <Pencil className="w-4 h-4" />{tr("Edit", "Editar", "Modifier")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { if (editingId === m.id) cancelEdit(); delMut.mutate(m.id); }} className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4" />{tr("Delete", "Borrar", "Supprimer")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div key={m.id} className="flex items-end gap-1.5">
                <div className="w-6 h-6 shrink-0 rounded-full overflow-hidden bg-[var(--ink)]/10">
                  <PlayerPhoto src={photoSrc(m.sender.photo_url, 240)} seed={m.sender.id} alt={m.sender.first_name ?? ""} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="max-w-[80%] rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5 text-[14.5px] leading-snug text-[var(--ink)] shadow-[0_1px_0.5px_rgba(0,0,0,0.08)]">
                  <div className="text-[12px] font-semibold text-[var(--pitch)]">
                    {m.sender.first_name ?? tr("Player", "Jugador", "Joueur")}
                    {m.sender.level ? <span className="font-normal text-[var(--ink)]/45 capitalize"> · {label(m.sender.level)}</span> : null}
                  </div>
                  <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  {meta(m)}
                </div>
              </div>
            ),
          )
        )}
      </div>
      {canWrite ? (
        <div className="px-2 pb-2">
          {editingId && (
            <div className="mb-1 flex items-center justify-between px-2 text-[12px] text-[var(--ink)]/60">
              <span className="inline-flex items-center gap-1.5"><Pencil className="w-3 h-3" />{tr("Editing message", "Editando mensaje", "Modification du message")}</span>
              <button type="button" onClick={cancelEdit} aria-label={tr("Cancel", "Cancelar", "Annuler")} className="p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-1.5">
            <textarea
              ref={input}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                if (e.key === "Escape" && editingId) cancelEdit();
              }}
              rows={1}
              placeholder={tr("Message", "Mensaje", "Message")}
              aria-label={tr("Message", "Mensaje", "Message")}
              className="flex-1 resize-none max-h-28 rounded-3xl bg-white px-4 py-2.5 text-[16px] sm:text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 outline-none shadow-[0_1px_0.5px_rgba(0,0,0,0.08)]"
            />
            <button
              type="submit"
              disabled={!body.trim() || sendMut.isPending}
              aria-label={editingId ? tr("Save", "Guardar", "Enregistrer") : tr("Send", "Enviar", "Envoyer")}
              className="shrink-0 w-11 h-11 rounded-full grid place-items-center bg-[var(--pitch)] text-[var(--paper)] disabled:opacity-40"
            >
              {editingId ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 px-3 pb-3">
          <p className="text-[12px] text-[var(--ink)]/55">{tr("Free at this time? Join to write.", "¿Libre a esta hora? Únete para escribir.", "Libre à cette heure ? Rejoins pour écrire.")}</p>
          <button type="button" disabled={joining} onClick={onJoin} className="shrink-0 h-8 px-4 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold disabled:opacity-50">
            {tr("Me too", "Yo también", "Moi aussi")}
          </button>
        </div>
      )}
    </div>
  );
}
