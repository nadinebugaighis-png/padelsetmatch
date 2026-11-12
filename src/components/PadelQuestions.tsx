import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { submitQaAnswer, getMyQuestionSlot } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { useI18n, useTr } from "@/lib/i18n";
import { dailyQuestionFor, slotKey, shouldShowQuestion, unlockQuestions, UNLOCK_MIN_ANSWERS, type CuratedQuestion } from "@/lib/daily-questions";

function useSaveAnswer() {
  const tr = useTr();
  const qc = useQueryClient();
  const submit = useServerFn(submitQaAnswer);
  return useMutation({
    mutationFn: (v: { q: CuratedQuestion; answer: string; slot?: string }) =>
      submit({ data: { question: v.q.q.en, category: v.q.category, answer: v.answer, slot: v.slot } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-answers"] });
      qc.invalidateQueries({ queryKey: ["ai-compat"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["daily-answer-date"] });
    },
    onError: () => toast.error(tr("Couldn't save. Try again.", "No se pudo guardar. Reintenta.", "Impossible d’enregistrer. Réessaie.")),
  });
}

function Chips({ q, onPick, disabled }: { q: CuratedQuestion; onPick: (en: string) => void; disabled: boolean }) {
  const { lang } = useI18n();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {q.options.map((opt) => (
        <Button
          key={opt.en}
          type="button"
          disabled={disabled}
          onClick={() => onPick(opt.en)}
          className="rounded-full border border-[var(--ink)]/15 bg-[var(--paper)] px-3 py-1.5 text-[12.5px] text-[var(--ink)] hover:bg-[var(--ink)]/[0.06] active:scale-[0.97] transition disabled:opacity-50"
        >
          {opt[lang] ?? opt.en}
        </Button>
      ))}
    </div>
  );
}

const LAST_ANSWER_KEY = "psm-question-last-answered";

/**
 * One question at the top of the Grid. New players get one on every visit
 * until they have 3 answers; regular players get a morning and an evening one.
 */
export function DailyQuestionCard({ answered, profileId }: { answered: string[] | undefined; profileId: string }) {
  const tr = useTr();
  const { lang } = useI18n();
  const save = useSaveAnswer();
  const getSlot = useServerFn(getMyQuestionSlot);
  const slotQ = useQuery({ queryKey: ["daily-answer-date", profileId], queryFn: () => getSlot(), refetchOnWindowFocus: true });
  const [now, setNow] = useState(() => new Date());
  const [lastAnsweredAt, setLastAnsweredAt] = useState<number | null>(null);
  const [answeredSlot, setAnsweredSlot] = useState<string | null>(null);
  // Answers given in this visit, so the next question appears instantly
  // instead of waiting for the saved list to refresh.
  const [justAnswered, setJustAnswered] = useState<string[]>([]);
  // New players answer their first three back to back, then see a short close.
  const [inFlow, setInFlow] = useState(false);
  const [flowClosed, setFlowClosed] = useState(false);
  useEffect(() => {
    try {
      const raw = Number(window.localStorage.getItem(`${LAST_ANSWER_KEY}:${profileId}`));
      if (raw > 0) setLastAnsweredAt(raw);
    } catch { /* storage unavailable */ }
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 15_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [profileId]);
  if (!answered || slotQ.isPending || slotQ.isError) return null;
  const done = new Set([...answered, ...justAnswered]);
  const count = done.size;
  const slot = slotKey(now);
  const isNew = count < UNLOCK_MIN_ANSWERS;

  if (inFlow && !isNew) {
    if (flowClosed) return null;
    return (
      <div className="mt-4 rounded-2xl border border-[var(--gold)]/50 bg-[var(--paper)] px-5 py-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink)]/55">{tr("Complete", "Completado", "Terminé")}</div>
        <div className="mt-2 text-serif text-[22px] leading-tight text-[var(--ink)]">{tr("Your chemistry is revealed", "Tu química ya es visible", "Ta chimie est révélée")}</div>
        <p className="mt-2 text-[13px] text-[var(--ink)]/65 leading-snug">
          {tr("Open any player to see how you would play together.", "Abre cualquier jugador para ver cómo jugaríais juntos.", "Ouvre un profil pour voir comment vous joueriez ensemble.")}
        </p>
        <button type="button" onClick={() => setFlowClosed(true)} className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60 underline underline-offset-4 decoration-[var(--ink)]/20 hover:text-[var(--ink)]">
          {tr("Close", "Cerrar", "Fermer")}
        </button>
      </div>
    );
  }

  if (answeredSlot === slot && !isNew) return null;
  const continuing = inFlow && isNew;
  if (!continuing && !shouldShowQuestion({ answeredCount: count, lastSlot: slotQ.data, lastAnsweredAt, now })) return null;
  const q = dailyQuestionFor(done, now);
  if (!q) return null;
  const evening = slot.endsWith("-pm");
  const step = Math.min(count + 1, UNLOCK_MIN_ANSWERS);

  const onPick = (answer: string) => save.mutate({ q, answer, slot }, {
    onSuccess: () => {
      const at = Date.now();
      setJustAnswered((a) => [...a, q.q.en]);
      if (isNew) setInFlow(true);
      setAnsweredSlot(slot);
      setLastAnsweredAt(at);
      try { window.localStorage.setItem(`${LAST_ANSWER_KEY}:${profileId}`, String(at)); } catch { /* storage unavailable */ }
    },
  });

  if (isNew) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-serif text-[20px] leading-tight text-[var(--ink)]">{tr("Reveal your chemistry", "Descubre tu química", "Révèle ta chimie")}</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/50 whitespace-nowrap tabular-nums">
            {tr(`${step} of ${UNLOCK_MIN_ANSWERS}`, `${step} de ${UNLOCK_MIN_ANSWERS}`, `${step} sur ${UNLOCK_MIN_ANSWERS}`)}
          </div>
        </div>
        <p className="mt-1 text-[12.5px] text-[var(--ink)]/60 leading-snug">
          {tr("Three quick answers, and every profile shows how you would play together.",
            "Tres respuestas rápidas y cada perfil te mostrará cómo jugaríais juntos.",
            "Trois réponses rapides, et chaque profil montre comment vous joueriez ensemble.")}
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: UNLOCK_MIN_ANSWERS }).map((_, i) => (
            <span key={i} className={`h-px flex-1 ${i < count ? "bg-[var(--gold)]" : "bg-[var(--ink)]/15"}`} />
          ))}
        </div>
        <div className="mt-4 text-[15px] font-medium text-[var(--ink)] leading-snug">{q.q[lang] ?? q.q.en}</div>
        <Chips q={q} disabled={save.isPending} onPick={onPick} />
        <p className="mt-3 flex items-center gap-1 text-[10.5px] text-[var(--ink)]/45">
          <Lock className="w-3 h-3" />
          {tr("Private. Never posted, only used to find players who suit you.", "Privado. Nunca se publica, solo sirve para encontrar jugadores afines.", "Privé. Jamais publié, sert uniquement à trouver des joueurs qui te correspondent.")}
        </p>
      </div>
    );
  }

  const title = evening
    ? tr("Evening question", "Pregunta de la tarde", "Question du soir")
    : tr("Morning question", "Pregunta de la mañana", "Question du matin");
  return (
    <div className="mt-4 rounded-xl border border-[var(--ink)]/10 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55">{title}</div>
      <div className="mt-1 text-[15px] font-medium text-[var(--ink)] leading-snug">{q.q[lang] ?? q.q.en}</div>
      <Chips q={q} disabled={save.isPending} onPick={onPick} />
      <p className="mt-2 flex items-center gap-1 text-[10.5px] text-[var(--ink)]/45">
        <Lock className="w-3 h-3" />
        {tr("Private. Never posted, only used to find players who suit you.", "Privado. Nunca se publica, solo sirve para encontrar jugadores afines.", "Privé. Jamais publié, sert uniquement à trouver des joueurs qui te correspondent.")}
      </p>
    </div>
  );
}

/** Shown on a player card when the viewer has fewer than 3 answers. */
export function UnlockMatchQuestions({ answered, name }: { answered: string[]; name?: string }) {
  const tr = useTr();
  const { lang } = useI18n();
  const save = useSaveAnswer();
  const remaining = Math.max(0, UNLOCK_MIN_ANSWERS - answered.length);
  const [q] = unlockQuestions(new Set(answered), 1);
  if (!q) return null;
  const step = UNLOCK_MIN_ANSWERS - remaining + 1;
  return (
    <div>
      <p className="text-serif text-[17px] text-[var(--ink)] leading-snug">
        {name
          ? tr(`Answer ${remaining} quick question${remaining === 1 ? "" : "s"} to reveal your chemistry with ${name}.`,
            `Responde ${remaining} pregunta${remaining === 1 ? "" : "s"} rápida${remaining === 1 ? "" : "s"} y descubre tu química con ${name}.`,
            `Réponds à ${remaining} question${remaining === 1 ? "" : "s"} rapide${remaining === 1 ? "" : "s"} pour révéler ta chimie avec ${name}.`)
          : tr(`Answer ${remaining} quick question${remaining === 1 ? "" : "s"} to see how you two would play together.`,
            `Responde ${remaining} pregunta${remaining === 1 ? "" : "s"} rápida${remaining === 1 ? "" : "s"} y verás cómo jugaríais juntos.`,
            `Réponds à ${remaining} question${remaining === 1 ? "" : "s"} rapide${remaining === 1 ? "" : "s"} pour voir comment vous joueriez ensemble.`)}
      </p>
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: UNLOCK_MIN_ANSWERS }).map((_, i) => (
          <span key={i} className={`h-px flex-1 ${i < step - 1 ? "bg-[var(--gold)]" : "bg-[var(--ink)]/15"}`} />
        ))}
      </div>
      <div className="mt-3 text-[13.5px] text-[var(--ink)]">{q.q[lang] ?? q.q.en}</div>
      <Chips q={q} disabled={save.isPending} onPick={(answer) => save.mutate({ q, answer })} />
      <p className="mt-2 flex items-center gap-1 text-[10.5px] text-[var(--ink)]/45">
        <Lock className="w-3 h-3" />
        {tr("Your answers stay private.", "Tus respuestas son privadas.", "Tes réponses restent privées.")}
      </p>
    </div>
  );
}
