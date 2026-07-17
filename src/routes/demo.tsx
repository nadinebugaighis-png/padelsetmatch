import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, MessageCircle, Send, ThumbsUp,
  Users, Calendar, MapPin, Clock, X, Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import p1 from "@/assets/seed/p1.jpg.asset.json";
import p2 from "@/assets/seed/p2.jpg.asset.json";
import p3 from "@/assets/seed/p3.jpg.asset.json";
import p4 from "@/assets/seed/p4.jpg.asset.json";
import p5 from "@/assets/seed/p5.jpg.asset.json";
import p6 from "@/assets/seed/p6.jpg.asset.json";
import p7 from "@/assets/seed/p7.jpg.asset.json";
import p8 from "@/assets/seed/p8.jpg.asset.json";

const TITLE = "Try PadelMatch — Peek Inside the App";
const DESC = "Take a quick, no-signup tour of PadelMatch. Browse players, matches and chats, then sign up when you're ready.";

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
  name: string; city: string; country: string; age: string;
  level: number; score: number; photo: string; side: "L" | "R" | "B";
  traits: string[];
};

const PLAYERS: Player[] = [
  { name: "Lucía",  city: "Madrid",     country: "🇪🇸", age: "28–34", level: 3.5, score: 92, photo: p1.url, side: "R", traits: ["Competitive", "Fast rallies"] },
  { name: "Marc",   city: "Barcelona",  country: "🇪🇸", age: "35–44", level: 3.0, score: 88, photo: p2.url, side: "L", traits: ["Social", "Weekends"] },
  { name: "Aisha",  city: "Dubai",      country: "🇦🇪", age: "25–34", level: 2.5, score: 85, photo: p3.url, side: "B", traits: ["Beginner-friendly"] },
  { name: "Kenji",  city: "Tokyo",      country: "🇯🇵", age: "28–34", level: 4.0, score: 81, photo: p4.url, side: "R", traits: ["Advanced", "Early bird"] },
  { name: "Sofia",  city: "Lisbon",     country: "🇵🇹", age: "25–34", level: 3.0, score: 79, photo: p5.url, side: "L", traits: ["Fun over score"] },
  { name: "Diego",  city: "Buenos Aires", country: "🇦🇷", age: "35–44", level: 3.5, score: 77, photo: p6.url, side: "R", traits: ["Coach", "Loves lobs"] },
  { name: "Nadia",  city: "Beirut",     country: "🇱🇧", age: "28–34", level: 2.5, score: 74, photo: p7.url, side: "B", traits: ["Casual"] },
  { name: "Yusuf",  city: "Istanbul",   country: "🇹🇷", age: "25–34", level: 3.0, score: 71, photo: p8.url, side: "L", traits: ["Weekly regulars"] },
];

const MATCHES = [
  { host: PLAYERS[0], when: "Today, 19:00", club: "Padel Barrio · Madrid", players: [PLAYERS[0], PLAYERS[1]], slots: 2, level: "3.0–3.5", price: "€8" },
  { host: PLAYERS[2], when: "Tomorrow, 08:00", club: "The Els Club · Dubai", players: [PLAYERS[2], PLAYERS[3], PLAYERS[4]], slots: 1, level: "2.5–3.0", price: "AED 60" },
  { host: PLAYERS[5], when: "Sat, 17:30", club: "Puerto Padel · Buenos Aires", players: [PLAYERS[5]], slots: 3, level: "3.5–4.0", price: "$5" },
];

const CHATS = [
  { with: PLAYERS[1], preview: "Sounds good, see you Friday 👍", time: "12m", unread: 2 },
  { with: PLAYERS[3], preview: "First time in Tokyo — courts near Shibuya?", time: "1h", unread: 0 },
  { with: PLAYERS[4], preview: "I'll bring the balls this time!", time: "Yesterday", unread: 0 },
];

const FEED = [
  { author: PLAYERS[6], q: "Best padel racket for control vs power at 3.0 level?", replies: 5, likes: 12 },
  { author: PLAYERS[7], q: "Anyone playing indoor courts in winter in Istanbul?", replies: 3, likes: 7 },
];

function DemoPage() {
  const [tab, setTab] = useState<"play" | "grid" | "chat">("play");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const navigate = useNavigate();

  const goSignup = () => navigate({ to: "/auth", search: { redirect: undefined, join: undefined } });

  const nudge = (msg: string) => {
    toast(msg, {
      description: "Sign up (it's free) to unlock this.",
      action: { label: "Sign up", onClick: goSignup },
    });
  };

  return (
    <main className="programme-page min-h-screen bg-[var(--paper)] pb-24">
      {/* Sticky demo banner */}
      <div className="sticky top-0 z-40 bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="text-[13px] font-medium truncate">You're browsing a demo</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={goSignup}
            className="rounded-full bg-[var(--paper)] text-[var(--ink)] text-[12px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5 hover:brightness-95"
          >
            Sign up
          </button>
          <Link to="/" className="text-[var(--paper)]/70 hover:text-[var(--paper)] p-1" aria-label="Exit demo">
            <X className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[var(--ink)]/70 hover:text-[var(--ink)] text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <BrandMark />
        <Link to="/how-it-works" className="text-[13px] font-semibold text-[var(--plum)] underline underline-offset-4 decoration-[var(--plum)]/60 hover:decoration-[var(--plum)]">
          How it works
        </Link>
      </header>

      {/* Tabs */}
      <nav className="px-5 pt-3 pb-2 flex items-center gap-2 border-b border-[var(--ink)]/10">
        {([
          { id: "play", label: "Play", icon: Calendar },
          { id: "grid", label: "Players", icon: Users },
          { id: "chat", label: "Chat", icon: MessageCircle },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] transition ${
                active
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-transparent text-[var(--ink)]/60 hover:text-[var(--ink)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 sm:px-5 pt-4">
        {tab === "play" && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {MATCHES.map((m, i) => (
              <div key={i} className="rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-serif text-[22px] leading-tight text-[var(--ink)]">{m.when}</div>
                    <div className="mt-1 flex items-center gap-1 text-[13px] text-[var(--ink)]/70">
                      <MapPin className="w-3.5 h-3.5" /> {m.club}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]/55">
                      <span>Level {m.level}</span>
                      <span>·</span>
                      <span>{m.price}</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] rounded-full bg-[var(--plum)]/12 text-[var(--plum)] px-2 py-1 font-semibold whitespace-nowrap">
                    {m.slots} spot{m.slots > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {m.players.map((p, j) => (
                    <img key={j} src={p.photo} alt={p.name} className="w-9 h-9 rounded-full object-cover border-2 border-[var(--paper)] shadow" />
                  ))}
                  {Array.from({ length: m.slots }).map((_, j) => (
                    <button
                      key={`s${j}`}
                      onClick={() => nudge("Nice — join this match?")}
                      className="w-9 h-9 rounded-full border-2 border-dashed border-[var(--ink)]/25 text-[var(--ink)]/40 hover:border-[var(--plum)] hover:text-[var(--plum)] flex items-center justify-center transition"
                      aria-label="Join empty slot"
                    >
                      +
                    </button>
                  ))}
                  <div className="ml-auto">
                    <button
                      onClick={() => nudge("Great pick!")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.14em] px-3.5 py-2 hover:brightness-110"
                    >
                      Join <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-6 rounded-2xl border border-dashed border-[var(--ink)]/20 p-5 text-center">
              <div className="text-serif text-lg text-[var(--ink)]">Host your own match</div>
              <p className="text-sm text-[var(--ink)]/60 mt-1">Pick a court, invite the vibe.</p>
              <button
                onClick={goSignup}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--plum)] text-white text-[12px] font-semibold uppercase tracking-[0.14em] px-4 py-2"
              >
                Sign up to host
              </button>
            </div>
          </div>
        )}

        {tab === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {PLAYERS.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedPlayer(p)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--ink)]/10 shadow-sm text-left"
              >
                <img src={p.photo} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/10 to-transparent" />
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-[var(--paper)] text-[var(--ink)] rounded-full px-2 py-0.5">
                  {p.score}
                </span>
                <div className="absolute bottom-2 left-2 right-2 text-[var(--paper)]">
                  <div className="text-serif text-[17px] leading-tight">{p.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] opacity-80">
                    {p.country} {p.city}
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">Level {p.level.toFixed(1)}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "chat" && (
          <div className="max-w-2xl mx-auto">
            <div className="divide-y divide-[var(--ink)]/10 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] shadow-sm overflow-hidden">
              {CHATS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => nudge(`Reply to ${c.with.name}?`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--ink)]/[0.03] transition"
                >
                  <img src={c.with.photo} alt={c.with.name} className="w-11 h-11 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-serif text-[15px] text-[var(--ink)] truncate">{c.with.name}</div>
                      <div className="text-[11px] text-[var(--ink)]/50 whitespace-nowrap">{c.time}</div>
                    </div>
                    <div className="text-[13px] text-[var(--ink)]/65 truncate">{c.preview}</div>
                  </div>
                  {c.unread > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[var(--plum)] text-white text-[11px] font-semibold px-1.5">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Community feed preview */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-serif text-xl text-[var(--ink)]">Community</h3>
                <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink)]/55">Connect</span>
              </div>
              <div className="space-y-3">
                {FEED.map((f, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--ink)]/10 p-4 bg-[var(--paper)]">
                    <div className="flex items-center gap-2">
                      <img src={f.author.photo} alt={f.author.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="text-[13px] font-semibold text-[var(--ink)]">{f.author.name}</div>
                      <div className="text-[11px] text-[var(--ink)]/50 ml-auto">{f.author.city}</div>
                    </div>
                    <p className="mt-2 text-[14px] text-[var(--ink)]/85 leading-snug">{f.q}</p>
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-[var(--ink)]/60">
                      <button onClick={() => nudge("Like this post?")} className="inline-flex items-center gap-1 hover:text-[var(--plum)]">
                        <ThumbsUp className="w-3.5 h-3.5" /> {f.likes}
                      </button>
                      <button onClick={() => nudge("Join the conversation?")} className="inline-flex items-center gap-1 hover:text-[var(--plum)]">
                        <MessageCircle className="w-3.5 h-3.5" /> {f.replies}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player profile modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-[var(--ink)]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-[var(--paper)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/5]">
              <img src={selectedPlayer.photo} alt={selectedPlayer.name} className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[var(--paper)]/95 flex items-center justify-center shadow"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--ink)]/90 to-transparent text-[var(--paper)]">
                <div className="text-serif text-3xl leading-none">{selectedPlayer.name}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-80 mt-1">
                  {selectedPlayer.country} {selectedPlayer.city} · Level {selectedPlayer.level.toFixed(1)} · {selectedPlayer.age}
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]/55 mb-1.5">Vibe</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlayer.traits.map((tr, i) => (
                    <span key={i} className="rounded-full bg-[var(--ink)]/6 border border-[var(--ink)]/10 px-2.5 py-1 text-[12px] text-[var(--ink)]/75">{tr}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={goSignup}
                  className="rounded-full border border-[var(--ink)]/20 text-[var(--ink)] text-[12px] font-semibold uppercase tracking-[0.14em] py-2.5 hover:bg-[var(--ink)]/5 inline-flex items-center justify-center gap-1.5"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Connect
                </button>
                <button
                  onClick={goSignup}
                  className="rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.14em] py-2.5 hover:brightness-110 inline-flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Message
                </button>
              </div>
              <p className="text-[11px] text-[var(--ink)]/50 text-center pt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                Demo profile — sign up to meet real players near you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom fixed CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-[var(--paper)] via-[var(--paper)] to-transparent pt-6 pb-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            onClick={goSignup}
            className="flex-1 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.16em] text-[13px] py-3.5 hover:brightness-110 shadow-[0_18px_40px_-20px_rgba(15,62,46,0.55)]"
          >
            Sign up to play for real
          </button>
        </div>
      </div>
    </main>
  );
}
