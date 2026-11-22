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

  // One quiet line: most players ignore it, coaches flip it once.
  return (
    <div>
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={isCoach}
        className="flex w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-60">
        <span className="text-[14px] text-[var(--ink)]/75">{tr("I'm a padel coach", "Soy entrenador de pádel", "Je suis coach de padel")}</span>
        <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${isCoach ? "bg-[var(--plum)]" : "bg-[var(--ink)]/20"}`}>
          <span className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-[var(--paper)] transition-transform ${isCoach ? "translate-x-4" : ""}`} />
        </span>
      </button>
      {isCoach && showLink && (
        <Link to="/app/coach" className="text-[13px] font-medium text-[var(--plum)] underline underline-offset-4">
          {tr("Open coaching", "Abrir panel de entrenador", "Ouvrir l'espace coach")}
        </Link>
      )}
    </div>
  );
}
