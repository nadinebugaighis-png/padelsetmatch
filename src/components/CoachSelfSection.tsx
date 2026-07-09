import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Star, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setCoachFlag, listMyCoachEndorsements, respondCoachEndorsement, getCoachStats } from "@/lib/coach.functions";
import { useTr } from "@/lib/i18n";

export function CoachSelfSection({ isCoach, profileId }: { isCoach: boolean; profileId: string }) {
  const tr = useTr();
  const qc = useQueryClient();
  const setFlag = useServerFn(setCoachFlag);
  const listEnd = useServerFn(listMyCoachEndorsements);
  const respond = useServerFn(respondCoachEndorsement);
  const getStats = useServerFn(getCoachStats);

  const [busy, setBusy] = useState(false);

  const endorsementsQ = useQuery({
    queryKey: ["my-endorsements"],
    queryFn: () => listEnd(),
    enabled: isCoach,
  });
  const statsQ = useQuery({
    queryKey: ["coach-stats", profileId],
    queryFn: () => getStats({ data: { coach_profile_id: profileId } }),
    enabled: isCoach,
  });

  const respondM = useMutation({
    mutationFn: async (args: { id: string; approve: boolean }) => respond({ data: { endorsement_id: args.id, approve: args.approve } }),
    onSuccess: (_, args) => {
      toast.success(args.approve ? tr("Endorsement approved", "Valoración aprobada", "Avis approuvé") : tr("Endorsement declined", "Valoración rechazada", "Avis refusé"));
      qc.invalidateQueries({ queryKey: ["my-endorsements"] });
      qc.invalidateQueries({ queryKey: ["coach-stats", profileId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

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

  const pending = (endorsementsQ.data ?? []).filter((e) => e.status === "pending");
  const stats = statsQ.data;

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
              {isCoach
                ? tr("A coach badge shows on your profile. Students can send anonymous reviews you must approve.", "Se muestra un distintivo de entrenador. Los alumnos pueden enviar valoraciones anónimas que debes aprobar.", "Un badge de coach s'affiche. Les élèves peuvent envoyer des avis anonymes à approuver.")
                : tr("Turn this on if you also coach. You'll get a coach badge on your profile.", "Actívalo si también entrenas. Aparecerá un distintivo en tu perfil.", "Active si tu coaches aussi. Un badge de coach s'affichera.")}
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

      {isCoach && (
        <>
          {stats && stats.count > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--ink)]/85">
              <Star className="w-4 h-4 fill-[var(--ink)] text-[var(--ink)]" />
              <strong>{Number(stats.average).toFixed(1)}</strong>
              <span className="text-[var(--ink)]/60">· {stats.count} {tr(stats.count === 1 ? "verified review" : "verified reviews", stats.count === 1 ? "opinión verificada" : "opiniones verificadas", stats.count === 1 ? "avis vérifié" : "avis vérifiés")}</span>
            </div>
          )}

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-widest text-[var(--ink)]/60 mb-2 font-medium">
              {tr("Pending endorsements", "Valoraciones pendientes", "Avis en attente")}
            </div>
            {endorsementsQ.isLoading ? (
              <div className="text-xs text-[var(--ink)]/50">…</div>
            ) : pending.length === 0 ? (
              <p className="text-xs text-[var(--ink)]/55">{tr("No pending requests. Students who tap 'I was coached' on your profile will appear here.", "Sin solicitudes pendientes. Aparecerán aquí cuando alguien pulse 'Me entrenó' en tu perfil.", "Aucune demande. Ceux qui cliquent 'M'a coaché' apparaîtront ici.")}</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ink)]/10 bg-white/60 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${e.stars && n <= e.stars ? "fill-[var(--ink)] text-[var(--ink)]" : "text-[var(--ink)]/25"}`} />
                        ))}
                      </div>
                      {e.comment && <p className="mt-1 text-[12px] text-[var(--ink)]/80 italic leading-snug line-clamp-3">"{e.comment}"</p>}
                      <p className="mt-1 text-[10px] text-[var(--ink)]/45 uppercase tracking-widest">{tr("Anonymous student", "Alumno anónimo", "Élève anonyme")}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" disabled={respondM.isPending} onClick={() => respondM.mutate({ id: e.id, approve: false })} aria-label="Decline">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" disabled={respondM.isPending} onClick={() => respondM.mutate({ id: e.id, approve: true })} aria-label="Approve">
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
