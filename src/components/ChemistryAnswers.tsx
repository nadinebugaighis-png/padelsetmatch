import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { getMyQaAnswers } from "@/lib/app.functions";
import { useI18n, useTr } from "@/lib/i18n";
import { CURATED_QUESTIONS, curatedAnswerMap, type CuratedQuestion } from "@/lib/daily-questions";
import { useSaveAnswer } from "@/components/PadelQuestions";

export const CHEMISTRY_TOTAL = CURATED_QUESTIONS.length;

/** Saved curated answers plus answers given in this visit, keyed by English question. */
export function useChemistryAnswers() {
  const getAnswers = useServerFn(getMyQaAnswers);
  const q = useQuery({ queryKey: ["qa-answers"], queryFn: () => getAnswers(), staleTime: 5 * 60_000 });
  return { query: q, saved: curatedAnswerMap(q.data ?? []) };
}

function OptionChips({ q, selected, disabled, onPick }: {
  q: CuratedQuestion; selected?: string; disabled: boolean; onPick: (en: string) => void;
}) {
  const { lang } = useI18n();
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {q.options.map((opt) => {
        const on = opt.en === selected;
        return (
          <button
            key={opt.en}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => !on && onPick(opt.en)}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] transition active:scale-[0.97] disabled:opacity-50 ${
              on
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                : "border-[var(--ink)]/15 bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--ink)]/[0.06]"
            }`}
          >
            {opt[lang] ?? opt.en}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Self-paced chemistry questions on the Me page: the next unanswered question
 * first, then every past answer, which can be changed with one tap.
 * Answers save without a daily slot, so the Grid's morning/evening card is unaffected.
 */
export function ChemistryAnswers() {
  const tr = useTr();
  const { lang } = useI18n();
  const save = useSaveAnswer();
  const { query, saved } = useChemistryAnswers();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  if (query.isPending) return <div className="h-24 rounded-2xl bg-[var(--ink)]/[0.04] animate-pulse" />;
  if (query.isError) return <p className="text-sm text-[var(--ink)]/60">{tr("Couldn't load your answers.", "No se pudieron cargar tus respuestas.", "Impossible de charger tes réponses.")}</p>;

  const answers = new Map(saved);
  for (const [k, v] of Object.entries(local)) answers.set(k, v);
  const count = answers.size;
  const next = CURATED_QUESTIONS.find((q) => !answers.has(q.q.en));
  const answered = CURATED_QUESTIONS.filter((q) => answers.has(q.q.en));

  const pick = (q: CuratedQuestion, answer: string) => {
    const prev = local[q.q.en];
    setLocal((m) => ({ ...m, [q.q.en]: answer }));
    save.mutate({ q, answer }, {
      onSuccess: () => setEditing(null),
      onError: () => setLocal((m) => {
        const copy = { ...m };
        if (prev === undefined) delete copy[q.q.en]; else copy[q.q.en] = prev;
        return copy;
      }),
    });
  };

  return (
    <div className="programme-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] text-[var(--ink)]/65 leading-snug">
          {tr("Answer as you would love to play, not only how you play today. The more you answer, the finer your pairings.",
            "Responde como te gustaría jugar, no solo como juegas hoy. Cuantas más respondas, mejor te emparejamos.",
            "Réponds comme tu aimerais jouer, pas seulement comme tu joues aujourd'hui. Plus tu réponds, plus tes duos sont justes.")}
        </p>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink)]/50 whitespace-nowrap tabular-nums">
          {count} / {CHEMISTRY_TOTAL}
        </span>
      </div>
      <div className="mt-3 h-px w-full bg-[var(--ink)]/10">
        <div className="h-px bg-[var(--gold)] transition-all" style={{ width: `${(count / CHEMISTRY_TOTAL) * 100}%` }} />
      </div>

      {next ? (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]/50">{tr("Next question", "Siguiente pregunta", "Question suivante")}</div>
          <div className="mt-1.5 text-serif text-[19px] leading-snug text-[var(--ink)]">{next.q[lang] ?? next.q.en}</div>
          <OptionChips q={next} disabled={save.isPending} onPick={(a) => pick(next, a)} />
        </div>
      ) : (
        <div className="mt-5 text-center">
          <div className="text-serif text-[19px] text-[var(--ink)]">{tr("Every question answered", "Todas las preguntas respondidas", "Toutes les questions répondues")}</div>
          <p className="mt-1 text-[12.5px] text-[var(--ink)]/60">{tr("Change any answer below whenever you like.", "Cambia cualquier respuesta cuando quieras.", "Modifie une réponse quand tu veux.")}</p>
        </div>
      )}

      {answered.length > 0 && (
        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--ink)]/50">{tr("Your answers", "Tus respuestas", "Tes réponses")}</div>
          <ul className="mt-2 divide-y divide-[var(--ink)]/10 border-t border-[var(--ink)]/10">
            {answered.map((q) => {
              const chosen = answers.get(q.q.en);
              const opt = q.options.find((o) => o.en === chosen);
              const open = editing === q.id;
              return (
                <li key={q.id} className="py-3">
                  <button type="button" onClick={() => setEditing(open ? null : q.id)} aria-expanded={open} className="w-full text-left flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] text-[var(--ink)] leading-snug">{q.q[lang] ?? q.q.en}</span>
                      <span className="block mt-0.5 text-serif italic text-[14px] text-[var(--ink)]/75">{opt ? (opt[lang] ?? opt.en) : chosen}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/45 whitespace-nowrap pt-0.5">
                      {open ? tr("Done", "Listo", "OK") : tr("Change", "Cambiar", "Modifier")}
                    </span>
                  </button>
                  {open && <OptionChips q={q} selected={chosen} disabled={save.isPending} onPick={(a) => pick(q, a)} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 flex items-center gap-1 text-[10.5px] text-[var(--ink)]/45">
        <Lock className="w-3 h-3" />
        {tr("Private. Never posted, only used to find players who suit you.", "Privado. Nunca se publica, solo sirve para encontrar jugadores afines.", "Privé. Jamais publié, sert uniquement à trouver des joueurs qui te correspondent.")}
      </p>
    </div>
  );
}
