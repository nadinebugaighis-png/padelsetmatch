import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { generatePadelQuiz } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { GraduationCap, Check, X, Sparkles, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/learn")({
  component: LearnPage,
});

type Q = {
  question: string;
  category: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Level = "beginner" | "intermediate" | "advanced" | "mixed";

const TOPICS = [
  { id: "", en: "Mixed", es: "Variado", ar: "متنوع" },
  { id: "rules & scoring", en: "Rules & scoring", es: "Reglas y puntuación", ar: "القوانين والنقاط" },
  { id: "partner communication & calls", en: "Calls & comms", es: "Voces y comunicación", ar: "النداءات والتواصل" },
  { id: "positioning & tactics", en: "Positioning & tactics", es: "Posición y táctica", ar: "التمركز والتكتيك" },
  { id: "shots: bandeja, víbora, chiquita, globo", en: "Shots & technique", es: "Golpes y técnica", ar: "الضربات والتقنية" },
  { id: "etiquette", en: "Etiquette", es: "Etiqueta", ar: "آداب اللعب" },
];

const LEVELS: { id: Level; en: string; es: string; ar: string }[] = [
  { id: "mixed", en: "Mixed", es: "Variado", ar: "متنوع" },
  { id: "beginner", en: "Beginner", es: "Principiante", ar: "مبتدئ" },
  { id: "intermediate", en: "Intermediate", es: "Intermedio", ar: "متوسط" },
  { id: "advanced", en: "Advanced", es: "Avanzado", ar: "متقدم" },
];

type L = "en" | "es" | "ar";
function pick(l: L, en: string, es: string, ar: string) {
  return l === "ar" ? ar : l === "es" ? es : en;
}

function LearnPage() {
  const { lang } = useI18n();
  const L = (lang as L) ?? "en";
  const genFn = useServerFn(generatePadelQuiz);

  const [topic, setTopic] = useState<string>("");
  const [level, setLevel] = useState<Level>("mixed");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const generate = useMutation({
    mutationFn: () => genFn({ data: { count: 5, lang, topic: topic || undefined, level } }),
    onSuccess: (res) => {
      const fresh = (res?.questions ?? []) as Q[];
      if (fresh.length === 0) {
        toast.message(es ? "No hay preguntas, intenta de nuevo" : "No questions, try again");
        return;
      }
      setQuestions(fresh);
      setPicks({});
      setRevealed({});
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });

  const score = useMemo(() => {
    let s = 0;
    questions.forEach((q, i) => {
      if (revealed[i] && picks[i] === q.correctIndex) s += 1;
    });
    return s;
  }, [questions, picks, revealed]);

  const answeredAll = questions.length > 0 && questions.every((_, i) => revealed[i]);

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-[var(--ball)]" />
        <h1 className="text-display text-3xl">{es ? "Aprende pádel" : "Learn Padel"}</h1>
      </div>
      <p className="mt-2 text-sm text-[var(--cream)]/70">
        {es
          ? "Quiz con IA: reglas, posicionamiento, voces para tu compañero y golpes. Aprende mientras juegas."
          : "AI-powered quiz: rules, positioning, what to call to your partner, and shots. Learn while you play."}
      </p>

      <div className="mt-4 surface-card p-3 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-1.5">
            {es ? "Tema" : "Topic"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.map((t) => (
              <button
                key={t.id || "mixed"}
                type="button"
                onClick={() => setTopic(t.id)}
                className={`chip text-xs ${topic === t.id ? "bg-[var(--ball)] text-[var(--court-deep)] font-bold" : ""}`}
              >
                {es ? t.es : t.en}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50 mb-1.5">
            {es ? "Nivel" : "Level"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                className={`chip text-xs ${level === l.id ? "bg-[var(--ball)] text-[var(--court-deep)] font-bold" : ""}`}
              >
                {es ? l.es : l.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="w-full">
          {generate.isPending ? (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              {es ? "Generando..." : "Generating..."}
            </>
          ) : questions.length > 0 ? (
            <>
              <RefreshCw className="w-4 h-4" />
              {es ? "Nuevo quiz" : "New quiz"}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {es ? "Empezar quiz" : "Start quiz"}
            </>
          )}
        </Button>
      </div>

      {questions.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--cream)]/70">
          <span>
            {es ? "Respondidas" : "Answered"}: {Object.keys(revealed).length}/{questions.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[var(--ball)]" />
            {score}/{questions.length}
          </span>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {questions.map((q, i) => {
          const pick = picks[i];
          const isRevealed = !!revealed[i];
          return (
            <div key={i} className="surface-card p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50">
                {q.category} · {i + 1}/{questions.length}
              </div>
              <div className="text-sm mt-1 text-[var(--cream)] font-medium">{q.question}</div>

              <div className="mt-3 space-y-2">
                {q.options.map((opt, idx) => {
                  const selected = pick === idx;
                  const correct = idx === q.correctIndex;
                  let cls =
                    "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ";
                  if (!isRevealed) {
                    cls += selected
                      ? "border-[var(--ball)] bg-[var(--ball)]/10 text-[var(--cream)]"
                      : "border-[var(--cream)]/15 text-[var(--cream)]/85 hover:border-[var(--cream)]/40";
                  } else if (correct) {
                    cls += "border-emerald-500/60 bg-emerald-500/10 text-emerald-100";
                  } else if (selected && !correct) {
                    cls += "border-red-500/60 bg-red-500/10 text-red-100";
                  } else {
                    cls += "border-[var(--cream)]/10 text-[var(--cream)]/50";
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isRevealed}
                      onClick={() => {
                        setPicks((p) => ({ ...p, [i]: idx }));
                        setRevealed((r) => ({ ...r, [i]: true }));
                      }}
                      className={cls}
                    >
                      <span className="inline-flex items-center gap-2">
                        {isRevealed && correct && <Check className="w-4 h-4 text-emerald-400" />}
                        {isRevealed && selected && !correct && <X className="w-4 h-4 text-red-400" />}
                        <span>{opt}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {isRevealed && (
                <div className="mt-3 rounded-lg bg-[var(--cream)]/5 border border-[var(--cream)]/10 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--ball)] mb-1">
                    {pick === q.correctIndex
                      ? es ? "¡Correcto!" : "Correct!"
                      : es ? "Respuesta correcta" : "Correct answer"}
                  </div>
                  {pick !== q.correctIndex && (
                    <div className="text-sm text-emerald-200 mb-1">
                      ✓ {q.options[q.correctIndex]}
                    </div>
                  )}
                  <div className="text-xs text-[var(--cream)]/80 leading-relaxed">{q.explanation}</div>
                </div>
              )}
            </div>
          );
        })}

        {questions.length === 0 && !generate.isPending && (
          <p className="text-center text-xs text-[var(--cream)]/50 py-8">
            {es
              ? "Elige tema y nivel, luego empieza el quiz."
              : "Pick a topic and level, then start the quiz."}
          </p>
        )}

        {answeredAll && (
          <div className="surface-card p-4 text-center">
            <Trophy className="w-6 h-6 text-[var(--ball)] mx-auto" />
            <div className="text-display text-2xl mt-2">
              {score} / {questions.length}
            </div>
            <p className="text-xs text-[var(--cream)]/70 mt-1">
              {es ? "¡Bien hecho! Genera otro quiz para seguir aprendiendo." : "Nice! Generate another quiz to keep learning."}
            </p>
            <Button onClick={() => generate.mutate()} className="mt-3 w-full" disabled={generate.isPending}>
              <RefreshCw className="w-4 h-4" />
              {es ? "Otro quiz" : "Another quiz"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
