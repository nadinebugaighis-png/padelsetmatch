import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  deleteQaAnswer,
  generateQaQuestions,
  getMyQaAnswers,
  submitQaAnswer,
} from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

type Q = { question: string; category: string; options?: string[] };

export function QASection() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  const listFn = useServerFn(getMyQaAnswers);
  const genFn = useServerFn(generateQaQuestions);
  const submitFn = useServerFn(submitQaAnswer);
  const delFn = useServerFn(deleteQaAnswer);

  const answersQ = useQuery({ queryKey: ["qa-answers"], queryFn: () => listFn() });

  const [queue, setQueue] = useState<Q[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const generate = useMutation({
    mutationFn: () => genFn({ data: { count: 5, lang } }),
    onSuccess: (res) => {
      const fresh = (res?.questions ?? []) as Q[];
      if (fresh.length === 0) {
        toast.message(t("qa.empty"));
        return;
      }
      setQueue((prev) => {
        const seen = new Set(prev.map((q) => q.question));
        return [...prev, ...fresh.filter((q) => !seen.has(q.question))];
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });

  const submit = useMutation({
    mutationFn: (v: { question: string; category: string; answer: string }) =>
      submitFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(t("qa.saved"));
      setQueue((q) => q.filter((x) => x.question !== v.question));
      setDraft((d) => {
        const n = { ...d };
        delete n[v.question];
        return n;
      });
      qc.invalidateQueries({ queryKey: ["qa-answers"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-answers"] });
      qc.invalidateQueries({ queryKey: ["discover"] });
    },
  });

  const answered = answersQ.data ?? [];

  return (
    <section className="mt-6 surface-card p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--cream)]" />
        <h2 className="text-display text-2xl">{t("qa.title")}</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--cream)]/70">{t("qa.sub")}</p>
      <p className="mt-2 text-[11px] text-[var(--cream)]/50">{t("qa.howItWorks")}</p>

      <div className="mt-3 text-xs text-[var(--cream)]/70">
        <span>{t("qa.answeredCount", { n: String(answered.length) })}</span>
      </div>

      <div className="mt-4">
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="w-full"
        >
          {generate.isPending
            ? t("qa.generating")
            : queue.length > 0
            ? t("qa.generateMore")
            : t("qa.generate")}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {queue.map((q) => {
          const value = draft[q.question] ?? "";
          return (
            <div key={q.question} className="rounded-xl border border-[var(--cream)]/10 p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50">{q.category}</div>
              <div className="text-sm mt-1 text-[var(--cream)]">{q.question}</div>

              {q.options && q.options.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const selected = value === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, [q.question]: opt }));
                          submit.mutate({ question: q.question, category: q.category, answer: opt });
                        }}
                        disabled={submit.isPending}
                        className={`chip ${selected ? "chip-ball" : ""}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQueue((arr) => arr.filter((x) => x.question !== q.question))}
                >
                  {t("qa.skip")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {answered.length > 0 && (
        <div className="mt-6">
          <h3 className="text-display text-base tracking-wider mb-2">{t("qa.yourAnswers")}</h3>
          <div className="space-y-2">
            {answered.map((a) => (
              <div key={a.id} className="rounded-lg border border-[var(--cream)]/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50">{a.category}</div>
                    <div className="text-sm text-[var(--cream)]/90">{a.question}</div>
                    <div className="text-sm mt-1 text-[var(--cream)]">{a.answer}</div>
                  </div>
                  <button
                    onClick={() => del.mutate(a.id)}
                    className="text-[var(--cream)]/40 hover:text-red-400 p-1"
                    aria-label={t("qa.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
