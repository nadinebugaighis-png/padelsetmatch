import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  MoreHorizontal,
  MapPin,
  Sparkles,
  BarChart3,
  Target,
  Calendar,
  Sun,
  Send,
  Bookmark,
  ArrowRight,
  Trophy,
  MessageCircle,
  Zap,
  Smile,
  Heart,
} from "lucide-react";

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
  bio: "Mom of two +\none lovely dog 🐶",
  reliability: 4.6,
  overall: 78,
  level: "Intermediate",
  side: "Left",
  style: "Strategic",
  rackets: 3,
  sessionsPerWeek: "3–4",
  timeOfDay: "Morning player",
  languages: ["Spanish", "English", "Italian"],
  clubs: ["Padel Nuestro Chamartín", "La Finca Padel"],
  sports: ["Running", "Yoga", "Skiing"],
  partnerTraits: [
    { label: "Competitive", icon: Trophy },
    { label: "Communicator", icon: MessageCircle },
    { label: "Energetic", icon: Zap },
    { label: "Funny", icon: Smile },
    { label: "Fit", icon: Heart },
  ],
  compat: {
    onCourt: 82,
    offCourt: 74,
    blurb: "Both competitive but calm under pressure.",
  },
};

/* Simple line-drawn racket to match the reference stat row */
function RacketMini({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="20" cy="15" rx="10" ry="12" />
      <line x1="20" y1="27" x2="20" y2="38" />
      {crossed && (
        <>
          <line x1="12" y1="8" x2="28" y2="22" opacity="0.5" />
          <line x1="28" y1="8" x2="12" y2="22" opacity="0.5" />
        </>
      )}
      {!crossed && (
        <>
          <line x1="13" y1="10" x2="27" y2="20" opacity="0.35" />
          <line x1="27" y1="10" x2="13" y2="20" opacity="0.35" />
          <line x1="20" y1="4" x2="20" y2="26" opacity="0.35" />
          <line x1="10" y1="15" x2="30" y2="15" opacity="0.35" />
        </>
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
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="color-mix(in oklab, var(--ink) 10%, transparent)"
          strokeWidth="4"
        />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-serif text-[30px] leading-none text-[var(--ink)]">
          {value}
          <span className="text-[14px] align-top ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 py-1">
      <div className="text-[var(--ink)]">{icon}</div>
      <div className="text-[9px] tracking-[0.22em] uppercase text-[color-mix(in_oklab,var(--ink)_55%,transparent)] font-semibold">
        {label}
      </div>
      <div className="text-[13px] font-semibold text-[var(--ink)]">{value}</div>
    </div>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-[10px] tracking-[0.2em] uppercase text-[color-mix(in_oklab,var(--ink)_60%,transparent)] font-semibold">
        {children}
      </div>
      <div className="mx-auto mt-1.5 h-px w-8 bg-[color-mix(in_oklab,var(--ink)_25%,transparent)]" />
    </div>
  );
}

function CityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12 3l2 3h-1v4h2v3h1v8H8v-8h1v-3h2V6h-1z" />
    </svg>
  );
}
function BigBenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="10" y="4" width="4" height="4" />
      <circle cx="12" cy="10.5" r="0.8" fill="currentColor" />
      <path d="M9 13h6v8H9z" />
    </svg>
  );
}
function ColosseumIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 20V10a9 9 0 0118 0v10" />
      <path d="M3 14h18M3 17h18M8 10v10M12 10v10M16 10v10" />
    </svg>
  );
}
function ClubIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M4 26V16l12-8 12 8v10" />
      <path d="M4 26h24" />
      <path d="M12 26v-6h8v6" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}
function RunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="4.5" r="1.6" />
      <path d="M6 21l3-5 3 2 2-4 3 3" />
      <path d="M10 12l2-4 3 1 2 3" />
    </svg>
  );
}
function YogaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="4.5" r="1.6" />
      <path d="M12 7v6" />
      <path d="M5 13c3 0 5 2 7 2s4-2 7-2" />
      <path d="M8 19c1.5-1 2.5-2 4-2s2.5 1 4 2" />
    </svg>
  );
}
function SkiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="15" cy="4.5" r="1.4" />
      <path d="M13 8l-2 4 3 2-1 4" />
      <path d="M4 20l16-4" />
      <path d="M5 21l14-4" />
    </svg>
  );
}
function TennisBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="var(--grass)" stroke="color-mix(in oklab, var(--ink) 40%, transparent)" strokeWidth="1">
      <circle cx="12" cy="12" r="10" />
      <path d="M2.5 9c4 1 8 1 11 -3M21.5 9c-4 1-8 1-11-3M2.5 15c4-1 8-1 11 3M21.5 15c-4-1-8-1-11 3" fill="none" strokeWidth="1" />
    </svg>
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
        <div
          key={i}
          className="h-2 flex-1 rounded-[3px]"
          style={{ background: i < filled ? color : dim }}
        />
      ))}
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

        {/* HEADER: polaroid + name/reliability + ring */}
        <div className="grid grid-cols-[132px_1fr] gap-4 items-start">
          {/* Polaroid */}
          <div className="relative pt-3 pl-1">
            <div
              className="relative bg-white p-2 pb-8 shadow-[0_10px_30px_-15px_rgba(15,62,46,0.35),0_2px_6px_-2px_rgba(15,62,46,0.15)]"
              style={{ transform: "rotate(-3deg)" }}
            >
              {/* Paperclip */}
              <div className="absolute -top-4 right-4 w-5 h-10 rotate-12">
                <svg viewBox="0 0 20 40" className="w-full h-full" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M10 3v28a5 5 0 01-10 0V10a3 3 0 016 0v20" />
                </svg>
              </div>
              <div className="relative overflow-hidden">
                <img
                  src={sample.photo}
                  alt={sample.name}
                  className="w-full aspect-[3/4] object-cover"
                />
                {/* Flag pins */}
                <div className="absolute top-1.5 left-1.5 flex gap-1">
                  {sample.flags.map((f, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-[3px] bg-white shadow-sm flex items-center justify-center text-[10px] leading-none ring-1 ring-black/5"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="text-center mt-1.5 text-[10px] leading-tight text-[var(--ink)] italic whitespace-pre-line"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {sample.bio}
              </div>
            </div>
          </div>

          {/* Name block */}
          <div className="pt-1">
            <h1 className="text-serif text-[38px] leading-[0.95] text-[var(--ink)]">
              {sample.name}
              <span className="text-[color-mix(in_oklab,#c9a84c_95%,transparent)] font-normal">
                , {sample.age}
              </span>
            </h1>
            <div className="flex items-center gap-1 mt-2 text-[13px] text-[color-mix(in_oklab,var(--ink)_80%,transparent)]">
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.6} />
              {sample.city}, {sample.country}
            </div>

            {/* Reliability + ring */}
            <div className="flex items-center gap-3 mt-4">
              <div className="relative">
                <div className="w-[92px] h-[64px] rounded-[999px] bg-white/60 border border-[color-mix(in_oklab,#c9a84c_35%,transparent)] flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#c9a84c]" />
                    <span className="text-serif text-[22px] leading-none text-[var(--ink)]">
                      {sample.reliability}
                    </span>
                  </div>
                  <span className="text-[8px] tracking-[0.2em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_55%,transparent)] mt-0.5">
                    Reliability
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center">
                <ProgressRing value={sample.overall} />
                <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_55%,transparent)] mt-1">
                  Overall match
                </div>
                <div className="flex items-center gap-1 mt-1 text-[12px] italic text-[#c9a84c]" style={{ fontFamily: "var(--font-serif)" }}>
                  Good match <TennisBallIcon className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Icon stat row */}
        <div className="mt-6 border-t border-[color-mix(in_oklab,var(--ink)_12%,transparent)] pt-4 grid grid-cols-4 gap-2">
          <StatCell
            icon={<BarChart3 className="w-6 h-6" strokeWidth={1.5} />}
            label="Level"
            value={sample.level}
          />
          <StatCell
            icon={<RacketMini />}
            label="Side"
            value={sample.side}
          />
          <StatCell
            icon={<Target className="w-6 h-6" strokeWidth={1.5} />}
            label="Style"
            value={sample.style}
          />
          <StatCell
            icon={<RacketMini crossed />}
            label="Rackets"
            value={`×${sample.rackets}`}
          />
        </div>

        {/* Plays / time-of-day pill */}
        <div className="mt-4 rounded-[14px] bg-[color-mix(in_oklab,var(--ink)_5%,transparent)] px-4 py-3 grid grid-cols-2 divide-x divide-[color-mix(in_oklab,var(--ink)_12%,transparent)]">
          <div className="flex items-center gap-2.5 pr-3">
            <Calendar className="w-5 h-5 text-[var(--ink)]" strokeWidth={1.4} />
            <div className="text-[13px] text-[var(--ink)]">
              Plays{" "}
              <span className="text-serif text-[19px] mx-0.5 align-baseline">
                {sample.sessionsPerWeek}
              </span>{" "}
              <span className="text-[color-mix(in_oklab,var(--ink)_65%,transparent)]">
                times / week
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pl-3">
            <Sun className="w-5 h-5 text-[var(--ink)]" strokeWidth={1.4} />
            <div className="text-[12px] leading-tight">
              <div className="text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">Usually</div>
              <div className="text-[13px] font-semibold text-[var(--ink)]">
                {sample.timeOfDay}
              </div>
            </div>
          </div>
        </div>

        {/* 4-column icon lists */}
        <div className="mt-6 grid grid-cols-4 gap-3 text-[var(--ink)]">
          <div className="space-y-3">
            <ColumnHeader>Languages</ColumnHeader>
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-1">
                <CityIcon />
                <span className="text-[12px]">Spanish</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <BigBenIcon />
                <span className="text-[12px]">English</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ColosseumIcon />
                <span className="text-[12px]">Italian</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-l border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pl-3">
            <ColumnHeader>Favorite clubs</ColumnHeader>
            <div className="space-y-3">
              {sample.clubs.map((c) => (
                <div key={c} className="flex flex-col items-center gap-1 text-center">
                  <ClubIcon />
                  <span className="text-[11px] leading-tight">{c}</span>
                  <MapPin className="w-3 h-3 text-[color-mix(in_oklab,var(--ink)_55%,transparent)]" strokeWidth={1.4} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-l border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pl-3">
            <ColumnHeader>Other sports</ColumnHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-start">
                <RunIcon /> <span className="text-[12px]">Running</span>
              </div>
              <div className="flex items-center gap-2 justify-start">
                <YogaIcon /> <span className="text-[12px]">Yoga</span>
              </div>
              <div className="flex items-center gap-2 justify-start">
                <SkiIcon /> <span className="text-[12px]">Skiing</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-l border-[color-mix(in_oklab,var(--ink)_10%,transparent)] pl-3">
            <ColumnHeader>Looking for</ColumnHeader>
            <div className="space-y-2.5">
              {sample.partnerTraits.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4" strokeWidth={1.4} />
                  <span className="text-[12px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compatibility card */}
        <div className="mt-6 rounded-[14px] border border-[color-mix(in_oklab,var(--ink)_12%,transparent)] p-4 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[var(--ink)]">
              Compatibility breakdown
            </div>
            <button className="flex items-center gap-1 text-[11px] italic text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
              See how you match <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[var(--ink)] flex items-center justify-center">
                  <TennisBallIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">On court</div>
                  <div className="text-serif text-[22px] leading-none text-[var(--ink)]">
                    {sample.compat.onCourt}
                    <span className="text-[12px] align-top">%</span>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <SegBar value={sample.compat.onCourt} tone="ink" />
              </div>
              <div className="text-[11px] mt-1.5 text-[color-mix(in_oklab,var(--ink)_65%,transparent)]">Playing style</div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#c9a680] flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[9px] tracking-[0.22em] uppercase font-semibold text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">Off court</div>
                  <div className="text-serif text-[22px] leading-none text-[#a37a4a]">
                    {sample.compat.offCourt}
                    <span className="text-[12px] align-top">%</span>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <SegBar value={sample.compat.offCourt} tone="clay" />
              </div>
              <div className="text-[11px] mt-1.5 text-[color-mix(in_oklab,var(--ink)_65%,transparent)]">Vibe &amp; lifestyle</div>
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

        {/* Laurel divider */}
        <div className="mt-8 flex items-center justify-center gap-3 text-[color-mix(in_oklab,var(--ink)_55%,transparent)]">
          <div className="h-px w-16 bg-[color-mix(in_oklab,var(--ink)_20%,transparent)]" />
          <svg viewBox="0 0 40 24" className="w-10 h-6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M8 20c-3-4-4-10-2-16M6 8c2 0 3 1 3 3M8 12c2 0 3 1 3 3M10 16c2 0 3 1 3 3" />
            <path d="M32 20c3-4 4-10 2-16M34 8c-2 0-3 1-3 3M32 12c-2 0-3 1-3 3M30 16c-2 0-3 1-3 3" />
            <line x1="16" y1="10" x2="24" y2="18" />
            <line x1="24" y1="10" x2="16" y2="18" />
          </svg>
          <div className="h-px w-16 bg-[color-mix(in_oklab,var(--ink)_20%,transparent)]" />
        </div>
      </div>
    </div>
  );
}
