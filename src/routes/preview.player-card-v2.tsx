import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  MoreHorizontal,
  MapPin,
  Sparkles,
  Calendar,
  Sun,
  Send,
  Bookmark,
  ArrowRight,
  Dumbbell,
  Trophy,
  MessageCircle,
  Zap,
  Smile,
  Pencil,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/player-card-v2")({
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
  bio: "Mom of two +\none lovely dog 🐶",
  overall: 78,
  level: "Intermediate",
  side: "Left",
  style: "Strategic",
  rackets: 3,
  sessionsPerWeek: "3–4",
  timeOfDay: "Morning player",
  languages: [
    { label: "Spanish", flag: "🇪🇸" },
    { label: "English", flag: "🇬🇧" },
    { label: "Italian", flag: "🇮🇹" },
  ],
  clubs: ["Padel Nuestro Chamartín", "La Finca Padel"],
  sports: [
    { label: "Running", icon: "🏃" },
    { label: "Yoga", icon: "🧘" },
    { label: "Skiing", icon: "⛷️" },
  ],
  partnerTraits: [
    { label: "Competitive", icon: Trophy },
    { label: "Communicator", icon: MessageCircle },
    { label: "Energetic", icon: Zap },
    { label: "Funny", icon: Smile },
    { label: "Fit", icon: Dumbbell },
  ],
  compat: {
    onCourt: 82,
    offCourt: 74,
    blurb: "Both competitive but calm under pressure.",
  },
};

function CourtSideIcon({ side }: { side: "Left" | "Right" | "Both" | "Unsure" }) {
  // Top-down padel court; highlight the preferred half
  const fill = "color-mix(in oklab, var(--ink) 22%, transparent)";
  const leftFill = side === "Left" || side === "Both" ? fill : "transparent";
  const rightFill = side === "Right" || side === "Both" ? fill : "transparent";
  return (
    <svg viewBox="0 0 40 28" className="w-7 h-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {/* outer court */}
      <rect x="3" y="3" width="34" height="22" rx="1" />
      {/* service line */}
      <line x1="3" y1="9" x2="37" y2="9" />
      <line x1="3" y1="19" x2="37" y2="19" />
      {/* net */}
      <line x1="20" y1="3" x2="20" y2="25" strokeDasharray="1.5 1.5" />
      {/* halves */}
      <rect x="3.6" y="3.6" width="15.8" height="20.8" fill={leftFill} stroke="none" />
      <rect x="20.6" y="3.6" width="15.8" height="20.8" fill={rightFill} stroke="none" />
      {side === "Unsure" && (
        <text x="20" y="18" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none" fontStyle="italic" fontFamily="var(--font-serif)">?</text>
      )}
    </svg>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative w-[112px] h-[112px]">
      <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="color-mix(in oklab, var(--ink) 10%, transparent)" strokeWidth="4" />
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-serif text-[30px] leading-none text-[var(--ink)]">
          {value}<span className="text-[14px] align-top ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 py-1">
      <div className="text-[var(--ink)]">{icon}</div>
      <div className="text-[9px] tracking-[0.22em] uppercase text-[color-mix(in_oklab,var(--ink)_55%,transparent)] font-semibold">{label}</div>
      <div className="text-[13px] font-semibold text-[var(--ink)]">{value}</div>
    </div>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-[10px] tracking-[0.2em] uppercase text-[color-mix(in_oklab,var(--ink)_60%,transparent)] font-semibold">{children}</div>
      <div className="mx-auto mt-1.5 h-px w-8 bg-[color-mix(in_oklab,var(--ink)_25%,transparent)]" />
    </div>
  );
}

function SegBar({ value, tone }: { value: number; tone: "ink" | "clay" }) {
  const segs = 6;
  const filled = Math.round((value / 100) * segs);
  const color = tone === "ink" ? "var(--ink)" : "#a37a4a";
  const dim = tone === "ink"
    ? "color-mix(in oklab, var(--ink) 12%, transparent)"
    : "color-mix(in oklab, #a37a4a 20%, transparent)";
  return (
    <div className="flex gap-1">
      {Array.from({ length: segs }).map((_, i) => (
        <div key={i} className="h-2 flex-1 rounded-[3px]" style={{ background: i < filled ? color : dim }} />
      ))}
    </div>
  );
}

function LevelBars() {
  return (
    <div className="flex items-end gap-[3px] h-6">
      <div className="w-1.5 h-2 bg-[var(--ink)] rounded-sm" />
      <div className="w-1.5 h-4 bg-[var(--ink)] rounded-sm" />
      <div className="w-1.5 h-6 bg-[var(--ink)] rounded-sm" />
      <div className="w-1.5 h-6 bg-[color-mix(in_oklab,var(--ink)_15%,transparent)] rounded-sm" />
    </div>
  );
}

function PlayerCardPreview() {
  return (
    <div className="programme-page min-h-screen">
      <div className="max-w-[440px] mx-auto px-5 pt-4 pb-8">
        {/* Top chrome */}
        <div className="flex items-center justify-between mb-4">
          <button className="w-9 h-9 -ml-2 flex items-center justify-center text-[var(--ink)]">
            <ChevronLeft className="w-6 h-6" strokeWidth={1.8} />
          </button>
          <button className="w-9 h-9 -mr-2 flex items-center justify-center text-[var(--ink)]">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>

        {/* HEADER */}
        <div className="grid grid-cols-[132px_1fr] gap-4 items-start">
          {/* Polaroid */}
          <div className="relative pt-3 pl-1">
            <div className="relative bg-white p-2 pb-8 shadow-[0_10px_30px_-15px_rgba(15,62,46,0.35),0_2px_6px_-2px_rgba(15,62,46,0.15)]" style={{ transform: "rotate(-3deg)" }}>
              <div className="absolute -top-4 right-4 w-5 h-10 rotate-12">
                <svg viewBox="0 0 20 40" className="w-full h-full" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M10 3v28a5 5 0 01-10 0V10a3 3 0 016 0v20" />
                </svg>
              </div>
              <div className="relative overflow-hidden">
                <img src={sample.photo} alt={sample.name} className="w-full aspect-[3/4] object-cover" />
                <div className="absolute top-1.5 left-1.5 flex gap-1">
                  {sample.flags.map((f, i) => (
                    <span key={i} className="w-5 h-5 rounded-[3px] bg-white shadow-sm flex items-center justify-center text-[10px] leading-none ring-1 ring-black/5">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-center mt-1.5 text-[10px] leading-tight text-[var(--ink)] italic whitespace-pre-line" style={{ fontFamily: "var(--font-serif)" }}>
                {sample.bio}
              </div>
            </div>
          </div>

          {/* Name + ring */}
          <div className="pt-1">
            <h1 className="text-serif text-[38px] leading-[0.95] text-[var(--ink)]">
              {sample.name}
            </h1>
            <div className="flex items-center gap-1 mt-2 text-[13px] text-[color-mix(in_oklab,var(--ink)_80%,transparent)]">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.6} />
              {sample.city}, {sample.country}
            </div>

            <div className="flex flex-col items-center mt-4">
              <ProgressRing value={sample.overall} />
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_55%,transparent)] mt-1.5">
                Overall match
              </div>
            </div>
          </div>
        </div>

        {/* Icon stat row */}
        <div className="mt-6 border-t border-[color-mix(in_oklab,var(--ink)_12%,transparent)] pt-4 grid grid-cols-3 gap-2">
          <StatCell icon={<LevelBars />} label="Level" value={sample.level} />
          <StatCell icon={<CourtSideIcon side={sample.side as "Left" | "Right" | "Both" | "Unsure"} />} label="Side" value={sample.side === "Unsure" ? "Not sure yet" : sample.side} />
          <StatCell icon={<Sparkles className="w-6 h-6" strokeWidth={1.4} />} label="Style" value={sample.style} />
        </div>

        {/* Plays / time-of-day */}
        <div className="mt-4 rounded-[14px] bg-[color-mix(in_oklab,var(--ink)_5%,transparent)] px-4 py-3 grid grid-cols-2 divide-x divide-[color-mix(in_oklab,var(--ink)_12%,transparent)]">
          <div className="flex items-center gap-2.5 pr-3">
            <Calendar className="w-5 h-5 text-[var(--ink)]" strokeWidth={1.4} />
            <div className="text-[13px] text-[var(--ink)]">
              Plays{" "}
              <span className="text-serif text-[19px] mx-0.5 align-baseline">{sample.sessionsPerWeek}</span>{" "}
              <span className="text-[color-mix(in_oklab,var(--ink)_65%,transparent)]">/ week</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pl-3">
            <Sun className="w-5 h-5 text-[var(--ink)]" strokeWidth={1.4} />
            <div className="text-[13px] font-semibold text-[var(--ink)]">{sample.timeOfDay}</div>
          </div>
        </div>

        {/* 4-column lists */}
        <div className="mt-6 grid grid-cols-4 gap-3 text-[var(--ink)]">
          <div className="space-y-3">
            <ColumnHeader>Languages</ColumnHeader>
            <div className="space-y-2">
              {sample.languages.map((l) => (
                <div key={l.label} className="text-center text-[12px] text-[var(--ink)]">
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-l border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pl-3">
            <ColumnHeader>Clubs</ColumnHeader>
            <div className="space-y-2.5">
              {sample.clubs.map((c) => (
                <div key={c} className="flex flex-col items-center gap-1 text-center">
                  <MapPin className="w-4 h-4" strokeWidth={1.4} />
                  <span className="text-[11px] leading-tight">{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-l border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pl-3">
            <ColumnHeader>Sports</ColumnHeader>
            <div className="space-y-2.5">
              {sample.sports.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <span className="text-[18px] leading-none">{s.icon}</span>
                  <span className="text-[11px]">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-l border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pl-3">
            <ColumnHeader>Looking for</ColumnHeader>
            <div className="space-y-2">
              {sample.partnerTraits.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" strokeWidth={1.4} />
                  <span className="text-[11px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compatibility */}
        <div className="mt-6 rounded-[14px] border border-[color-mix(in_oklab,var(--ink)_12%,transparent)] p-4 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[var(--ink)]">
              Compatibility
            </div>
            <button className="flex items-center gap-1 text-[11px] italic text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
              See how you match <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">On court</div>
              <div className="text-serif text-[22px] leading-none text-[var(--ink)] mt-1">
                {sample.compat.onCourt}<span className="text-[12px] align-top">%</span>
              </div>
              <div className="mt-2"><SegBar value={sample.compat.onCourt} tone="ink" /></div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">Off court</div>
              <div className="text-serif text-[22px] leading-none text-[#a37a4a] mt-1">
                {sample.compat.offCourt}<span className="text-[12px] align-top">%</span>
              </div>
              <div className="mt-2"><SegBar value={sample.compat.offCourt} tone="clay" /></div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-[color-mix(in_oklab,var(--ink)_4%,transparent)] px-3 py-2.5 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#c9a84c] mt-0.5" />
            <p className="text-[12px] italic text-[color-mix(in_oklab,var(--ink)_80%,transparent)]" style={{ fontFamily: "var(--font-serif)" }}>
              “{sample.compat.blurb}”
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded-[10px] py-3.5 bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-[0.18em]">
            <Send className="w-4 h-4" strokeWidth={1.8} />
            Message
          </button>
          <button className="rounded-[10px] py-3.5 bg-white border border-[color-mix(in_oklab,var(--ink)_20%,transparent)] text-[var(--ink)] flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-[0.18em]">
            <Bookmark className="w-4 h-4" strokeWidth={1.8} />
            Save profile
          </button>
        </div>

        {/* Edit own profile */}
        <Link
          to="/app/profile"
          className="mt-3 block rounded-[10px] py-3.5 bg-white border border-dashed border-[color-mix(in_oklab,var(--ink)_30%,transparent)] text-[var(--ink)] text-center text-[13px] font-semibold uppercase tracking-[0.18em]"
        >
          <span className="inline-flex items-center gap-2">
            <Pencil className="w-4 h-4" strokeWidth={1.8} />
            Edit my player card
          </span>
        </Link>
      </div>
    </div>
  );
}
