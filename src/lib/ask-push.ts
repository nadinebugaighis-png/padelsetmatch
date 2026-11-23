import { toast } from "sonner";
import { saveMyPushSubscription, getVapidPublicKey } from "@/lib/notifications.functions";
import { pushSupported, subscribeToPush } from "@/lib/push-client";

type Tr = (en: string, es: string, fr: string) => string;
const ASKED_KEY = "push-asked-after-match-v1";

/**
 * Ask for notifications once, right after a player joins or creates a match,
 * instead of a permanent banner on every screen.
 */
export function askForPushAfterMatch(tr: Tr) {
  if (typeof window === "undefined" || !pushSupported()) return;
  if (Notification.permission !== "default") return;
  try {
    if (localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, "1");
  } catch { return; }
  window.setTimeout(() => {
    toast(tr("Want a ping when players join?", "¿Te avisamos cuando se unan jugadores?", "On te prévient quand des joueurs rejoignent ?"), {
      duration: 12000,
      description: tr("Only for your matches and messages.", "Solo para tus partidos y mensajes.", "Seulement pour tes matchs et messages."),
      action: {
        label: tr("Turn on", "Activar", "Activer"),
        onClick: async () => {
          try {
            const { key } = await getVapidPublicKey();
            if (!key) return;
            const sub = await subscribeToPush(key);
            if (!sub) return;
            await saveMyPushSubscription({ data: { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: navigator.userAgent } });
            toast.success(tr("Notifications on", "Notificaciones activadas", "Notifications activées"));
          } catch { /* ignore */ }
        },
      },
    });
  }, 2500);
}
