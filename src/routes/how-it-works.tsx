import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { ArrowRight, MapPin, Sparkles, EyeOff, Lock } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — PadelMatch" },
      { name: "description", content: "Social padel, not just court booking. Meet compatible players in your zone, in your age range, matched by what you're here for." },
      { property: "og:title", content: "How PadelMatch works" },
      { property: "og:description", content: "Social padel in your zone. Matched by level, age range and what you're here for." },
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

      {/* Hero */}
      <section className="px-5 sm:px-8 lg:px-16 pt-8 pb-10 max-w-3xl mx-auto w-full">
        <span className="inline-block text-[11px] uppercase tracking-[0.22em] text-[var(--plum)] font-semibold mb-4">
          {tr("Social padel", "Pádel social", "Padel social")}
        </span>
        <h1 className="text-serif uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.5rem] sm:text-6xl">
          {tr("How PadelMatch works", "Cómo funciona PadelMatch", "Comment PadelMatch fonctionne")}
        </h1>
        <p className="mt-5 text-[15px] sm:text-lg text-[var(--ink)]/75 leading-relaxed">
          {tr(
            "Not a court booking app. PadelMatch is social padel: meet players in your zone, in your age range, matched by level and by what you're actually here for.",
            "No es una app para reservar pista. PadelMatch es pádel social: conoce a gente de tu zona, en el rango de edad que elijas, emparejada por nivel y por lo que buscas de verdad.",
            "Ce n'est pas une app de réservation. PadelMatch, c'est du padel social : rencontre des joueurs de ta zone, dans ta tranche d'âge, matchés par niveau et par ce que tu cherches vraiment."
          )}
        </p>
      </section>

      {/* 3 Steps */}
      <section className="px-5 sm:px-8 lg:px-16 pb-4 max-w-3xl mx-auto w-full">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <Step
            n="1"
            title={tr("Tell us what you're here for", "Dinos qué buscas", "Dis-nous ce que tu cherches")}
            body={tr(
              "Just padel, friendship, or something more. Your choice shapes everything — who you see and what the AI asks you.",
              "Solo pádel, amistad o algo más. Tu elección lo cambia todo — a quién ves y qué te pregunta la IA.",
              "Juste padel, amitié, ou plus. Ton choix change tout — qui tu vois et ce que l'IA te demande."
            )}
          />
          <Step
            n="2"
            title={tr("Answer a few private questions", "Responde unas preguntas privadas", "Réponds à quelques questions privées")}
            body={tr(
              "The AI asks about your level and vibe on court. Chose friendship too? It also asks how you like to spend your time. Your answers are never shared.",
              "La IA te pregunta por tu nivel y tu rollo en la pista. ¿También marcaste amistad? Te preguntará cómo te gusta pasar el tiempo. Tus respuestas no se comparten nunca.",
              "L'IA te pose des questions sur ton niveau et ton attitude sur le terrain. Tu as coché amitié aussi ? Elle te demande comment tu aimes passer ton temps. Tes réponses ne sont jamais partagées."
            )}
          />
          <Step
            n="3"
            title={tr("Match, chat, play", "Empareja, chatea, juega", "Match, chat, joue")} 
            body={tr(
              "See compatible players nearby. Pulse the ones you like — they only find out if they pulse you back. Then chat and book a court.",
              "Ves jugadores compatibles cerca. Pulsa a los que te interesen — solo se enterarán si te devuelven el gesto. Después, chat y a reservar pista.",
              "Vois les joueurs compatibles près de toi. Tape ceux qui t'intéressent — ils ne le sauront que s'ils te tapent en retour. Ensuite, chat et réservation."
            )}
          />
        </div>
      </section>

      {/* Why it's different */}
      <section className="px-5 sm:px-8 lg:px-16 py-14 mt-8 border-t border-[var(--ink)]/10 bg-[var(--paper-2)]/60">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-serif text-2xl sm:text-3xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("What makes it different", "Qué lo hace diferente", "Ce qui change")}
          </h2>
          <div className="mt-8 grid sm:grid-cols-1 gap-6">
            <Pillar
              icon={MapPin}
              title={tr("Local and your age", "De tu zona y tu edad", "Local et ton âge")}
              body={tr(
                "You only see people in the zones where you live or usually play, and only in the age range you choose.",
                "Solo ves a gente de las zonas donde vives o sueles jugar, y solo en el rango de edad que elijas.",
                "Tu ne vois que des personnes dans les zones où tu vis ou joues, et uniquement dans la tranche d'âge que tu choisis."
              )}
            />
            <Pillar
              icon={Sparkles}
              title={tr("Compatibility, not just level", "Compatibilidad, no solo nivel", "Compatibilité, pas juste niveau")}
              body={tr(
                "Your compatibility score depends on what you're here for. Just padel? Level and court personality. Friendship too? Personality and shared interests.",
                "Tu puntuación de compatibilidad depende de qué buscas. ¿Solo pádel? Nivel y personalidad en pista. ¿También amistad? Personalidad y aficiones en común.",
                "Ton score de compatibilité dépend de ce que tu cherches. Juste padel ? Niveau et attitude sur le terrain. Amitié aussi ? Personnalité et centres d'intérêt."
              )}
            />
            <Pillar
              icon={Lock}
              title={tr("Your answers stay yours", "Tus respuestas son tuyas", "Tes réponses restent à toi")}
              body={tr(
                "The AI uses your answers to match you — but nobody ever sees them. Not other players, not your matches.",
                "La IA usa tus respuestas para emparejarte — pero nadie las ve. Ni otros jugadores, ni tus matches.",
                "L'IA utilise tes réponses pour te matcher — mais personne ne les voit. Ni les autres joueurs, ni tes matches."
              )}
            />
            <Pillar
              icon={EyeOff}
              title={tr("Hide by group, not just by person", "Oculta por grupo, no solo por persona", "Masque par groupe, pas juste par personne")}
              body={tr(
                "Not interested in someone as a friend but happy to play padel with them? Hide them from the friendship group only. They still see you for padel.",
                "¿Alguien no te interesa como amistad pero no te importa jugar al pádel con esa persona? Ocúltala solo del grupo de amistad. Te seguirá viendo para pádel.",
                "Quelqu'un ne t'intéresse pas comme ami mais tu joues volontiers au padel avec ? Masque-le uniquement du groupe amitié. Il te voit toujours pour le padel."
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
