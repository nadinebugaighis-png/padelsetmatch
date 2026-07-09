import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { endorseCoach, getCoachStats, getMyEndorsementFor, openCoachChat } from "@/lib/coach.functions";
import { useTr } from "@/lib/i18n";

export function CoachEndorsePanel({ coachProfileId, coachName }: { coachProfileId: string; coachName: string }) {
  const tr = useTr();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getStats = useServerFn(getCoachStats);
  const getMine = useServerFn(getMyEndorsementFor);
  const endorse = useServerFn(endorseCoach);
  const openChat = useServerFn(openCoachChat);

  const message = useMutation({
    mutationFn: async () => openChat({ data: { coach_profile_id: coachProfileId } }),
    onSuccess: (res) => {
      navigate({ to: "/app/matches/$matchId", params: { matchId: res.match_id } });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : tr("Could not open chat", "No se pudo abrir el chat", "Impossible d'ouvrir le chat")),
  });

  const statsQ = useQuery({
    queryKey: ["coach-stats", coachProfileId],
    queryFn: () => getStats({ data: { coach_profile_id: coachProfileId } }),
  });
  const mineQ = useQuery({
    queryKey: ["coach-mine", coachProfileId],
    queryFn: () => getMine({ data: { coach_profile_id: coachProfileId } }),
  });

  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState<number>(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async () => endorse({ data: { coach_profile_id: coachProfileId, stars, comment: comment || null } }),
    onSuccess: () => {
      toast.success(tr("Endorsement sent — waiting for the coach to confirm.", "Valoración enviada — a la espera de que el entrenador la confirme.", "Avis envoyé — en attente de la confirmation du coach."));
      setOpen(false);
      setStars(0);
      setComment("");
      qc.invalidateQueries({ queryKey: ["coach-mine", coachProfileId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const stats = statsQ.data;
  const mine = mineQ.data;

  return (
    <div className="rounded-2xl border border-[var(--plum)]/25 bg-[var(--plum)]/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--plum)]/12 flex items-center justify-center text-[var(--plum)]">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--ink)]">{tr("Padel coach", "Entrenador de pádel", "Coach de padel")}</div>
            {stats && stats.count > 0 ? (
              <div className="text-[11px] text-[var(--ink)]/70 flex items-center gap-1">
                <Star className="w-3 h-3 fill-[var(--ink)] text-[var(--ink)]" />
                {Number(stats.average).toFixed(1)} · {stats.count} {tr(stats.count === 1 ? "verified review" : "verified reviews", stats.count === 1 ? "opinión verificada" : "opiniones verificadas", stats.count === 1 ? "avis vérifié" : "avis vérifiés")}
              </div>
            ) : (
              <div className="text-[11px] text-[var(--ink)]/55">{tr("No verified reviews yet", "Aún sin opiniones verificadas", "Pas encore d'avis vérifié")}</div>
            )}
          </div>
        </div>

        {mine?.status === "approved" ? (
          <span className="text-[10px] uppercase tracking-widest text-[var(--grass)] font-bold">{tr("You endorsed", "Ya lo valoraste", "Vous avez validé")}</span>
        ) : mine?.status === "pending" ? (
          <span className="text-[10px] uppercase tracking-widest text-[var(--ink)]/60 font-bold">{tr("Pending", "Pendiente", "En attente")}</span>
        ) : mine?.status === "rejected" ? (
          <span className="text-[10px] uppercase tracking-widest text-[var(--ink)]/40 font-bold">{tr("Not confirmed", "No confirmado", "Non confirmé")}</span>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            {tr("I was coached", "Me entrenó", "M'a coaché")}
          </Button>
        )}
      </div>

      <button
        type="button"
        disabled={message.isPending}
        onClick={() => message.mutate()}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold bg-[var(--plum)]/12 hover:bg-[var(--plum)]/20 text-[var(--plum)] border border-[var(--plum)]/25 transition disabled:opacity-60"
      >
        <MessageCircle className="w-4 h-4" />
        {message.isPending ? "…" : tr(`Message ${coachName}`, `Enviar mensaje a ${coachName}`, `Envoyer un message à ${coachName}`)}
      </button>



      {open && !mine && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] text-[var(--ink)]/70">
            {tr(`Rate ${coachName}. Anonymous — only shows once ${coachName} confirms they coached you.`, `Valora a ${coachName}. Anónimo — solo se publica cuando ${coachName} confirme que te entrenó.`, `Note ${coachName}. Anonyme — publié uniquement après confirmation par ${coachName}.`)}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setStars(n)} className="p-1" aria-label={`${n} stars`}>
                <Star className={`w-5 h-5 ${n <= stars ? "fill-[var(--ink)] text-[var(--ink)]" : "text-[var(--ink)]/35"}`} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder={tr("Optional — a short anonymous note", "Opcional — una nota corta anónima", "Facultatif — un court avis anonyme")}
            className="min-h-[70px] text-sm"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{tr("Cancel", "Cancelar", "Annuler")}</Button>
            <Button type="button" size="sm" disabled={stars < 1 || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? "…" : tr("Send", "Enviar", "Envoyer")}
            </Button>
          </div>
        </div>
      )}

      {stats && stats.comments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {stats.comments.slice(0, 3).map((c, i) => (
            <div key={i} className="rounded-xl bg-white/60 border border-[var(--ink)]/8 p-2.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-3 h-3 ${n <= c.stars ? "fill-[var(--ink)] text-[var(--ink)]" : "text-[var(--ink)]/25"}`} />
                ))}
              </div>
              <p className="mt-1 text-[12px] text-[var(--ink)]/80 italic leading-snug">"{c.comment}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
