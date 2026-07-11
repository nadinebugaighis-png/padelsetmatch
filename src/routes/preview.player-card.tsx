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

const sample = {
  name: "Sofía",
  age: 31,
  city: "Madrid",
  country: "Spain",
  flags: ["🇪🇸", "🇮🇹"],
  photo:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop",
  bio: "Mom of two + one lovely dog.",
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
  compat: {
    onCourt: 82,
    offCourt: 74,
    blurb: "Both competitive but calm under pressure.",
  },
};

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex-1 py-3 text-center">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[color-mix(in_oklab,var(--ink)_55%,transparent)] font-semibold">
        {k}
      </div>
      <div className="text-serif text-[22px] leading-none mt-1.5 text-[var(--ink)]">
        {v}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-4 border-t border-[color-mix(in_oklab,var(--ink)_10%,transparent)]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--ink)_55%,transparent)] font-semibold mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--ink)_60%,transparent)] font-semibold">
          {label}
        </span>
        <span className="text-serif text-[18px] text-[var(--ink)] leading-none">
          {value}
          <span className="text-[11px] align-top ml-0.5">%</span>
        </span>
      </div>
      <div className="h-[3px] rounded-full bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--plum)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCardPreview() {
  return (
    <div className="programme-page min-h-screen p-4 flex items-start justify-center">
      <div className="w-full max-w-[420px] space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color-mix(in_oklab,var(--ink)_55%,transparent)] text-center font-semibold">
          Player card · Preview
        </p>

        <div className="programme-card overflow-hidden">
          {/* Hero */}
          <div className="relative">
            <img
              src={sample.photo}
              alt={sample.name}
              className="w-full aspect-[4/5] object-cover"
            />

            {/* Flag pins */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              {sample.flags.map((f, i) => (
                <span
                  key={i}
                  className="w-7 h-7 rounded-full bg-[var(--paper)] shadow-sm flex items-center justify-center text-[15px] ring-1 ring-black/5"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Free-court */}
            {sample.freeCourt && (
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--paper)] flex items-center justify-center shadow-sm ring-1 ring-black/5">
                <CourtIcon className="w-4 h-4 text-[var(--ink)]" />
              </div>
            )}
          </div>

          {/* Name plate — off the photo, editorial */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-serif text-[38px] leading-[0.95] text-[var(--ink)]">
                {sample.name}
                <span className="text-[color-mix(in_oklab,var(--ink)_45%,transparent)] font-normal">
                  , {sample.age}
                </span>
              </h1>
              <button className="chip-ink text-[10px]">Edit</button>
            </div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[color-mix(in_oklab,var(--ink)_55%,transparent)] mt-2 font-semibold">
              {sample.city} · {sample.country}
            </p>
            <p className="text-serif italic text-[15px] text-[color-mix(in_oklab,var(--ink)_75%,transparent)] mt-3 leading-snug">
              “{sample.bio}”
            </p>
          </div>

          {/* Stats — thin serif strip */}
          <div className="mx-5 flex items-stretch border-y border-[color-mix(in_oklab,var(--ink)_12%,transparent)] divide-x divide-[color-mix(in_oklab,var(--ink)_10%,transparent)]">
            <Stat k="Level" v={sample.level} />
            <Stat k="Side" v={sample.side} />
            <Stat k="Style" v={sample.style} />
            <Stat k="Rackets" v={`×${sample.rackets}`} />
          </div>

          {/* Body */}
          <div className="px-5 pb-2">
            <div className="pt-4 flex items-center justify-between">
              <span className="text-[12px] text-[color-mix(in_oklab,var(--ink)_70%,transparent)]">
                Plays{" "}
                <b className="text-[var(--ink)]">{sample.sessionsPerWeek}</b>{" "}
                times per week
              </span>
            </div>

            <Row label="Languages">
              {sample.languages.map((l) => (
                <span key={l} className="chip-ink">
                  {l}
                </span>
              ))}
            </Row>

            <Row label="Favourite clubs">
              {sample.clubs.map((c) => (
                <span key={c} className="chip-ink">
                  {c}
                </span>
              ))}
            </Row>

            <Row label="Other sports">
              {sample.sports.map((s) => (
                <span key={s} className="chip-ink">
                  {s}
                </span>
              ))}
            </Row>

            <Row label="Looking for a partner who is">
              {sample.partnerTraits.map((t) => (
                <span key={t} className="chip-paper chip-paper-selected">
                  {t}
                </span>
              ))}
            </Row>
          </div>

          {/* Compatibility — programme-ink footer */}
          <div className="mt-2 programme-card-ink mx-3 mb-3 p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[color-mix(in_oklab,var(--paper)_70%,transparent)] font-semibold">
                Compatibility
              </span>
              <span className="text-serif text-[32px] leading-none text-[var(--paper)]">
                {Math.round(
                  (sample.compat.onCourt + sample.compat.offCourt) / 2,
                )}
                <span className="text-[14px] align-top ml-0.5">%</span>
              </span>
            </div>
            <div className="space-y-2.5 [--ink:var(--paper)]">
              <Bar label="On court" value={sample.compat.onCourt} />
              <Bar label="Off court" value={sample.compat.offCourt} />
            </div>
            <p className="text-serif italic text-[13px] text-[color-mix(in_oklab,var(--paper)_80%,transparent)] pt-1">
              “{sample.compat.blurb}”
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2">
            <button className="rounded-full py-3 text-[13px] font-semibold uppercase tracking-[0.16em] border border-[color-mix(in_oklab,var(--ink)_18%,transparent)] text-[var(--ink)] bg-white">
              Message
            </button>
            <button className="rounded-full py-3 text-[13px] font-semibold uppercase tracking-[0.16em] bg-[var(--ink)] text-[var(--paper)]">
              Connect
            </button>
          </div>
        </div>

        <p className="text-[10px] text-[color-mix(in_oklab,var(--ink)_50%,transparent)] text-center leading-relaxed">
          Prototype · sample data
        </p>
      </div>
    </div>
  );
}
