import { createFileRoute } from "@tanstack/react-router";
import { CourtIcon } from "@/components/CourtIcon";

export const Route = createFileRoute("/preview/player-card")({
  component: PlayerCardPreview,
  head: () => ({
    meta: [
      { title: "Player card preview" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// Sample data — for prototype only
const sample = {
  name: "Sofía",
  age: 31,
  city: "Madrid",
  country: "Spain",
  flags: ["🇪🇸", "🇮🇹"], // nationalities
  photo:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop",
  bio: "Mom of two + one lovely dog 🐶",
  level: "Intermediate",
  side: "Left",
  style: "Strategic",
  rackets: 3,
  sessionsPerWeek: "3–4",
  languages: ["Spanish", "English", "Italian"],
  clubs: ["Padel Nuestro Chamartín", "La Finca Padel"],
  sports: ["Running", "Yoga", "Skiing"],
  partnerTraits: ["Competitive", "Communicator", "Energetic", "Funny", "Fit"],
  freeCourt: true,
  compat: { onCourt: 82, offCourt: 74, blurb: "Both competitive but calm under pressure." },
};

function Chip({ children, tone = "cream" as "cream" | "ball" | "clay" }) {
  const cls =
    tone === "ball"
      ? "bg-[var(--ball)] text-[var(--court-deep)] border-transparent"
      : tone === "clay"
        ? "bg-[var(--clay)] text-[var(--cream)] border-transparent"
        : "bg-[var(--cream)]/10 text-[var(--cream)] border-[var(--cream)]/20";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--cream)]/50 font-semibold">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] uppercase tracking-widest text-[var(--cream)]/60">
          {label}
        </span>
        <span className="text-display text-lg text-[var(--ball)]">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--cream)]/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--clay)] to-[var(--ball)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCardPreview() {
  return (
    <div className="min-h-screen p-4 flex items-start justify-center">
      <div className="w-full max-w-[420px] space-y-4">
        <p className="text-[11px] uppercase tracking-widest text-[var(--cream)]/50 text-center">
          Player card — prototype
        </p>

        {/* THE CARD */}
        <div className="surface-card overflow-hidden">
          {/* Hero photo */}
          <div className="relative">
            <img
              src={sample.photo}
              alt={sample.name}
              className="w-full aspect-[4/5] object-cover"
            />
            {/* Flag pins */}
            <div className="absolute top-3 left-3 flex gap-1">
              {sample.flags.map((f, i) => (
                <span
                  key={i}
                  className="w-8 h-8 rounded-full bg-[var(--cream)] shadow-md flex items-center justify-center text-lg ring-2 ring-white/80"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Free-court badge */}
            {sample.freeCourt && (
              <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
                <CourtIcon className="w-5 h-5 text-black" />
              </div>
            )}

            {/* Name + city over gradient */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-16">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h1 className="text-display text-4xl leading-none text-[var(--cream)]">
                    {sample.name},{" "}
                    <span className="text-[var(--ball)]">{sample.age}</span>
                  </h1>
                  <p className="text-[13px] text-[var(--cream)]/80 mt-1">
                    {sample.city} · {sample.country}
                  </p>
                </div>
                <button className="chip chip-ball text-[10px]">Edit</button>
              </div>
              <p className="text-[13px] text-[var(--cream)]/90 mt-2 italic">
                “{sample.bio}”
              </p>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-4 divide-x divide-[var(--cream)]/10 border-b border-[var(--cream)]/10">
            {[
              { k: "Level", v: sample.level },
              { k: "Side", v: sample.side },
              { k: "Style", v: sample.style },
              { k: "Rackets", v: `×${sample.rackets}` },
            ].map((s) => (
              <div key={s.k} className="p-3 text-center">
                <div className="text-[9px] uppercase tracking-widest text-[var(--cream)]/50">
                  {s.k}
                </div>
                <div className="text-display text-lg text-[var(--cream)] leading-none mt-1">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* Sessions */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[12px] text-[var(--cream)]/70">
              🎾 Plays <b className="text-[var(--cream)]">{sample.sessionsPerWeek}</b>{" "}
              times / week
            </span>
          </div>

          {/* Chip clusters */}
          <div className="px-4 pb-4 space-y-3">
            <Section label="Languages">
              {sample.languages.map((l) => (
                <Chip key={l}>💬 {l}</Chip>
              ))}
            </Section>

            <Section label="Favorite clubs">
              {sample.clubs.map((c) => (
                <Chip key={c} tone="clay">
                  📍 {c}
                </Chip>
              ))}
            </Section>

            <Section label="Other sports">
              {sample.sports.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </Section>

            <Section label="Looking for a partner who is">
              {sample.partnerTraits.map((t) => (
                <Chip key={t} tone="ball">
                  {t}
                </Chip>
              ))}
            </Section>
          </div>

          {/* Compatibility footer */}
          <div className="border-t border-[var(--cream)]/10 bg-[var(--court-deep)]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--cream)]/50 font-semibold">
                Compatibility
              </span>
              <span className="text-display text-2xl text-[var(--ball)]">
                {Math.round((sample.compat.onCourt + sample.compat.offCourt) / 2)}%
              </span>
            </div>
            <Bar label="On court" value={sample.compat.onCourt} />
            <Bar label="Off court" value={sample.compat.offCourt} />
            <p className="text-[12px] text-[var(--cream)]/70 italic">
              “{sample.compat.blurb}”
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 grid grid-cols-2 gap-2">
            <button className="rounded-full py-3 text-sm font-semibold bg-[var(--cream)]/10 text-[var(--cream)] border border-[var(--cream)]/20">
              Message
            </button>
            <button className="rounded-full py-3 text-sm font-semibold bg-[var(--ball)] text-[var(--court-deep)]">
              👍 Connect
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[var(--cream)]/40 text-center leading-relaxed">
          Prototype only. Data is sample. Nationalities show as 1–3 tiny flag pins on
          the photo. Compatibility panel splits into On-court + Off-court.
        </p>
      </div>
    </div>
  );
}
