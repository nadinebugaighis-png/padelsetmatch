import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveMyPushSubscription, getVapidPublicKey } from "@/lib/notifications.functions";
import { pushSupported, subscribeToPush } from "@/lib/push-client";
import { useTr } from "@/lib/i18n";
import { toast } from "sonner";

const DISMISS_KEY = "notif-banner-dismissed-v1";

export function EnableNotificationsBanner() {
  const tr = useTr();
  const save = useServerFn(saveMyPushSubscription);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch { /* ignore */ }
    setShow(true);
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!key) { toast.error("Push not configured"); return; }
      const sub = await subscribeToPush(key);
      if (!sub) {
        toast.error(tr("Notifications blocked", "Notificaciones bloqueadas", "Notifications bloquées"));
        return;
      }
      await save({ data: { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: navigator.userAgent } });
      toast.success(tr("Notifications enabled", "Notificaciones activadas", "Notifications activées"));
      setShow(false);
    } catch (e) {
      console.warn(e);
      toast.error(tr("Could not enable notifications", "No se pudo activar", "Impossible d'activer"));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="border-b border-[var(--ink)]/10 bg-[var(--plum)]/8">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-2.5 flex items-center gap-3">
        <Bell className="w-4 h-4 text-[var(--plum)] shrink-0" />
        <div className="flex-1 min-w-0 text-sm text-[var(--ink)]">
          {tr(
            "Turn on notifications to hear from matches, coaches and messages instantly.",
            "Activa las notificaciones para enterarte al instante de matches, coaches y mensajes.",
            "Active les notifications pour être averti·e des matchs, coachs et messages.",
          )}
        </div>
        <button
          onClick={enable}
          disabled={busy}
          className="rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 shrink-0 disabled:opacity-60"
        >
          {tr("Enable", "Activar", "Activer")}
        </button>
        <button onClick={dismiss} aria-label="dismiss" className="text-[var(--ink)]/50 hover:text-[var(--ink)] shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
