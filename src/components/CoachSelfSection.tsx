import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { setCoachFlag } from "@/lib/coach.functions";
import { useTr } from "@/lib/i18n";

export function CoachSelfSection({ isCoach }: { isCoach: boolean; profileId?: string }) {
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

  return (
    <div className="programme-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--plum)]/12 flex items-center justify-center text-[var(--plum)] shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-serif text-lg tracking-tight text-[var(--ink)]">{tr("Padel coach", "Entrenador de pádel", "Coach de padel")}</h2>
            <p className="text-xs text-[var(--ink)]/60 mt-0.5">
              {tr(
                "Turn this on if you also coach. A coach badge shows on your profile.",
                "Actívalo si también entrenas. Aparecerá un distintivo de entrenador en tu perfil.",
                "Active si tu donnes aussi des cours. Un badge de coach s'affichera sur ton profil.",
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${isCoach ? "bg-[var(--plum)]" : "bg-[var(--ink)]/20"}`}
          aria-label="Toggle coach"
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${isCoach ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </div>
  );
}
