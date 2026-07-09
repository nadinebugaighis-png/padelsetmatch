import { useEffect, useState, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { listMyNotifications, markNotificationsRead, drainPushOutbox } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/i18n";

export function NotificationBell() {
  const tr = useTr();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const drain = useServerFn(drainPushOutbox);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("notifications-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Opportunistic drain
  useEffect(() => {
    const tick = () => { drain().catch(() => {}); };
    tick();
    const id = setInterval(tick, 25_000);
    return () => clearInterval(id);
  }, [drain]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const items = q.data?.items ?? [];
  const unread = q.data?.unread ?? 0;

  const openItem = async (id: string, url: string | null) => {
    await markRead({ data: { ids: [id] } });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    setOpen(false);
    if (url) navigate({ to: url as string });
  };

  const markAll = async () => {
    await markRead({ data: {} });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={tr("Notifications", "Notificaciones", "Notifications")}
        className="relative w-8 h-8 flex items-center justify-center text-[var(--ink)]/70 hover:text-[var(--ink)]"
      >
        <Bell className="w-5 h-5" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--plum)] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px] bg-[var(--paper)] border border-[var(--ink)]/15 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--ink)]/10">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/70 font-semibold">
              {tr("Notifications", "Notificaciones", "Notifications")}
            </span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11px] text-[var(--plum)] hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> {tr("Mark all read", "Marcar todo leído", "Tout marquer lu")}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--ink)]/60">
                {tr("You're all caught up.", "Estás al día.", "Tu es à jour.")}
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n.id, n.url)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--ink)]/5 hover:bg-[var(--paper-2)] transition ${!n.read_at ? "bg-[var(--plum)]/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--plum)] shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--ink)] font-semibold truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-[var(--ink)]/70 mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] text-[var(--ink)]/50 mt-1 uppercase tracking-wider">
                        {new Date(n.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
