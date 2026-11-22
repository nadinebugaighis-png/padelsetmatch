import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
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

  const title = tr("I'm a padel coach", "Soy entrenador de pádel", "Je suis coach de padel");
  // Same row look as "I have free court access" just above it.
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex w-8 justify-center shrink-0">
            <GraduationCap className="h-5 w-5 fill-[var(--plum)]/25 text-[var(--plum)]/60" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] text-[var(--ink)] leading-tight">{title}</div>
            <div className="text-[12px] text-[var(--ink)]/68 mt-0.5">
              {isCoach
                ? tr("Lessons and requests are under Coaching on Me.", "Clases y solicitudes en Entrenador, en Yo.", "Cours et demandes dans Coaching, sur Moi.")
                : tr("Players can book lessons with you", "Los jugadores pueden reservar clases contigo", "Les joueurs peuvent réserver des cours")}
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isCoach}
          aria-label={title}
          onClick={toggle}
          disabled={busy}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${isCoach ? "bg-[var(--ink)]" : "bg-[var(--ink)]/15"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[var(--card)] shadow-sm transition-transform ${isCoach ? "translate-x-5" : ""}`} />
        </button>
      </div>
      {isCoach && showLink && (
        <Link to="/app/coach" className="mt-2 inline-block text-[13px] font-medium text-[var(--plum)] underline underline-offset-4">
          {tr("Open coaching", "Abrir panel de entrenador", "Ouvrir l'espace coach")}
        </Link>
      )}
    </div>
  );
}
