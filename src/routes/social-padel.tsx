import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Smile, Shuffle, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LangSwitch } from "@/lib/i18n";

const TITLE = "Social Padel — Find Players & Casual Matches Near You";
const DESC =
  "Social padel is padel played for the company, not the ranking. Find friendly players at your level, join casual matches near you, and build a regular group on PadelMatch.";
const URL = "https://padelsetmatch.com/social-padel";

const FAQ = [
  {
    q: "What is social padel?",
    a: "Social padel is casual, non-competitive padel: mixed levels, no league, no ranking pressure. The point is a good game with good company, usually followed by a drink.",
  },
  {
    q: "How do I find social padel players near me?",
    a: "Create a profile on PadelMatch, set your city and level, and browse players around you. You can see who plays casually, when they are free, and message them directly to set up a match.",
  },
  {
    q: "Do I need to be good at padel?",
    a: "No. Social padel exists precisely for people who are still learning or came back after years off. Levels are shown on every profile so you can find someone who matches yours.",
  },
  {
    q: "Is it safe to play with strangers?",
    a: "Every profile is a real account, players can be reported or blocked, and you choose who you talk to. Most matches are arranged in public clubs or community courts.",
  },
];

export const Route = createFileRoute("/social-padel")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: SocialPadelPage,
});

const POINTS = [
  {
    icon: Smile,
    title: "No ranking pressure",
    body: "Mixed levels, friendly rules, nobody keeping a season table. You come to play and to meet people.",
  },
  {
    icon: Shuffle,
    title: "Rotating partners",
    body: "Social padel means you play with different people each week — the quickest way to improve and to build a real circle.",
  },
  {
    icon: Users,
    title: "A regular four",
    body: "Most people want one thing: three reliable players for a weekly game. That is what a player directory solves.",
  },
  {
    icon: ShieldCheck,
    title: "Real profiles",
    body: "Levels, preferred side, availability and languages are all on the card, so you know what you are walking into.",
  },
];

function SocialPadelPage() {
  return (
    <main className="programme-page min-h-screen bg-[var(--paper)]">
      <header className="px-5 sm:px-8 lg:px-16 pt-3 pb-2 flex items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2.5">
          <LangSwitch />
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.18em] px-4 py-2.5 hover:brightness-110 transition"
          >
            Join
          </Link>
        </div>
      </header>

      <section className="px-5 sm:px-8 lg:px-16 pt-10 pb-12 max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--plum)_14%,var(--paper))] border border-[color-mix(in_oklab,var(--plum)_22%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--plum)]">
          Guide
        </p>
        <h1 className="text-serif mt-4 uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem]">
          Social padel
          <span className="block text-[var(--plum)]">players near you</span>
        </h1>
        <p className="mt-5 text-[17px] leading-[1.6] text-[var(--ink)]/75">
          Social padel is padel played for the company, not the ranking. No league, no season table —
          just a good game with people you actually enjoy being on court with. The only real obstacle is
          finding those people, especially in a new city.
        </p>
        <div className="mt-7">
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.18em] text-[13px] pl-6 pr-3 py-3 hover:brightness-110 transition"
          >
            Browse players near you
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--paper)]/15 group-hover:translate-x-0.5 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          What makes it social
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 max-w-4xl">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl bg-white border border-[var(--ink)]/8 p-6 shadow-[0_18px_40px_-30px_rgba(15,62,46,0.35)]"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[color-mix(in_oklab,var(--plum)_16%,var(--paper))] text-[var(--plum)]">
                <Icon className="w-5 h-5" strokeWidth={2} />
              </span>
              <h3 className="text-serif mt-4 text-xl text-[var(--ink)]">{title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-[var(--ink)]/70">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10 max-w-3xl">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          Common questions
        </h2>
        <div className="mt-8 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="text-[16px] font-semibold text-[var(--ink)]">{f.q}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-[var(--ink)]/70">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-14 border-t border-[var(--ink)]/10">
        <div className="max-w-2xl">
          <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
            Find your four
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink)]/70">
            Set up a profile, browse the players around you, and join a casual match this week. Playing
            on a budget? See{" "}
            <Link to="/free-padel-courts" className="text-[var(--plum)] underline underline-offset-4">
              free padel courts
            </Link>{" "}
            or{" "}
            <Link to="/how-it-works" className="text-[var(--plum)] underline underline-offset-4">
              how it works
            </Link>
            .
          </p>
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="mt-6 inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.16em] text-[12px] px-5 py-3 hover:brightness-110 transition"
          >
            Create a free profile
          </Link>
        </div>
      </section>

      <footer className="bg-[var(--ink)] text-[var(--paper)]">
        <div className="h-1.5 bg-[var(--plum)]" aria-hidden />
        <div className="px-5 sm:px-8 lg:px-16 py-5 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="text-sm tracking-wide">padelsetmatch.com</Link>
          <div className="flex items-center gap-5 text-xs text-[var(--paper)]/70">
            <Link to="/terms" className="hover:text-[var(--paper)]">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--paper)]">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
