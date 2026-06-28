import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Input } from "@/components/ui/input";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/questions")({
  component: QuestionsPage,
});

type Q = { question: string; category: string; options?: string[] };

function QuestionsPage() {
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
      qc.invalidateQueries({ queryKey: ["discover-feed"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-answers"] });
      qc.invalidateQueries({ queryKey: ["discover-feed"] });
    },
  });

  const answered = answersQ.data ?? [];

  return (
    <main className="px-4 py-5 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[var(--ball)]" />
        <h1 className="text-display text-3xl">{t("qa.title")}</h1>
      </div>
      <p className="mt-2 text-sm text-[var(--cream)]/70">{t("qa.sub")}</p>
      <p className="mt-2 text-[11px] text-[var(--cream)]/50">{t("qa.howItWorks")}</p>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--cream)]/70">
        <span>{t("qa.answeredCount", { n: String(answered.length) })}</span>
        <Link to="/app" className="underline text-[var(--ball)]">{t("qa.seeMatches")}</Link>
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
            <div key={q.question} className="surface-card p-4">
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
                        onClick={() => setDraft((d) => ({ ...d, [q.question]: opt }))}
                        className={`chip ${selected ? "bg-[var(--ball)] text-[var(--court-deep)] font-bold" : ""}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <Input
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, [q.question]: e.target.value }))}
                placeholder={t("qa.placeholder")}
                maxLength={400}
                className="mt-3"
              />

              <div className="mt-3 flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQueue((arr) => arr.filter((x) => x.question !== q.question))}
                >
                  {t("qa.skip")}
                </Button>
                <Button
                  size="sm"
                  disabled={!value.trim() || submit.isPending}
                  onClick={() =>
                    submit.mutate({ question: q.question, category: q.category, answer: value.trim() })
                  }
                >
                  {t("qa.save")}
                </Button>
              </div>
            </div>
          );
        })}
        {queue.length === 0 && !generate.isPending && (
          <p className="text-center text-xs text-[var(--cream)]/50 py-6">{t("qa.empty")}</p>
        )}
      </div>

      {answered.length > 0 && (
        <div className="mt-8">
          <h2 className="text-display text-lg tracking-wider mb-2">{t("qa.yourAnswers")}</h2>
          <div className="space-y-2">
            {answered.map((a) => (
              <div key={a.id} className="surface-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--cream)]/50">{a.category}</div>
                    <div className="text-sm text-[var(--cream)]/90">{a.question}</div>
                    <div className="text-sm mt-1 text-[var(--ball)]">{a.answer}</div>
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
    </main>
  );
}
