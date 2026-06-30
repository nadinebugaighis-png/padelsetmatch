import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Lock, Sparkles } from "lucide-react";
import { LangSwitch, useT } from "@/lib/i18n";
import { saveGuestDraft, loadGuestDraft } from "@/lib/guest-draft";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Try PadelMatch — no signup needed" },
      { name: "description", content: "Browse a sample of players and answer a few quick questions. Create your free account when you're ready to unlock matches." },
    ],
  }),
  component: Preview,
});

const SAMPLE = [
  { src: "/landing/grid1.jpg", name: "Lucía", city: "Madrid" },
  { src: "/landing/grid2.jpg", name: "Marc", city: "Barcelona" },
  { src: "/landing/grid3.jpg", name: "Aisha", city: "Dubai" },
  { src: "/landing/grid4.jpg", name: "Kenji", city: "Tokyo" },
  { src: "/landing/grid2.jpg", name: "Sofía", city: "Madrid" },
  { src: "/landing/grid1.jpg", name: "Noor", city: "London" },
];

const QUESTIONS: { id: string; q: string; options: { label: string; trait: string }[] }[] = [
  {
    id: "q1",
    q: "What matters most in someone you'd play with?",
    options: [
      { label: "They're funny", trait: "funny" },
      { label: "They're loyal", trait: "loyalty" },
      { label: "They're competitive", trait: "competitive" },
      { label: "They're kind", trait: "kindness" },
    ],
  },
  {
    id: "q2",
    q: "Your padel level?",
    options: [
      { label: "Beginner", trait: "beginner" },
      { label: "Intermediate", trait: "intermediate" },
      { label: "Advanced", trait: "advanced" },
      { label: "Competitive", trait: "competitive" },
    ],
  },
  {
    id: "q3",
    q: "What are you mainly here for?",
    options: [
      { label: "A partner", trait: "partner" },
      { label: "New friends", trait: "friend" },
      { label: "Both, open to either", trait: "both" },
    ],
  },
];

function Preview() {
  const t = useT();
  const navigate = useNavigate();
  const existing = loadGuestDraft();
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const a: Record<string, string> = {};
    if (existing?.priorities?.[0]) a.q1 = existing.priorities[0];
    if (existing?.level) a.q2 = existing.level;
    if (existing?.looking_for) a.q3 = existing.looking_for;
    return a;
  });

  const answeredCount = Object.keys(answers).length;
  const matchCount = answeredCount === 0 ? 0 : 3 + answeredCount * 4; // playful teaser

  const pick = (qid: string, trait: string) => {
    const next = { ...answers, [qid]: trait };
    setAnswers(next);
    saveGuestDraft({
      priorities: next.q1 ? [next.q1] : [],
      level: (next.q2 as "beginner" | "intermediate" | "advanced" | "competitive" | undefined) ?? undefined,
      looking_for: (next.q3 as "partner" | "friend" | "both" | undefined) ?? undefined,
    });
  };

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[var(--ball)] ball-glow" />
          <span className="text-display text-2xl tracking-wider">PADEL · MATCH</span>
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Link to="/auth" className="chip chip-ball">{t("land.signin")}</Link>
        </div>
      </header>

      <section className="px-6 lg:px-16 py-6">
        <p className="chip chip-clay mb-3">No account needed yet</p>
        <h1 className="text-display text-5xl md:text-6xl">Take a quick peek.</h1>
        <p className="mt-3 text-[var(--cream)]/70 max-w-xl">
          Answer a few questions and see a sample of players. Photos and chat unlock when you create your free account.
        </p>
      </section>

      <section className="px-6 lg:px-16 py-4 space-y-5">
        {QUESTIONS.map((qq) => (
          <div key={qq.id} className="surface-card p-5">
            <p className="text-sm uppercase tracking-widest text-[var(--cream)]/60 mb-3">{qq.q}</p>
            <div className="flex flex-wrap gap-2">
              {qq.options.map((opt) => {
                const active = answers[qq.id] === opt.trait;
                return (
                  <button
                    key={opt.trait}
                    onClick={() => pick(qq.id, opt.trait)}
                    className={`rounded-full px-4 py-2 text-sm border transition ${active ? "bg-[var(--ball)] text-[var(--court-deep)] border-[var(--ball)] font-semibold" : "border-[var(--cream)]/25 hover:border-[var(--ball)]/60"}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="px-6 lg:px-16 pt-4 pb-2">
        <div className="surface-card p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--ball)]" />
            <div>
              <div className="text-display text-2xl">
                {matchCount > 0 ? `You have ${matchCount} potential matches` : "Answer a question to see your potential matches"}
              </div>
              <div className="text-xs text-[var(--cream)]/60">Your answers are saved on this device.</div>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-5 py-2.5 hover:opacity-90"
          >
            <Heart className="w-4 h-4" />
            Create free account to unlock
          </button>
        </div>
      </section>

      <section className="px-6 lg:px-16 py-8">
        <p className="text-xs uppercase tracking-widest text-[var(--cream)]/60 mb-3">Sample grid (blurred)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SAMPLE.map((p, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--cream)]/10">
              <img src={p.src} alt="" className="w-full h-full object-cover" style={{ filter: "blur(16px) saturate(1.1)" }} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-7 h-7 text-[var(--ball)] drop-shadow" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-[var(--cream)]">
                <div className="text-display text-xl">{p.name}</div>
                <div className="text-xs opacity-80">{p.city}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link to="/auth" className="inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">
            Create free account to see real photos
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 text-xs text-[var(--cream)]/50 text-center">
        Free. Anonymous browsing. No email required to preview.
      </footer>
    </main>
  );
}
