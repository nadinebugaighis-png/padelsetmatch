import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, MessageCircle, Send, ThumbsUp, Users, Calendar, MapPin,
  Clock, X, Camera, Star, Trophy, Zap, Check, Plus, Settings, Bell, Search,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { CourtIcon } from "@/components/CourtIcon";
import p1 from "@/assets/seed/p1.jpg.asset.json";
import p2 from "@/assets/seed/p2.jpg.asset.json";
import p3 from "@/assets/seed/p3.jpg.asset.json";
import p4 from "@/assets/seed/p4.jpg.asset.json";
import p5 from "@/assets/seed/p5.jpg.asset.json";
import p6 from "@/assets/seed/p6.jpg.asset.json";
import p7 from "@/assets/seed/p7.jpg.asset.json";
import p8 from "@/assets/seed/p8.jpg.asset.json";
import p9 from "@/assets/seed/p9.jpg.asset.json";
import p10 from "@/assets/seed/p10.jpg.asset.json";
import p11 from "@/assets/seed/p11.jpg.asset.json";
import p12 from "@/assets/seed/p12.jpg.asset.json";
import mePhoto from "@/assets/seed/me.jpg.asset.json";

const TITLE = "PadelSetMatch demo — players, matches and courts";
const DESC =
  "A no-signup tour of PadelSetMatch: find padel players near you, join open matches, chat with your four, and track your court time.";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
  component: DemoPage,
});

type Player = {
  name: string;
  club: string;
  city: string;
  zone: string;
  level: number;
  fit: number;
  photo: string;
  side: "Left" | "Right" | "Both";
  plays: string;
  freeCourt?: boolean;
  coach?: boolean;
  tags: string[];
};

const PLAYERS: Player[] = [
  { name: "Lucía", zone: "Chamartín", club: "Padel Chamartín", city: "Madrid", level: 3.5, fit: 92, photo: p1.url, side: "Right", plays: "3–4 / week", freeCourt: true, tags: ["Competitive", "Evenings"] },
  { name: "Marc", zone: "Pozuelo", club: "La Finca Padel", city: "Madrid", level: 3.0, fit: 88, photo: p2.url, side: "Left", plays: "2 / week", tags: ["Social", "Weekends"] },
  { name: "Aisha", zone: "Las Rozas", club: "Padel Las Rozas", city: "Madrid", level: 2.5, fit: 85, photo: p3.url, side: "Both", plays: "1–2 / week", tags: ["Improving", "Mornings"] },
  { name: "Kenji", zone: "Pozuelo", club: "Club Pozuelo", city: "Madrid", level: 4.0, fit: 81, photo: p4.url, side: "Right", plays: "4+ / week", coach: true, tags: ["Coach", "Early bird"] },
  { name: "Sofía", zone: "Retiro", club: "Padel Retiro", city: "Madrid", level: 3.0, fit: 79, photo: p5.url, side: "Left", plays: "2–3 / week", freeCourt: true, tags: ["Consistent", "Lob lover"] },
  { name: "Diego", zone: "Chamberí", club: "Puerto Padel", city: "Madrid", level: 3.5, fit: 77, photo: p6.url, side: "Right", plays: "3 / week", tags: ["Aggressive net"] },
  { name: "Nadia", zone: "Alcobendas", club: "Padel Alcobendas", city: "Madrid", level: 2.5, fit: 74, photo: p7.url, side: "Both", plays: "1 / week", tags: ["Casual", "Fun first"] },
  { name: "Yusuf", zone: "Boadilla", club: "Boadilla Indoor", city: "Madrid", level: 3.0, fit: 71, photo: p8.url, side: "Left", plays: "2 / week", freeCourt: true, tags: ["Regular four"] },
  { name: "Elena", zone: "Chamberí", club: "Padel Chamberí", city: "Madrid", level: 3.5, fit: 69, photo: p9.url, side: "Right", plays: "3 / week", tags: ["Tournaments"] },
  { name: "Tomás", zone: "Getafe", club: "Padel Getafe", city: "Madrid", level: 2.0, fit: 66, photo: p10.url, side: "Both", plays: "1 / week", tags: ["Just started"] },
  { name: "Irene", zone: "Aravaca", club: "Padel Aravaca", city: "Madrid", level: 4.0, fit: 64, photo: p11.url, side: "Left", plays: "4 / week", coach: true, tags: ["Coach", "Drills"] },
  { name: "Pablo", zone: "Vallecas", club: "Padel Vallecas", city: "Madrid", level: 3.0, fit: 61, photo: p12.url, side: "Right", plays: "2 / week", freeCourt: true, tags: ["Free court", "Nights"] },
];

const MATCHES = [
  { when: "Today", time: "19:00", club: "Padel Chamartín", zone: "Chamartín · Madrid", players: [PLAYERS[0], PLAYERS[1]], slots: 2, level: "3.0 – 3.5", price: "€8 p.p.", tone: "evening" as const, free: false },
  { when: "Tomorrow", time: "08:30", club: "La Finca Padel", zone: "Pozuelo · Madrid", players: [PLAYERS[2], PLAYERS[3], PLAYERS[4]], slots: 1, level: "2.5 – 3.0", price: "Free court", tone: "morning" as const, free: true },
  { when: "Saturday", time: "17:30", club: "Padel Retiro", zone: "Retiro · Madrid", players: [PLAYERS[5]], slots: 3, level: "3.5 – 4.0", price: "€6 p.p.", tone: "afternoon" as const, free: false },
  { when: "Sunday", time: "11:00", club: "Boadilla Indoor", zone: "Boadilla · Madrid", players: [PLAYERS[7], PLAYERS[8]], slots: 2, level: "3.0", price: "Free court", tone: "morning" as const, free: true },
];

const CONVERSATION = [
  { from: "them" as const, who: PLAYERS[0], text: "We're 3 for tonight at Chamartín, 19:00. Court 4 is booked.", time: "17:42" },
  { from: "me" as const, text: "I'm in. Left or right side?", time: "17:44" },
  { from: "them" as const, who: PLAYERS[0], text: "You take the right, Marc plays left. Aisha is bringing new balls.", time: "17:45" },
  { from: "me" as const, text: "Perfect. I'll be there 10 min early to warm up.", time: "17:46" },
  { from: "them" as const, who: PLAYERS[1], text: "Same. Padel, set, match.", time: "17:47" },
];

const ME = {
  name: "Clara",
  city: "Madrid",
  photo: mePhoto.url,
  level: 3.5,
  side: "Right",
  plays: "3 / week",
  matches: 42,
  hours: 63,
  partners: 18,
  clubs: ["Padel Chamartín", "La Finca Padel", "Padel Retiro"],
  traits: ["Competitive", "Reliable", "Fast rallies", "Evenings"],
};

const toneBg: Record<string, string> = {
  morning: "color-mix(in oklab, var(--grass) 26%, transparent)",
  afternoon: "color-mix(in oklab, #E8B84B 30%, transparent)",
  evening: "color-mix(in oklab, var(--plum) 20%, transparent)",
};

function LevelDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-end gap-[2px] h-3">
      {[2, 2.5, 3, 3.5, 4].map((s) => (
        <span
          key={s}
          className="w-[3px] rounded-sm"
          style={{
            height: 4 + (s - 2) * 3.5,
            background:
              s <= level ? "var(--ink)" : "color-mix(in oklab, var(--ink) 18%, transparent)",
          }}
        />
      ))}
    </span>
  );
}

function DemoPage() {
  const [tab, setTab] = useState<"home" | "play" | "chat" | "me">("home");
  const [clean, setClean] = useState(false);
  const [selected, setSelected] = useState<Player | null>(null);
  const navigate = useNavigate();

  const goSignup = () =>
    navigate({ to: "/auth", search: { redirect: undefined, join: undefined } });

  const nudge = (msg: string) =>
    toast(msg, {
      description: "Sign up (free) to unlock this.",
      action: { label: "Sign up", onClick: goSignup },
    });

  return (
    <main className="programme-page min-h-screen bg-[var(--paper)] pb-28">
      {!clean && (
        <div className="sticky top-0 z-40 bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
          <span className="text-[13px] font-medium truncate">Demo preview — sample players</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setClean(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--paper)]/40 text-[12px] px-2.5 py-1.5"
              aria-label="Hide demo chrome for screenshots"
            >
              <Camera className="w-3.5 h-3.5" /> Clean
            </button>
            <button
              onClick={goSignup}
              className="rounded-full bg-[var(--paper)] text-[var(--ink)] text-[12px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5"
            >
              Sign up
            </button>
            <Link to="/" className="text-[var(--paper)]/70 p-1" aria-label="Exit demo">
              <X className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
      {clean && (
        <button
          onClick={() => setClean(false)}
          className="fixed bottom-24 right-3 z-50 w-9 h-9 rounded-full bg-[var(--ink)]/25 text-[var(--paper)] flex items-center justify-center"
          aria-label="Show demo controls"
        >
          <Camera className="w-4 h-4" />
        </button>
      )}

      {/* App-like top bar */}
      <header className="px-5 pt-4 pb-3 flex items-center justify-between">
        <BrandMark size="sm" />
        <div className="flex items-center gap-3 text-[var(--ink)]/70">
          <Search className="w-5 h-5" strokeWidth={1.7} />
          <div className="relative">
            <Bell className="w-5 h-5" strokeWidth={1.7} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--plum)]" />
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-5">
        {/* HOME */}
        {tab === "home" && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-serif text-[30px] leading-[1.05] text-[var(--ink)]">
              12 neighbours near you
            </h1>
            <p className="text-[13px] text-[var(--ink)]/60 mt-1">
              Madrid · within 8 km · <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink)]"><CourtIcon className="w-4 h-2.5" strokeWidth={2.2} /> 4 with free court access</span>
            </p>


            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {["All", "Level 3.0–3.5", "Free court", "Evenings", "Coaches"].map((f, i) => (
                <span
                  key={f}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                    i === 0
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "border border-[var(--ink)]/15 text-[var(--ink)]/70"
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {PLAYERS.map((p) => (
                <div
                  key={p.name}
                  className="group relative flex flex-col programme-card overflow-hidden transition hover:shadow-md"
                >
                  {/* Polaroid-style photo frame — same as Home */}
                  <div className="relative bg-white p-2 shadow-[0_10px_28px_-12px_rgba(31,58,46,0.22)] rounded-[2px]">
                    <div className="relative aspect-[3/4] bg-[var(--paper-2)] overflow-hidden">
                      <img
                        src={p.photo}
                        alt={p.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-white/90 backdrop-blur-sm border border-[var(--ink)]/10 flex items-center justify-center text-[var(--ink)]">
                        <ThumbsUp className="w-2.5 h-2.5" strokeWidth={1.6} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="absolute inset-0 w-full h-full text-left"
                        aria-label={`View ${p.name}'s profile`}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white">
                    <h3 className="text-serif text-[17px] leading-none uppercase text-[var(--ink)] truncate">{p.name}</h3>
                    <p className="mt-1 text-[9px] text-[var(--ink)]/55 tracking-[0.18em] font-semibold uppercase truncate">
                      {p.zone} · Lvl {p.level.toFixed(1)}
                    </p>

                    {p.coach && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--plum)]/12 border border-[var(--plum)]/30 text-[var(--plum)] text-[8px] font-bold uppercase tracking-wider">
                        <Star className="w-2.5 h-2.5 fill-current" /> Coach
                      </div>
                    )}

                    {p.freeCourt && (
                      <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--grass)]/20 border border-[var(--grass)]/50 text-[var(--ink)] text-[8px] font-bold uppercase tracking-wider max-w-full">
                        <CourtIcon className="w-3.5 h-2 shrink-0" strokeWidth={2.2} />
                        <span className="truncate">Free court</span>
                      </div>
                    )}

                    <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--ink)]/5 border border-[var(--ink)]/15 text-[var(--ink)] text-[8px] font-bold uppercase tracking-wider max-w-full">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{p.club}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {p.freeCourt ? (
                        <span className="inline-flex items-center justify-center" title="Free court access">
                          <CourtIcon className="w-5 h-3 text-[var(--ink)]" strokeWidth={2.2} />
                        </span>
                      ) : <span />}
                      <div className="w-6 h-6 rounded-full bg-white text-[var(--ink)] text-[10px] flex items-center justify-center font-bold border border-[var(--ink)]/20">
                        {p.fit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* PLAY */}
        {tab === "play" && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-serif text-[30px] leading-[1.05] text-[var(--ink)]">Open matches</h1>
            <p className="text-[13px] text-[var(--ink)]/60 -mt-1">Madrid · next 7 days</p>

            {MATCHES.map((m, i) => (
              <div key={i} className="rounded-2xl border border-[var(--ink)]/10 bg-white/70 overflow-hidden shadow-sm">
                <div className="flex">
                  <div
                    className="w-[92px] flex-shrink-0 flex flex-col items-center justify-center py-4"
                    style={{ background: toneBg[m.tone] }}
                  >
                    <div className="text-serif text-[26px] leading-none text-[var(--ink)]">{m.time}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]/70 font-semibold">
                      {m.when}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-[var(--ink)] truncate">{m.club}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--ink)]/60">
                          <MapPin className="w-3.5 h-3.5" /> {m.zone}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.16em] rounded-full bg-[var(--plum)]/12 text-[var(--plum)] px-2 py-1 font-semibold whitespace-nowrap">
                        {m.slots} spot{m.slots > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--ink)]/60">
                      <span className="inline-flex items-center gap-1">
                        <LevelDots level={parseFloat(m.level)} /> {m.level}
                      </span>
                      <span>·</span>
                      <span className={m.free ? "inline-flex items-center gap-1 text-[var(--ink)] font-semibold" : ""}>
                        {m.free && <CourtIcon className="w-3.5 h-3" strokeWidth={2} />}
                        {m.price}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 90 min</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {m.players.map((p, j) => (
                        <img key={j} src={p.photo} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
                      ))}
                      {Array.from({ length: m.slots }).map((_, j) => (
                        <button
                          key={`s${j}`}
                          onClick={() => nudge("Join this match?")}
                          className="w-9 h-9 rounded-full border-2 border-dashed border-[var(--ink)]/25 text-[var(--ink)]/40 flex items-center justify-center"
                          aria-label="Open slot"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ))}
                      <button
                        onClick={() => nudge("Join this match?")}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.14em] px-3.5 py-2"
                      >
                        Join <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={goSignup}
              className="w-full mt-2 rounded-2xl border border-dashed border-[var(--ink)]/25 py-5 text-center"
            >
              <div className="text-serif text-lg text-[var(--ink)]">Host your own match</div>
              <p className="text-[13px] text-[var(--ink)]/60 mt-0.5">Pick a court, we'll find your four.</p>
            </button>
          </div>
        )}

        {/* CHAT */}
        {tab === "chat" && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-[var(--ink)]/10 bg-white/70 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ink)]/10">
                <div className="flex -space-x-2">
                  {[PLAYERS[0], PLAYERS[1], PLAYERS[2]].map((p) => (
                    <img key={p.name} src={p.photo} alt={p.name} className="w-8 h-8 rounded-full object-cover border-2 border-white" />
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="text-serif text-[16px] text-[var(--ink)] leading-tight">Tonight · Chamartín 19:00</div>
                  <div className="text-[11px] text-[var(--ink)]/55">Lucía, Marc, Aisha · 1 spot left</div>
                </div>
                <span className="ml-auto text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--ink)]/60">
                  Court 4
                </span>
              </div>

              <div className="px-4 py-4 space-y-3 bg-[var(--paper)]">
                {CONVERSATION.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.from === "me" ? "justify-end" : ""}`}>
                    {m.from === "them" && (
                      <img src={m.who.photo} alt={m.who.name} className="w-7 h-7 rounded-full object-cover self-end" />
                    )}
                    <div className={`max-w-[76%] ${m.from === "me" ? "items-end" : ""}`}>
                      {m.from === "them" && (
                        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink)]/50 mb-0.5">{m.who.name}</div>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                          m.from === "me"
                            ? "bg-[var(--ink)] text-[var(--paper)] rounded-br-md"
                            : "bg-white text-[var(--ink)] border border-[var(--ink)]/10 rounded-bl-md"
                        }`}
                      >
                        {m.text}
                      </div>
                      <div className={`text-[10px] text-[var(--ink)]/40 mt-0.5 ${m.from === "me" ? "text-right" : ""}`}>
                        {m.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 px-3 py-3 border-t border-[var(--ink)]/10 bg-white/70">
                <div className="flex-1 rounded-full border border-[var(--ink)]/15 px-4 py-2.5 text-[13px] text-[var(--ink)]/40">
                  Message your four…
                </div>
                <button
                  onClick={() => nudge("Send a message?")}
                  className="w-10 h-10 rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { p: PLAYERS[3], text: "Drills session Thursday if you are up for it", time: "1h" },
                { p: PLAYERS[4], text: "I'll bring the balls this time!", time: "Yesterday" },
                { p: PLAYERS[7], text: "Court at my building is free Sunday 11:00", time: "2d" },
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => nudge(`Open chat with ${c.p.name}?`)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-[var(--ink)]/10 bg-white/60 px-4 py-3 text-left"
                >
                  <img src={c.p.photo} alt={c.p.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-serif text-[15px] text-[var(--ink)]">{c.p.name}</span>
                      <span className="text-[11px] text-[var(--ink)]/45">{c.time}</span>
                    </div>
                    <div className="text-[13px] text-[var(--ink)]/65 truncate">{c.text}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ME */}
        {tab === "me" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 pb-6 shadow-[0_10px_30px_-15px_rgba(15,62,46,0.4)]">
                <img src={ME.photo} alt={ME.name} className="w-[112px] h-[140px] object-cover" />
              </div>
              <div className="pt-1 min-w-0">
                <h1 className="text-serif text-[32px] leading-[0.95] text-[var(--ink)]">{ME.name}</h1>
                <div className="mt-1.5 flex items-center gap-1 text-[13px] text-[var(--ink)]/70">
                  <MapPin className="w-3.5 h-3.5" /> {ME.city}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[11px] font-semibold px-2.5 py-1">
                    <CourtIcon className="w-3.5 h-3" strokeWidth={2} /> Free court
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] font-semibold px-2.5 py-1">
                    <Trophy className="w-3 h-3" /> Founder #57
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 rounded-2xl border border-[var(--ink)]/10 bg-white/60 divide-x divide-[var(--ink)]/10">
              {[
                { v: ME.matches, l: "Matches" },
                { v: ME.hours, l: "Hours on court" },
                { v: ME.partners, l: "Partners" },
              ].map((s) => (
                <div key={s.l} className="py-3.5 text-center">
                  <div className="text-serif text-[24px] leading-none text-[var(--ink)]">{s.v}</div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--ink)]/55 mt-1.5 font-semibold">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: <Zap className="w-5 h-5" />, l: "Level", v: ME.level.toFixed(1) },
                { icon: <CourtIcon className="w-6 h-4" />, l: "Side", v: ME.side },
                { icon: <Calendar className="w-5 h-5" />, l: "Plays", v: ME.plays },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-[var(--ink)]/10 bg-white/60 py-3 flex flex-col items-center gap-1.5 text-[var(--ink)]">
                  {s.icon}
                  <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--ink)]/55 font-semibold">{s.l}</div>
                  <div className="text-[13px] font-semibold">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 font-semibold">My clubs</div>
              <div className="mt-2 space-y-2">
                {ME.clubs.map((c) => (
                  <div key={c} className="flex items-center gap-2 rounded-xl border border-[var(--ink)]/10 bg-white/60 px-3.5 py-2.5 text-[14px] text-[var(--ink)]">
                    <MapPin className="w-4 h-4 text-[var(--ink)]/60" /> {c}
                    <Check className="w-4 h-4 ml-auto text-[var(--grass)]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/55 font-semibold">On court I am</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ME.traits.map((t) => (
                  <span key={t} className="rounded-full border border-[var(--ink)]/15 px-3 py-1.5 text-[12px] text-[var(--ink)]">{t}</span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={goSignup} className="rounded-xl bg-[var(--ink)] text-[var(--paper)] py-3.5 text-[13px] font-semibold uppercase tracking-[0.16em]">
                Edit profile
              </button>
              <button onClick={() => nudge("Open settings?")} className="rounded-xl border border-[var(--ink)]/20 bg-white/60 text-[var(--ink)] py-3.5 text-[13px] font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Player sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-[var(--ink)]/40 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setSelected(null)}>
          <div
            className="w-full sm:max-w-sm bg-[var(--paper)] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img src={selected.photo} alt={selected.name} className="w-full h-64 object-cover" />
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--paper)]/90 flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4 text-[var(--ink)]" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-serif text-[26px] leading-none text-[var(--ink)]">{selected.name}</div>
                  <div className="text-[12px] text-[var(--ink)]/60 mt-1.5">{selected.club} · {selected.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-serif text-[26px] leading-none text-[var(--ink)]">{selected.fit}%</div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink)]/55 font-semibold mt-1">Fit on court</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { l: "Level", v: selected.level.toFixed(1) },
                  { l: "Side", v: selected.side },
                  { l: "Plays", v: selected.plays },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-[var(--ink)]/[0.05] py-2.5">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--ink)]/55 font-semibold">{s.l}</div>
                    <div className="text-[13px] font-semibold text-[var(--ink)] mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.freeCourt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--grass)] text-[var(--ink)] text-[11px] font-semibold px-2.5 py-1">
                    <CourtIcon className="w-3.5 h-3" strokeWidth={2} /> Free court
                  </span>
                )}
                {selected.tags.map((t) => (
                  <span key={t} className="rounded-full border border-[var(--ink)]/15 px-2.5 py-1 text-[11px] text-[var(--ink)]">{t}</span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => nudge(`Message ${selected.name}?`)} className="rounded-xl bg-[var(--ink)] text-[var(--paper)] py-3 text-[12px] font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Message
                </button>
                <button onClick={() => nudge(`Invite ${selected.name} to a match?`)} className="rounded-xl border border-[var(--ink)]/20 text-[var(--ink)] py-3 text-[12px] font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2">
                  <ThumbsUp className="w-4 h-4" /> Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom app nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--ink)]/10 bg-[var(--paper)]/95 backdrop-blur px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {([
            { id: "home", label: "Players", icon: Users },
            { id: "play", label: "Play", icon: Calendar },
            { id: "chat", label: "Chat", icon: MessageCircle },
            { id: "me", label: "Me", icon: Trophy },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSelected(null); window.scrollTo({ top: 0 }); }}
                className={`flex flex-col items-center gap-1 py-1.5 ${active ? "text-[var(--ink)]" : "text-[var(--ink)]/45"}`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.7} />
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
