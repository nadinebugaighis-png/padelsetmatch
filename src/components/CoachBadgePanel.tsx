import { GraduationCap } from "lucide-react";
import { useTr } from "@/lib/i18n";

export function CoachBadgePanel({ coachName }: { coachName: string }) {
  const tr = useTr();

  return (
    <div className="rounded-2xl border border-[var(--plum)]/25 bg-[var(--plum)]/[0.04] p-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[var(--plum)]/12 flex items-center justify-center text-[var(--plum)]">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-[var(--ink)]">{tr("Padel coach", "Entrenador de pádel", "Coach de padel")}</div>
          <div className="text-[11px] text-[var(--ink)]/60">
            {tr(`${coachName} also coaches padel.`, `${coachName} también entrena a otros jugadores.`, `${coachName} donne aussi des cours de padel.`)}
          </div>
        </div>
      </div>
    </div>
  );
}
