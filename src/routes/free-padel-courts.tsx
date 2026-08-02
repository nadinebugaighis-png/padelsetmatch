import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Users, KeyRound, CalendarCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LangSwitch } from "@/lib/i18n";

const TITLE = "Free Padel Courts — Find Free & Private Courts Near You";
const DESC =
  "How to find free padel courts near you: community courts, urbanisation and private courts opened up by neighbours, and off-peak club slots. Join players with free court access on PadelMatch.";
const URL = "https://padelsetmatch.com/free-padel-courts";

const FAQ = [
  {
    q: "Are there really free padel courts?",
    a: "Yes. Many towns run municipal courts that are free or nearly free off-peak, and thousands of private urbanisation and community courts sit empty because residents cannot find a fourth player. Those are the courts most people never hear about.",
  },
  {
    q: "How do I find a free padel court near me?",
    a: "Start with your local council's sports pages for municipal courts, then look for players who already have court access. On PadelMatch, players who can bring a free or private court are marked with a court badge, so you can see who to ask before you book anything.",
  },
  {
    q: "Do I need a club membership to play?",
    a: "No. If you play on a community, urbanisation or municipal court with someone who has access, there is nothing to join and usually nothing to pay beyond a small booking fee, if any.",
  },
  {
    q: "What does it cost to play padel otherwise?",
    a: "A club court in Spain typically runs €16–€28 per hour, split between four players. Playing on a free or private court removes that cost entirely.",
  },
];

export const Route = createFileRoute("/free-padel-courts")({
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
  component: FreeCourtsPage,
});

const WAYS = [
  {
    icon: MapPin,
    title: "Municipal courts",
    body: "Councils across Spain run public padel courts that are free or a few euros off-peak. Check your town hall's sports page — availability is rarely advertised anywhere else.",
  },
  {
    icon: KeyRound,
    title: "Urbanisation & private courts",
    body: "The biggest hidden supply. Thousands of community courts sit unused because the resident cannot find three more players. Get invited and you play for nothing.",
  },
  {
    icon: CalendarCheck,
    title: "Off-peak club slots",
    body: "Clubs discount mid-morning and late-night slots heavily. Split across four players it often lands near free.",
  },
  {
    icon: Users,
    title: "Players with court access",
    body: "The fastest route: find someone who already has a court and needs a fourth. On PadelMatch these players carry a court badge on their card.",
  },
];

function FreeCourtsPage() {
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
          Free padel courts
          <span className="block text-[var(--plum)]">near you</span>
        </h1>
        <p className="mt-5 text-[17px] leading-[1.6] text-[var(--ink)]/75">
          Court fees are the main reason people play less padel than they want to. But a huge share of
          courts — municipal, community, urbanisation — are free to use and sitting empty right now. The
          hard part was never the court. It is finding the other three players.
        </p>
        <div className="mt-7">
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.18em] text-[13px] pl-6 pr-3 py-3 hover:brightness-110 transition"
          >
            Find players with courts
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--paper)]/15 group-hover:translate-x-0.5 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          Four ways to play for free
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 max-w-4xl">
          {WAYS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl bg-white border border-[var(--ink)]/8 p-6 shadow-[0_18px_40px_-30px_rgba(15,62,46,0.35)]"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--ink)]/8 text-[var(--ink)]">
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
            Court sorted. Now find the fourth.
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink)]/70">
            PadelMatch is a directory of padel players near you. See who plays your level, who is free
            this week, and who can bring a court.{" "}
            <Link to="/social-padel" className="text-[var(--plum)] underline underline-offset-4">
              Read about social padel
            </Link>{" "}
            or{" "}
            <Link to="/how-it-works" className="text-[var(--plum)] underline underline-offset-4">
              see how it works
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
