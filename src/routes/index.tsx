import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { findMatches } from "@/lib/match.functions";
import {
  GENDERS,
  MADRID_ZONES,
  PADEL_LEVELS,
  PRIORITY_TRAITS,
  type Gender,
  type MadridZone,
  type PadelLevel,
  type PriorityTrait,
  type Profile,
} from "@/lib/types";
import type { Candidate, RankedMatch } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Court at Dusk — anonymous padel matchmaking in Madrid" },
      {
        name: "description",
        content:
          "Find your best padel match in Madrid. Anonymous handles, AI compatibility, Playtomic to book the court.",
      },
      { property: "og:title", content: "Court at Dusk — anonymous padel matchmaking in Madrid" },
      {
        property: "og:description",
        content: "People who play together stay together. Anonymous-first padel + dating, Madrid only.",
      },
    ],
  }),
  component: App,
});

const NATIONALITIES = [
  "Spain", "Portugal", "Italy", "France", "Germany", "United Kingdom",
  "Argentina", "Mexico", "Colombia", "Brazil", "United States", "Other",
];

const AVATARS = ["🎾", "🔥", "🌙", "🌿", "✨", "🪐", "🍒", "⚡", "🧊", "🌊", "🍋", "🐍"];

type Step = "intro" | "you" | "priorities" | "matches";

function App() {
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<Profile>({
    handle: "",
    avatar: "🎾",
    gender: "woman",
    age: 30,
    ageMin: 27,
    ageMax: 38,
    interestedIn: ["man"],
    nationality: "Spain",
    zone: "Chamberí",
    level: "intermediate",
    priorities: [],
    bio: "",
  });
  const [matches, setMatches] = useState<(RankedMatch & { candidate: Candidate })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMatch, setOpenMatch] = useState<(RankedMatch & { candidate: Candidate }) | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const findMatchesFn = useServerFn(findMatches);

  async function runMatch() {
    if (profile.priorities.length < 3) {
      setError("Rank at least 3 priorities first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await findMatchesFn({ data: profile });
      setMatches(res.matches);
      setStep("matches");
    } catch (e: any) {
      setError(e?.message || "Couldn't find matches. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header step={step} onReset={() => { setStep("intro"); setMatches([]); }} />
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8">
        {step === "intro" && <Intro onStart={() => setStep("you")} />}
        {step === "you" && (
          <YouStep
            profile={profile}
            setProfile={setProfile}
            onNext={() => setStep("priorities")}
          />
        )}
        {step === "priorities" && (
          <PrioritiesStep
            profile={profile}
            setProfile={setProfile}
            onBack={() => setStep("you")}
            onFind={runMatch}
            loading={loading}
            error={error}
          />
        )}
        {step === "matches" && (
          <MatchesStep
            matches={matches}
            profile={profile}
            onOpen={(m) => setOpenMatch(m)}
          />
        )}
      </div>
      <Footer />
      {openMatch && (
        <MatchModal
          match={openMatch}
          revealed={!!revealed[openMatch.id]}
          onReveal={() => setRevealed((r) => ({ ...r, [openMatch.id]: true }))}
          onClose={() => setOpenMatch(null)}
        />
      )}
    </main>
  );
}

/* ---------------------------- Header / Footer ---------------------------- */

function Header({ step, onReset }: { step: Step; onReset: () => void }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <button onClick={onReset} className="flex items-center gap-2">
        <span className="ball-glow inline-block h-3 w-3 rounded-full" style={{ background: "var(--ball)" }} />
        <span className="text-display text-xl tracking-widest">COURT AT DUSK</span>
      </button>
      <div className="hidden items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:flex">
        <span>Madrid · v1</span>
        <span className="chip chip-ball">Anonymous</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)] md:px-8">
      People who play together — stay together.
    </footer>
  );
}

/* -------------------------------- Intro --------------------------------- */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative mt-4 grid gap-10 md:mt-10 md:grid-cols-[1.2fr_0.8fr] md:gap-16">
      <div>
        <p className="chip mb-6">Madrid · invite only beta</p>
        <h1 className="text-display text-[clamp(3.2rem,9vw,7rem)] leading-[0.9]">
          FIND YOUR BEST<br />
          <span style={{ color: "var(--ball)" }}>PADEL</span> MATCH.
          <br />
          <span style={{ color: "var(--clay)" }}>NOT YOUR FACE.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
          Anonymous handles. No photos. Dating-grade compatibility — age, culture,
          neighborhood, and what you actually rank highest in a person — used to
          rank Madrid padel partners you'd genuinely click with on court. Identity
          unlocks only if you both want to play.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            onClick={onStart}
            className="text-display rounded-full bg-[var(--clay)] px-8 py-4 text-xl tracking-widest text-[var(--cream)] transition hover:brightness-110"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            ENTER THE COURT →
          </button>
          <span className="text-xs uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
            Takes 90 seconds
          </span>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          {[
            ["01", "Build an anonymous profile"],
            ["02", "Rank what matters to you"],
            ["03", "AI ranks Madrid players + book on Playtomic"],
          ].map(([n, t]) => (
            <li key={n} className="surface-card p-4">
              <span className="text-display text-3xl" style={{ color: "var(--ball)" }}>{n}</span>
              <p className="mt-1 text-[var(--cream)]/90">{t}</p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="surface-card relative overflow-hidden p-6 md:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-70 blur-3xl"
             style={{ background: "var(--clay)" }} />
        <p className="chip chip-clay">Sample match</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl text-3xl"
               style={{ background: "var(--court-deep)" }}>🌙</div>
          <div>
            <p className="text-display text-2xl">BANDEJABEA</p>
            <p className="text-sm text-[var(--muted-foreground)]">31 · Italy · Malasaña · intermediate</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-display text-4xl" style={{ color: "var(--ball)" }}>92</p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Match</p>
          </div>
        </div>
        <p className="mt-5 border-l-2 pl-4 text-sm italic text-[var(--cream)]/90"
           style={{ borderColor: "var(--clay)" }}>
          "She'll outlast you in rallies and outlaugh you afterward — Malasaña
          to Chamberí is a 12-minute walk, no excuses."
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="chip">Shared: funny</span>
          <span className="chip">Shared: adventurous</span>
          <span className="chip">Level: both intermediate</span>
        </div>
      </aside>
    </section>
  );
}

/* ------------------------------ Step: You ------------------------------- */

function YouStep({
  profile, setProfile, onNext,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onNext: () => void;
}) {
  const valid = profile.handle.trim().length >= 2 && profile.interestedIn.length >= 1;
  return (
    <section className="mt-2 grid gap-8">
      <StepHeader n="01" title="WHO ARE YOU — ANONYMOUSLY" />
      <div className="surface-card grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <Field label="Pick a handle (no real names)">
          <input
            className="w-full rounded-lg bg-[var(--court-deep)] px-4 py-3 text-lg outline-none ring-1 ring-[var(--border)] focus:ring-[var(--clay)]"
            placeholder="e.g. SmashSerena"
            value={profile.handle}
            maxLength={28}
            onChange={(e) => setProfile({ ...profile, handle: e.target.value })}
          />
        </Field>
        <Field label="Pick an avatar (no photos, ever)">
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setProfile({ ...profile, avatar: a })}
                className={`grid h-12 w-12 place-items-center rounded-xl text-2xl transition ${
                  profile.avatar === a ? "ring-2 ring-[var(--ball)]" : "ring-1 ring-[var(--border)]"
                }`}
                style={{ background: "var(--court-deep)" }}
                aria-label={`avatar ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>

        <Field label="You are">
          <Segmented
            options={GENDERS as readonly Gender[]}
            value={profile.gender}
            onChange={(v) => setProfile({ ...profile, gender: v })}
          />
        </Field>
        <Field label="Interested in (for matching)">
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => {
              const on = profile.interestedIn.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => {
                    const next = on
                      ? profile.interestedIn.filter((x) => x !== g)
                      : [...profile.interestedIn, g];
                    setProfile({ ...profile, interestedIn: next });
                  }}
                  className={`chip ${on ? "chip-clay" : ""}`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={`Your age — ${profile.age}`}>
          <input
            type="range" min={18} max={70} value={profile.age}
            onChange={(e) => setProfile({ ...profile, age: +e.target.value })}
            className="w-full accent-[var(--clay)]"
          />
        </Field>
        <Field label={`Preferred age range — ${profile.ageMin} to ${profile.ageMax}`}>
          <div className="flex items-center gap-3">
            <input
              type="range" min={18} max={70} value={profile.ageMin}
              onChange={(e) => setProfile({ ...profile, ageMin: Math.min(+e.target.value, profile.ageMax) })}
              className="w-full accent-[var(--clay)]"
            />
            <input
              type="range" min={18} max={70} value={profile.ageMax}
              onChange={(e) => setProfile({ ...profile, ageMax: Math.max(+e.target.value, profile.ageMin) })}
              className="w-full accent-[var(--clay)]"
            />
          </div>
        </Field>

        <Field label="Background / nationality">
          <Select
            value={profile.nationality}
            onChange={(v) => setProfile({ ...profile, nationality: v })}
            options={NATIONALITIES}
          />
        </Field>
        <Field label="Your Madrid zone">
          <Select
            value={profile.zone}
            onChange={(v) => setProfile({ ...profile, zone: v as MadridZone })}
            options={MADRID_ZONES as readonly string[]}
          />
        </Field>

        <Field label="Padel level (doesn't matter — be honest)">
          <Segmented
            options={PADEL_LEVELS as readonly PadelLevel[]}
            value={profile.level}
            onChange={(v) => setProfile({ ...profile, level: v })}
          />
        </Field>
        <Field label="One anonymous line about your game (optional)">
          <input
            className="w-full rounded-lg bg-[var(--court-deep)] px-4 py-3 outline-none ring-1 ring-[var(--border)] focus:ring-[var(--clay)]"
            placeholder="Lob is lethal, backhand needs work."
            value={profile.bio}
            maxLength={120}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          disabled={!valid}
          onClick={onNext}
          className="text-display rounded-full bg-[var(--clay)] px-8 py-3 text-lg tracking-widest text-[var(--cream)] transition disabled:opacity-40"
        >
          NEXT → RANK YOUR PRIORITIES
        </button>
      </div>
    </section>
  );
}

/* -------------------------- Step: Priorities ---------------------------- */

function PrioritiesStep({
  profile, setProfile, onBack, onFind, loading, error,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  onBack: () => void;
  onFind: () => void;
  loading: boolean;
  error: string | null;
}) {
  const ranked = profile.priorities;
  const unranked = useMemo(
    () => PRIORITY_TRAITS.filter((p) => !ranked.includes(p)),
    [ranked],
  );

  function add(p: PriorityTrait) {
    if (ranked.length >= 7) return;
    setProfile({ ...profile, priorities: [...ranked, p] });
  }
  function remove(p: PriorityTrait) {
    setProfile({ ...profile, priorities: ranked.filter((x) => x !== p) });
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...ranked];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setProfile({ ...profile, priorities: next });
  }

  return (
    <section className="mt-2 grid gap-8">
      <StepHeader n="02" title="WHAT MATTERS — RANKED" />
      <p className="-mt-4 max-w-2xl text-[var(--muted-foreground)]">
        Tap to add (top = most important). Drag-feel ordering with the arrows.
        Pick 3–7. The AI weighs these heavily.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface-card p-6">
          <p className="chip chip-ball mb-4">Your top priorities</p>
          {ranked.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Nothing picked yet — tap traits on the right.</p>
          ) : (
            <ol className="space-y-2">
              {ranked.map((p, i) => (
                <li
                  key={p}
                  className="flex items-center gap-3 rounded-lg bg-[var(--court-deep)] px-3 py-2"
                >
                  <span className="text-display w-8 text-2xl" style={{ color: "var(--ball)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-lg capitalize">{p}</span>
                  <button onClick={() => move(i, -1)} className="chip" aria-label="up">▲</button>
                  <button onClick={() => move(i, 1)} className="chip" aria-label="down">▼</button>
                  <button onClick={() => remove(p)} className="chip" aria-label="remove">✕</button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="surface-card p-6">
          <p className="chip mb-4">Tap to add</p>
          <div className="flex flex-wrap gap-2">
            {unranked.map((p) => (
              <button
                key={p}
                onClick={() => add(p)}
                className="chip transition hover:bg-[var(--clay)] hover:text-[var(--cream)]"
              >
                + {p}
              </button>
            ))}
            {unranked.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">All traits ranked. Remove to swap.</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-[var(--destructive)]/20 px-4 py-3 text-sm text-[var(--cream)]">{error}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="chip">← Back</button>
        <button
          disabled={loading || ranked.length < 3}
          onClick={onFind}
          className="text-display rounded-full bg-[var(--clay)] px-10 py-4 text-xl tracking-widest text-[var(--cream)] transition disabled:opacity-40"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          {loading ? "FINDING YOUR COURT…" : "FIND MY PADEL MATCHES →"}
        </button>
      </div>
    </section>
  );
}

/* ---------------------------- Step: Matches ----------------------------- */

function MatchesStep({
  matches, profile, onOpen,
}: {
  matches: (RankedMatch & { candidate: Candidate })[];
  profile: Profile;
  onOpen: (m: RankedMatch & { candidate: Candidate }) => void;
}) {
  return (
    <section className="mt-2 grid gap-8">
      <StepHeader n="03" title="YOUR MADRID COURT" />
      <p className="-mt-4 max-w-2xl text-[var(--muted-foreground)]">
        Ranked by compatibility for {profile.handle || "you"}. Anonymous until you both want to play —
        tap any card for the AI's take + book the court on Playtomic.
      </p>

      {matches.length === 0 ? (
        <p className="surface-card p-8 text-center">
          No mutual matches in the seeded Madrid pool — try widening your age
          range or interests.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m, idx) => (
            <MatchCard key={m.id} m={m} rank={idx + 1} onOpen={() => onOpen(m)} />
          ))}
        </div>
      )}
    </section>
  );
}

function MatchCard({
  m, rank, onOpen,
}: {
  m: RankedMatch & { candidate: Candidate };
  rank: number;
  onOpen: () => void;
}) {
  const c = m.candidate;
  return (
    <button
      onClick={onOpen}
      className="surface-card group relative overflow-hidden p-5 text-left transition hover:-translate-y-1 hover:ring-1 hover:ring-[var(--clay)]"
    >
      <div className="absolute right-0 top-0 px-3 py-1 text-[10px] uppercase tracking-widest"
           style={{ background: "var(--clay)", color: "var(--cream)" }}>
        #{rank}
      </div>
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-xl text-2xl"
             style={{ background: "var(--court-deep)" }}>
          {c.avatar}
        </div>
        <div className="flex-1">
          <p className="text-display text-2xl">{c.handle.toUpperCase()}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {c.age} · {c.nationality} · {c.zone}
          </p>
        </div>
        <div className="text-right">
          <p className="text-display text-4xl leading-none" style={{ color: "var(--ball)" }}>
            {m.score}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Match</p>
        </div>
      </div>

      <p className="mt-4 border-l-2 pl-3 text-sm italic text-[var(--cream)]/90"
         style={{ borderColor: "var(--clay)" }}>
        "{m.blurb}"
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="chip">{c.level}</span>
        {m.reasons.slice(0, 2).map((r) => (
          <span key={r} className="chip">{r}</span>
        ))}
      </div>
    </button>
  );
}

/* ------------------------------ Match Modal ----------------------------- */

function MatchModal({
  match, revealed, onReveal, onClose,
}: {
  match: RankedMatch & { candidate: Candidate };
  revealed: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  const c = match.candidate;
  const playtomicUrl = `https://playtomic.io/search?sport_id=PADEL&location=${encodeURIComponent(c.zone + ", Madrid")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--court-deep)]/80 p-4 backdrop-blur-sm"
         onClick={onClose}>
      <div
        className="surface-card relative w-full max-w-lg p-6 md:p-8"
        style={{ boxShadow: "var(--shadow-court)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="chip absolute right-4 top-4">✕ close</button>

        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-2xl text-4xl"
               style={{ background: "var(--court-deep)" }}>{c.avatar}</div>
          <div>
            <p className="text-display text-4xl">{c.handle.toUpperCase()}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {c.age} · {c.nationality} · {c.zone} · padel {c.level}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-display text-5xl" style={{ color: "var(--ball)" }}>{match.score}</p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Match</p>
          </div>
        </div>

        {c.bio && (
          <p className="mt-5 rounded-lg bg-[var(--court-deep)] px-4 py-3 text-sm">
            <span className="mr-2 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Their line</span>
            {c.bio}
          </p>
        )}

        <p className="mt-5 border-l-2 pl-4 italic text-[var(--cream)]/95"
           style={{ borderColor: "var(--clay)" }}>
          "{match.blurb}"
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {match.reasons.map((r) => (
            <span key={r} className="chip">{r}</span>
          ))}
          {c.priorities.slice(0, 4).map((p) => (
            <span key={p} className="chip">values: {p}</span>
          ))}
        </div>

        <div className="mt-7 rounded-xl border border-dashed border-[var(--clay)]/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Identity unlock
          </p>
          {revealed ? (
            <p className="mt-2 text-sm">
              You've signaled interest. On the live app, their real name + photo
              unlock only after they tap "let's play" too. (Demo: imagine the
              reveal moment here.)
            </p>
          ) : (
            <button
              onClick={onReveal}
              className="text-display mt-2 rounded-full bg-[var(--ball)] px-6 py-2 text-base tracking-widest text-[var(--court-deep)]"
            >
              I'D LIKE TO PLAY THIS PERSON
            </button>
          )}
        </div>

        <a
          href={playtomicUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-display mt-5 block w-full rounded-full bg-[var(--clay)] px-6 py-4 text-center text-lg tracking-widest text-[var(--cream)]"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          BOOK A COURT NEAR {c.zone.toUpperCase()} ON PLAYTOMIC →
        </a>
        <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          People who play together — stay together.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Bits ---------------------------------- */

function StepHeader({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-display text-[clamp(2.4rem,6vw,4.5rem)] leading-none">
        <span style={{ color: "var(--ball)" }}>{n}</span> {title}
      </h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full bg-[var(--court-deep)] p-1 ring-1 ring-[var(--border)]">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition ${
            value === o ? "bg-[var(--clay)] text-[var(--cream)]" : "text-[var(--muted-foreground)] hover:text-[var(--cream)]"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-[var(--court-deep)] px-4 py-3 text-base outline-none ring-1 ring-[var(--border)] focus:ring-[var(--clay)]"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
