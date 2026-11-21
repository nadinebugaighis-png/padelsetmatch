import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";
import { openLessonChat } from "@/lib/coach-lessons.functions";

/** Small pill on a confirmed lesson that opens the coach and player's private chat. */
export function LessonMessageButton({ slotId }: { slotId: string }) {
  const tr = useTr();
  const navigate = useNavigate();
  const open = useServerFn(openLessonChat);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (busy) return;
    setBusy(true);
    try {
      const { matchId } = await open({ data: { slotId } });
      await navigate({ to: "/app/matches/$matchId", params: { matchId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("Could not open the chat", "No se pudo abrir el chat", "Impossible d'ouvrir la conversation"));
    } finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={go} disabled={busy}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[var(--pitch)]/35 px-3 text-[12.5px] font-medium text-[var(--pitch)] disabled:opacity-60">
      <MessageCircle className="size-3.5" />{tr("Message", "Mensaje", "Message")}
    </button>
  );
}
