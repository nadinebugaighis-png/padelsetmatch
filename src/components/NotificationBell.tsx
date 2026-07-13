import { useEffect, useState, useRef } from "react";
import { Bell, Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { listMyNotifications, markNotificationsRead, drainPushOutbox } from "@/lib/notifications.functions";
import { listMyPendingInvites, respondToMatchInvite } from "@/lib/match-events.functions";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/i18n";

export function NotificationBell() {
  const tr = useTr();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const drain = useServerFn(drainPushOutbox);
  const listInvites = useServerFn(listMyPendingInvites);
  const respondInvite = useServerFn(respondToMatchInvite);
  const [open, setOpen] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invitesQ = useQuery({
    queryKey: ["pending-invites"],
    queryFn: () => listInvites(),
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
      .on("postgres_changes", { event: "*", schema: "public", table: "match_event_invites" }, () => {
        qc.invalidateQueries({ queryKey: ["pending-invites"] });
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
  const invites = (invitesQ.data?.invites ?? []) as Array<{
    id: string;
    event: { id: string; starts_at: string; club_name: string | null; city: string | null; status: string; host: { first_name: string | null } | null } | null;
  }>;
  const activeInvites = invites.filter((i) => i.event && i.event.status === "open");
  const unread = (q.data?.unread ?? 0) + activeInvites.length;

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

  const decideInvite = async (inviteId: string, accept: boolean) => {
    setBusyInvite(inviteId);
    try {
      await respondInvite({ data: { inviteId, accept } });
      toast.success(accept
        ? tr("You're in!", "¡Estás dentro!", "C'est bon !")
        : tr("Invite declined", "Invitación rechazada", "Invitation refusée"));
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tr("Something went wrong", "Algo salió mal", "Erreur"));
    } finally {
      setBusyInvite(null);
    }
  };

  const fmtWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
            {items.length > 0 && (
              <button onClick={markAll} className="text-[11px] text-[var(--plum)] hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> {tr("Mark all read", "Marcar todo leído", "Tout marquer lu")}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {activeInvites.length > 0 && (
              <div className="border-b border-[var(--ink)]/10 bg-[var(--plum)]/5">
                <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--plum)] font-semibold">
                  {tr("Match invites", "Invitaciones", "Invitations")}
                </div>
                {activeInvites.map((inv) => {
                  const ev = inv.event!;
                  const host = ev.host?.first_name ?? tr("Someone", "Alguien", "Quelqu'un");
                  const place = ev.club_name ?? ev.city ?? "";
                  const busy = busyInvite === inv.id;
                  return (
                    <div key={inv.id} className="px-4 py-3 border-t border-[var(--ink)]/5 first:border-t-0">
                      <div className="text-sm text-[var(--ink)] font-semibold">
                        {tr(`${host} invited you`, `${host} te invitó`, `${host} t'a invité·e`)}
                      </div>
                      <div className="text-xs text-[var(--ink)]/70 mt-0.5">
                        {fmtWhen(ev.starts_at)}{place ? ` · ${place}` : ""}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          disabled={busy}
                          onClick={() => decideInvite(inv.id, true)}
                          className="flex-1 py-1.5 rounded-full bg-[var(--plum)] text-white text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> {tr("Accept", "Aceptar", "Accepter")}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => decideInvite(inv.id, false)}
                          className="flex-1 py-1.5 rounded-full border border-[var(--ink)]/25 text-[var(--ink)]/70 text-[11px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" /> {tr("Decline", "Rechazar", "Refuser")}
                        </button>
                      </div>
                      <button
                        onClick={() => { setOpen(false); navigate({ to: "/app/events/$eventId", params: { eventId: ev.id } }); }}
                        className="mt-1.5 text-[10px] text-[var(--ink)]/50 hover:text-[var(--ink)] uppercase tracking-wider"
                      >
                        {tr("View match", "Ver partido", "Voir le match")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {items.length === 0 && activeInvites.length === 0 ? (
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
