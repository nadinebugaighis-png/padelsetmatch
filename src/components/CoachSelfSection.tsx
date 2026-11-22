import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { setCoachFlag } from "@/lib/coach.functions";
import { useTr } from "@/lib/i18n";

export function CoachSelfSection({ isCoach, showLink = true }: { isCoach: boolean; profileId?: string; showLink?: boolean }) {
  const tr = useTr();
  const qc = useQueryClient();
  const setFlag = useServerFn(setCoachFlag);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await setFlag({ data: { is_coach: !isCoach } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success(!isCoach ? tr("Coach mode on", "Modo entrenador activado", "Mode coach activé") : tr("Coach mode off", "Modo entrenador desactivado", "Mode coach désactivé"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  // Same look as the free court box just above it.
  return (
    <div className="rounded-xl border border-[var(--cream)]/30 bg-[var(--cream)]/5 p-3 mt-2">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={isCoach} disabled={busy} onChange={toggle} className="accent-[var(--cream)] mt-0.5" />
        <span>
          <span className="font-semibold">{tr("I'm a padel coach", "Soy entrenador de pádel", "Je suis coach de padel")}</span>
          <span className="block text-xs text-[var(--ink)]/70 mt-0.5">
            {isCoach
              ? tr("Your lessons and requests are under Coaching on your Me page.", "Tus clases y solicitudes están en Entrenador, en tu página Yo.", "Tes cours et demandes sont dans Coaching, sur ta page Moi.")
              : tr("Share your lesson times so players can book you, private or in a small group.", "Publica tus horas para que los jugadores te reserven, en privado o en grupo pequeño.", "Partage tes horaires pour que les joueurs te réservent, en privé ou en petit groupe.")}
          </span>
        </span>
      </label>
      {isCoach && showLink && (
        <Link to="/app/coach" className="mt-2 inline-block text-[13px] font-medium text-[var(--plum)] underline underline-offset-4">
          {tr("Open coaching", "Abrir panel de entrenador", "Ouvrir l'espace coach")}
        </Link>
      )}
    </div>
  );
}
