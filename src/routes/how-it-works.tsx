import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { ArrowRight, Shield, Heart, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — PadelMatch" },
      { name: "description", content: "PadelMatch in 3 steps: create a profile, get matched with compatible players, chat and play. Privacy-first, no pressure." },
      { property: "og:title", content: "How PadelMatch works" },
      { property: "og:description", content: "Find padel partners who click with you. In 3 steps. Privacy-first." },
    ],
  }),
  component: HowItWorksPage,
});

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--ink)]/10 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-semibold flex items-center justify-center text-serif">
          {n}
        </span>
        <h3 className="text-serif text-lg sm:text-xl text-[var(--ink)]">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-[var(--ink)]/70 leading-relaxed">{body}</p>
    </div>
  );
}

function Pillar({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[color-mix(in_oklab,var(--plum)_14%,var(--paper))] border border-[color-mix(in_oklab,var(--plum)_22%,transparent)] text-[var(--plum)]">
        <Icon className="w-4 h-4" strokeWidth={2} />
      </span>
      <div>
        <h4 className="text-base font-semibold text-[var(--ink)]">{title}</h4>
        <p className="mt-1 text-sm text-[var(--ink)]/65 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function HowItWorksPage() {
  const t = useT();
  const tr = useTr();

  return (
    <main className="programme-page min-h-screen flex flex-col">
      {/* Header */}
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

      {/* Hero — one promise, one line */}
      <section className="px-5 sm:px-8 lg:px-16 pt-8 pb-10 max-w-3xl mx-auto w-full">
        <h1 className="text-serif uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.5rem] sm:text-6xl">
          {tr("How PadelMatch works", "Cómo funciona PadelMatch", "Comment PadelMatch fonctionne")}
        </h1>
        <p className="mt-5 text-[15px] sm:text-lg text-[var(--ink)]/75 leading-relaxed">
          {tr(
            "Find padel players who match your level, your zone and your vibe. In 3 steps.",
            "Encuentra jugadores de pádel que encajan con tu nivel, tu zona y tu rollo. En 3 pasos.",
            "Trouve des joueurs de padel qui matchent ton niveau, ta zone et ton feeling. En 3 étapes."
          )}
        </p>
      </section>

      {/* 3 Steps */}
      <section className="px-5 sm:px-8 lg:px-16 pb-4 max-w-3xl mx-auto w-full">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <Step
            n="1"
            title={tr("Set up your profile", "Configura tu perfil", "Crée ton profil")}
            body={tr(
              "Level, zone, and what you're here for. Takes 2 minutes.",
              "Nivel, zona y para qué estás aquí. En 2 minutos.",
              "Niveau, zone et ce que tu cherches. 2 minutes."
            )}
          />
          <Step
            n="2"
            title={tr("Get matched", "Recibe tus matches", "Reçois tes matches")}
            body={tr(
              "Our AI shows you compatible players nearby. Tap the ones you'd play with — they only find out if they tap you back.",
              "Nuestra IA te muestra jugadores compatibles cerca de ti. Pulsa a los que te interesen — solo lo sabrán si te devuelven el gesto.",
              "Notre IA te montre les joueurs compatibles près de toi. Tape ceux qui t'intéressent — ils ne le sauront que s'ils te tapent en retour."
            )}
          />
          <Step
            n="3"
            title={tr("Chat and play", "Chatea y juega", "Chatte et joue")}
            body={tr(
              "When you both tap, a chat opens. Book a court and play.",
              "Cuando os pulsáis los dos, se abre el chat. Reservad pista y a jugar.",
              "Quand vous vous tapez tous les deux, un chat s'ouvre. Réservez et jouez."
            )}
          />
        </div>
      </section>

      {/* What makes it different — 3 short pillars */}
      <section className="px-5 sm:px-8 lg:px-16 py-14 mt-8 border-t border-[var(--ink)]/10 bg-[var(--paper-2)]/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-serif text-2xl sm:text-3xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("Why it works", "Por qué funciona", "Pourquoi ça marche")}
          </h2>
          <div className="mt-8 grid sm:grid-cols-1 gap-6">
            <Pillar
              icon={Shield}
              title={tr("Private by default", "Privado por defecto", "Privé par défaut")}
              body={tr(
                "Your answers stay private. Nobody sees who you tap unless they tap you back.",
                "Tus respuestas son privadas. Nadie ve a quién pulsas a menos que te devuelvan el gesto.",
                "Tes réponses restent privées. Personne ne voit qui tu tapes tant qu'il ne te tape pas en retour."
              )}
            />
            <Pillar
              icon={Heart}
              title={tr("No pressure, no awkwardness", "Sin presión, sin momentos incómodos", "Sans pression, sans gêne")}
              body={tr(
                "Anonymous likes mean you can explore freely. Hide anyone at any time — they disappear from your feed and you from theirs.",
                "Los «me interesa» anónimos te dejan explorar con libertad. Oculta a cualquiera cuando quieras — desaparece de tu feed y tú del suyo.",
                "Les likes anonymes te laissent explorer librement. Masque n'importe qui à tout moment — il disparaît de ton feed et toi du sien."
              )}
            />
            <Pillar
              icon={Users}
              title={tr("Real matches, real games", "Matches reales, partidos reales", "Vrais matches, vraies parties")}
              body={tr(
                "Matched on level, zone and personality — so you actually enjoy the game, not just fill a fourth spot.",
                "Emparejamiento por nivel, zona y personalidad — así disfrutas del partido de verdad, no solo cubres un cuarto puesto.",
                "Match sur niveau, zone et personnalité — tu profites vraiment de la partie, tu ne fais pas juste le quatrième."
              )}
            />
          </div>
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

      {/* Footer */}
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
