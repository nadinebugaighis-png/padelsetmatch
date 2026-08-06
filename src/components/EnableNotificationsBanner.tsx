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
      const { key } = await getVapidPublicKey();
      if (!key) { toast.error("Push not configured"); return; }
      const sub = await subscribeToPush(key);
      if (!sub) {
        // Permission was denied at browser/OS level — the banner can't help
        // any more, so explain where to change it and stop showing it.
        toast.info(
          tr(
            "Notifications are blocked in your browser settings. Allow them for this site, then try again.",
            "Las notificaciones están bloqueadas en los ajustes del navegador. Permítelas para este sitio y vuelve a intentarlo.",
            "Les notifications sont bloquées dans les réglages du navigateur. Autorisez-les pour ce site, puis réessayez.",
          ),
          { duration: 7000 },
        );
        dismiss();
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
    <div className="border-b border-[var(--ink)]/10 bg-[color-mix(in_oklab,var(--plum)_6%,var(--paper))]">
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
        <span className="shrink-0 w-8 h-8 rounded-full border border-[var(--plum)]/25 bg-[var(--paper)] flex items-center justify-center">
          <Bell className="w-4 h-4 text-[var(--plum)]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--ink)]/50">
            {tr("Notifications", "Notificaciones", "Notifications")}
          </div>
          <div className="text-[13px] leading-snug text-[var(--ink)]/85 truncate sm:whitespace-normal">
            {tr(
              "Get pinged when a match, coach or message needs you.",
              "Te avisamos cuando haya un partido, coach o mensaje.",
              "Sois prévenu·e pour un match, un coach ou un message.",
            )}
          </div>
        </div>
        <button
          onClick={enable}
          disabled={busy}
          className="rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] uppercase tracking-widest font-bold px-3.5 py-1.5 shrink-0 disabled:opacity-60 hover:opacity-90 transition"
        >
          {tr("Enable", "Activar", "Activer")}
        </button>
        <button onClick={dismiss} aria-label="dismiss" className="text-[var(--ink)]/40 hover:text-[var(--ink)] shrink-0 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
