import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — PadelMatch" },
      { name: "description", content: "Social padel, not court booking. Meet players in your zone, in your age range, matched by level and by what you're here for." },
      { property: "og:title", content: "How PadelMatch works" },
      { property: "og:description", content: "Social padel. In your zone. Your age. Your vibe." },
    ],
  }),
  component: HowItWorksPage,
});

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5 sm:gap-6">
      <span className="shrink-0 text-serif text-4xl sm:text-5xl leading-none text-[var(--plum)] tabular-nums">
        {n}
      </span>
      <div className="pt-1.5 border-t border-[var(--ink)]/15 flex-1">
        <h3 className="text-serif text-xl sm:text-2xl text-[var(--ink)] tracking-[-0.01em]">{title}</h3>
        <p className="mt-2 text-[15px] text-[var(--ink)]/70 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function HowItWorksPage() {
  const t = useT();
  const tr = useTr();

  return (
    <main className="programme-page min-h-screen flex flex-col">
      <header className="px-5 sm:px-8 lg:px-16 pt-6 pb-4 flex items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2.5">
          <LangSwitch />
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined }}
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.18em] px-4 py-2.5 hover:brightness-110 transition"
          >
            {t("land.signin")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-5 sm:px-8 lg:px-16 pt-10 sm:pt-16 pb-10 max-w-2xl mx-auto w-full">
        <span className="inline-block text-[11px] uppercase tracking-[0.28em] text-[var(--plum)] font-semibold">
          {tr("Social padel", "Pádel social", "Padel social")}
        </span>
        <h1 className="mt-5 text-serif uppercase text-[var(--ink)] leading-[0.92] tracking-[-0.02em] text-[2.75rem] sm:text-6xl">
          {tr("Not a booking app.", "No es una app de reservas.", "Pas une app de réservation.")}
          <br />
          <span className="text-[var(--plum)]">
            {tr("A padel circle.", "Un círculo de pádel.", "Un cercle de padel.")}
          </span>
        </h1>
        <p className="mt-6 text-[16px] sm:text-lg text-[var(--ink)]/75 leading-relaxed">
          {tr(
            "Meet players in your zone, in your age range, matched by level and by what you're here for — just padel, friends, or something more.",
            "Conoce a jugadores de tu zona, en el rango de edad que elijas, emparejados por nivel y por lo que buscas — solo pádel, amistad o algo más.",
            "Rencontre des joueurs de ta zone, dans ta tranche d'âge, matchés par niveau et par ce que tu cherches — juste padel, amitié ou plus."
          )}
        </p>
      </section>

      {/* 3 Steps */}
      <section className="px-5 sm:px-8 lg:px-16 pb-16 max-w-2xl mx-auto w-full">
        <div className="space-y-8 sm:space-y-10">
          <Step
            n="01"
            title={tr("Set your intent", "Elige qué buscas", "Choisis ce que tu cherches")}
            body={tr(
              "Just padel, friends, or more. Everything else — who you see, how you're matched — follows from this.",
              "Solo pádel, amistad o más. Todo lo demás — a quién ves, cómo se te empareja — parte de ahí.",
              "Juste padel, amitié ou plus. Tout le reste — qui tu vois, comment on te matche — en découle."
            )}
          />
          <Step
            n="02"
            title={tr("Meet your zone", "Conoce tu zona", "Découvre ta zone")}
            body={tr(
              "Only players in the zones where you live or play, and only in the age range you set. Local, always.",
              "Solo jugadores de las zonas donde vives o juegas, y solo en el rango de edad que marques. Siempre cercano.",
              "Uniquement des joueurs des zones où tu vis ou joues, dans la tranche d'âge que tu choisis. Local, toujours."
            )}
          />
          <Step
            n="03"
            title={tr("Match, chat, play", "Empareja, chatea, juega", "Match, chatte, joue")}
            body={tr(
              "Pulse who you'd play with. They only know if they pulse back. Then chat opens, and you book the court.",
              "Pulsa a quien te apetezca. Solo lo sabrán si te devuelven el gesto. Se abre el chat y reserváis pista.",
              "Tape qui tu veux. Ils ne le sauront que s'ils te tapent en retour. Le chat s'ouvre, vous réservez."
            )}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-8 lg:px-16 py-14 border-t border-[var(--ink)]/10">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-serif text-3xl sm:text-4xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("Ready to play?", "¿Listo para jugar?", "Prêt·e à jouer ?")}
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ redirect: undefined, join: undefined }}
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.18em] text-[13px] pl-6 pr-3 py-3.5 hover:brightness-110 shadow-[0_18px_40px_-20px_rgba(15,62,46,0.55)] transition"
            >
              {tr("Join free", "Únete gratis", "Inscription gratuite")}
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--paper)]/15 group-hover:translate-x-0.5 transition">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-[var(--ink)]/25 text-[var(--ink)] font-semibold uppercase tracking-[0.18em] text-[13px] px-6 py-3.5 hover:bg-[var(--ink)] hover:text-[var(--paper)] transition"
            >
              {tr("Back to home", "Volver al inicio", "Retour à l'accueil")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[var(--ink)] text-[var(--paper)] mt-auto">
        <div className="h-1.5 bg-[var(--plum)]" aria-hidden />
        <div className="px-5 sm:px-8 lg:px-16 py-5 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm tracking-wide text-[var(--paper)]/90">{t("land.foot")}</span>
          <div className="flex items-center gap-5 text-xs text-[var(--paper)]/70">
            <Link to="/terms" className="hover:text-[var(--paper)]">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--paper)]">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
