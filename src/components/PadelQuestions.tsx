import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { submitQaAnswer } from "@/lib/app.functions";
import { useI18n, useTr } from "@/lib/i18n";
import { dailyQuestionFor, todayKey, unlockQuestions, UNLOCK_MIN_ANSWERS, type CuratedQuestion } from "@/lib/daily-questions";

function useSaveAnswer() {
  const qc = useQueryClient();
  const submit = useServerFn(submitQaAnswer);
  return useMutation({
    mutationFn: (v: { q: CuratedQuestion; answer: string }) =>
      submit({ data: { question: v.q.q.en, category: v.q.category, answer: v.answer } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-answers"] });
      qc.invalidateQueries({ queryKey: ["ai-compat"] });
    },
    onError: () => toast.error("Couldn't save — try again"),
  });
}

function Chips({ q, onPick, disabled }: { q: CuratedQuestion; onPick: (en: string) => void; disabled: boolean }) {
  const { lang } = useI18n();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {q.options.map((opt) => (
        <button
          key={opt.en}
          type="button"
          disabled={disabled}
          onClick={() => onPick(opt.en)}
          className="rounded-full border border-[var(--ink)]/15 bg-[var(--paper)] px-3 py-1.5 text-[12.5px] text-[var(--ink)] hover:bg-[var(--ink)]/[0.06] active:scale-[0.97] transition disabled:opacity-50"
        >
          {opt[lang] ?? opt.en}
        </button>
      ))}
    </div>
  );
}

const DISMISS_KEY = "psm-daily-q";

/** One question at the top of the Grid; gone for the rest of the day once answered. */
export function DailyQuestionCard({ answered }: { answered: string[] | undefined }) {
  const tr = useTr();
  const { lang } = useI18n();
  const save = useSaveAnswer();
  const [doneToday, setDoneToday] = useState(true);
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    try { setDoneToday(localStorage.getItem(DISMISS_KEY) === todayKey()); } catch { setDoneToday(false); }
  }, []);
  if (!answered || (doneToday && !thanks)) return null;
  const q = dailyQuestionFor(new Set(answered));
  if (!q && !thanks) return null;
  if (thanks) {
    return (
      <div className="mt-4 rounded-xl border border-[var(--ink)]/10 bg-white px-4 py-3 text-[13px] text-[var(--ink)]/75">
        {tr("Noted. See you tomorrow for the next one 🎾", "Anotado. Mañana, otra 🎾", "Noté. À demain pour la suivante 🎾")}
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-[var(--ink)]/10 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55">{tr("Question of the day", "Pregunta del día", "Question du jour")}</div>
      <div className="mt-1 text-[15px] font-medium text-[var(--ink)] leading-snug">{q!.q[lang] ?? q!.q.en}</div>
      <Chips q={q!} disabled={save.isPending} onPick={(answer) => save.mutate({ q: q!, answer }, {
        onSuccess: () => {
          try { localStorage.setItem(DISMISS_KEY, todayKey()); } catch { /* ignore */ }
          setThanks(true);
          setTimeout(() => { setThanks(false); setDoneToday(true); }, 2500);
        },
      })} />
      <p className="mt-2 flex items-center gap-1 text-[10.5px] text-[var(--ink)]/45">
        <Lock className="w-3 h-3" />
        {tr("Private. Never posted, only used to find players who suit you.", "Privado. Nunca se publica, solo sirve para encontrar jugadores afines.", "Privé. Jamais publié, sert uniquement à trouver des joueurs qui te correspondent.")}
      </p>
    </div>
  );
}

/** Shown on a player card when the viewer has fewer than 3 answers. */
export function UnlockMatchQuestions({ answered }: { answered: string[] }) {
  const tr = useTr();
  const { lang } = useI18n();
  const save = useSaveAnswer();
  const remaining = Math.max(0, UNLOCK_MIN_ANSWERS - answered.length);
  const [q] = unlockQuestions(new Set(answered), 1);
  if (!q) return null;
  const step = UNLOCK_MIN_ANSWERS - remaining + 1;
  return (
    <div>
      <p className="text-[14px] font-medium text-[var(--ink)] leading-snug">
        {tr(`Answer ${remaining} quick question${remaining === 1 ? "" : "s"} to see how you two would play together.`,
          `Responde ${remaining} pregunta${remaining === 1 ? "" : "s"} rápida${remaining === 1 ? "" : "s"} y verás cómo jugaríais juntos.`,
          `Réponds à ${remaining} question${remaining === 1 ? "" : "s"} rapide${remaining === 1 ? "" : "s"} pour voir comment vous joueriez ensemble.`)}
      </p>
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: UNLOCK_MIN_ANSWERS }).map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < step - 1 ? "bg-[var(--ink)]" : "bg-[var(--ink)]/12"}`} />
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
