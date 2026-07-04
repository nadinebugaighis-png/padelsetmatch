import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTr } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";


export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — PadelMatch" },
      { name: "description", content: "Learn how PadelMatch protects your privacy and helps you find great padel partners, friends and meaningful connections." },
      { property: "og:title", content: "How PadelMatch works" },
      { property: "og:description", content: "Privacy-first padel matching. Find players who click with you — no pressure, no awkwardness." },
    ],
  }),
  component: HowItWorksPage,
});

function StepCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="surface-card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--ball)]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-8 rounded-full bg-[var(--ball)] text-[var(--court-deep)] text-xs font-bold flex items-center justify-center">
          {number}
        </span>
      </div>
      <h3 className="text-display text-xl text-[var(--cream)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--cream)]/70 leading-relaxed">{body}</p>
    </div>
  );
}


function FeatureRow({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div>
      <h4 className="text-base font-semibold text-[var(--cream)]">{title}</h4>
      <p className="mt-1 text-sm text-[var(--cream)]/70 leading-relaxed">{body}</p>
    </div>
  );
}


function HowItWorksPage() {
  const t = useT();
  const tr = useTr();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="px-6 lg:px-16 pt-6 pb-12 max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--cream)]/60 hover:text-[var(--ball)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {tr("Back to home", "Volver al inicio")}
        </Link>

        <div className="mt-8">
          <p className="chip chip-clay mb-4">{tr("The social game", "El juego social")}</p>
          <h1 className="text-display text-5xl md:text-6xl lg:text-7xl text-[var(--cream)] leading-[0.95]">
            {tr("Padel is a team sport.", "El pádel es un deporte de equipo.")}
            <br />
            <span style={{ color: "var(--ball)" }}>
              {tr("So it's important you have the right teammate.", "Así que es importante tener al compi adecuado.")}
            </span>
          </h1>
          <p className="mt-6 text-lg text-[var(--cream)]/80 max-w-2xl leading-relaxed">
            {tr(
              "PadelMatch is built on one simple idea: padel is more fun when you play with people who match your energy. We use AI to connect you with compatible players, help you discover free courts and games, and spend less time searching so you can spend more time playing. Great matches that lead to teammates, lasting friendships, or even something more — but every connection starts with a great game.",
              "PadelMatch se basa en una idea sencilla: el pádel es más divertido cuando juegas con gente que comparte tu energía. Usamos IA para conectarte con jugadores compatibles, ayudarte a descubrir pistas y partidos gratuitos, y pasar menos tiempo buscando para poder pasar más tiempo jugando. Grandes matches que llevan a compañeros de equipo, amistades duraderas o incluso algo más — pero cada conexión empieza con un gran partido."
            )}
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 lg:px-16 py-12 border-t border-[var(--cream)]/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-display text-3xl md:text-4xl text-[var(--cream)]">
            {tr("How it works", "Cómo funciona")}
          </h2>
          <p className="mt-2 text-[var(--cream)]/70 max-w-xl">
            {tr(
              "Four simple steps from signup to your first match on court.",
              "Cuatro pasos sencillos desde el registro hasta tu primer match en pista."
            )}
          </p>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <StepCard
              number="1"
              title={tr("Create your profile", "Crea tu perfil")}
              body={tr(
                "Who you are, where you play, your level and what matters to you. Your preferences stay private — they're only used by our AI to find matches, never shown on your public profile.",
                "Quién eres, dónde juegas, tu nivel y qué te importa. Tus preferencias son privadas — solo las usa nuestra IA para encontrar matches, nunca se muestran en tu perfil público."
              )}
            />
            <StepCard
              number="2"
              title={tr("Answer your Matchmaking code", "Responde tu Código de afinidad")}
              body={tr(
                "Our AI generates personalized questions based on your profile. Answer as many as you like — each shared answer sharpens your matches. Skip anything that feels too personal. You're in control.",
                "Nuestra IA genera preguntas personalizadas según tu perfil. Responde las que quieras — cada respuesta compartida afina tus matches. Salta lo que te resulte muy personal. Tú mandas."
              )}
            />
            <StepCard
              number="3"
              title={tr("Browse the Grid", "Explora el Grid")}
              body={tr(
                "See players who match your level, zone and personality. Tap the ones you'd play with. They won't know you tapped them unless they tap you back — no awkwardness, no obligation.",
                "Ve jugadores que encajan con tu nivel, zona y personalidad. Toca con quien jugarías. No sabrán que les has dado a conectar a menos que te lo devuelvan — sin awkwardness, sin obligación."
              )}
            />
            <StepCard
              number="4"
              title={tr("Chat & Organize", "Chatea y organiza")}
              body={tr(
                "When you both tap, a chat opens. Coordinate your match and book a public court on Playtomic — or, if someone has free access to a padel court, arrange the game right there and invite more players to join. You don't have to leave the app.",
                "Cuando os tocáis mutuamente, se abre el chat. Coordinad el partido y reservad una pista pública en Playtomic — o, si alguien tiene acceso gratuito a una pista, organizad el partido ahí mismo e invitad a más jugadores. No tienes que salir de la app."
              )}
            />
          </div>
        </div>
      </section>


      {/* Privacy & Safety */}
      <section className="px-6 lg:px-16 py-12 border-t border-[var(--cream)]/10 bg-[var(--court-deep)]/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-display text-3xl md:text-4xl text-[var(--cream)]">
            {tr("Built with your privacy in mind", "Hecho pensando en tu privacidad")}
          </h2>
          <p className="mt-2 text-[var(--cream)]/70 max-w-xl">
            {tr(
              "We believe you should enjoy the journey without worrying about your data or feeling exposed.",
              "Creemos que deberías disfrutar del camino sin preocuparte por tus datos ni sentirte expuesto."
            )}
          </p>

          <div className="mt-8 space-y-6 max-w-2xl">
            <FeatureRow
              title={tr("Your answers are private", "Tus respuestas son privadas")}
              body={tr(
                "Your matchmaking answers are never shown publicly. Only when two people share an answer does it contribute to their match score. Nobody sees what you answered alone.",
                "Tus respuestas de afinidad nunca se muestran públicamente. Solo cuando dos personas comparten una respuesta contribuye a su puntuación de match. Nadie ve lo que respondiste tú solo."
              )}
            />
            <FeatureRow
              title={tr("Anonymous-first likes", "Likes anónimos primero")}
              body={tr(
                "Tap someone you like? They'll never know unless they tap you back. This removes all pressure and awkwardness — you're free to explore without fear of rejection or unwanted attention.",
                "¿Le das a conectar a alguien? No lo sabrá a menos que te lo devuelva. Esto elimina toda presión y awkwardness — eres libre de explorar sin miedo al rechazo ni atención no deseada."
              )}
            />
            <FeatureRow
              title={tr("Safety by design", "Seguridad por diseño")}
              body={tr(
                "We encourage booking through Playtomic for verified public courts. Block and report tools are one tap away. Reports are reviewed by real humans, and offending accounts are suspended immediately.",
                "Animamos a reservar a través de Playtomic para pistas públicas verificadas. Bloquear y reportar está a un toque. Los reportes los revisan humanos reales, y las cuentas infractoras se suspenden al instante."
              )}
            />
            <FeatureRow
              title={tr("You control your intent", "Tú controlas tu intención")}
              body={tr(
                "Looking for padel partners, friends, or something more? Set your preferences privately. If you're only here for padel and friendship, you'll never see relationship questions — or anyone interested in a relationship with you — and vice versa.",
                "¿Buscas compis de pádel, amigos o algo más? Configura tus preferencias en privado. Si solo estás aquí para pádel y amistad, nunca verás preguntas de relación — ni a nadie interesado en una relación contigo — y viceversa."
              )}
            />
            <FeatureRow
              title={tr("Free court access", "Pista propia")}
              body={tr(
                "Players with court access can mark it on their profile. It's a great way to play for free and meet new people — just coordinate through chat and enjoy the game.",
                "Los jugadores con pista propia pueden marcarlo en su perfil. Es una gran forma de jugar gratis y conocer gente — solo coordinad por chat y disfrutad del partido."
              )}
            />
            <FeatureRow
              title={tr("Your grid is yours alone", "Tu grid es solo tuyo")}
              body={tr(
                "No one can see who you've tapped, skipped, or matched with on your grid. Your activity stays completely private — there is no public feed or visibility into anyone else's grid.",
                "Nadie puede ver a quién has dado a conectar, a quién has saltado o con quién has hecho match en tu grid. Tu actividad es completamente privada — no hay feed público ni visibilidad del grid de nadie más."
              )}
            />
            <FeatureRow
              title={tr("Hide someone, disappear from theirs", "Oculta a alguien y desaparece del suyo")}
              body={tr(
                "Not interested in someone for any reason? Hide them and you'll automatically be removed from their grid too. Clean, mutual, and completely drama-free.",
                "¿No te interesa alguien por cualquier motivo? Ocúltalo y tú desaparecerás automáticamente de su grid también. Limpio, mutuo y sin dramas."
              )}
            />
          </div>
        </div>
      </section>

      {/* The philosophy */}
      <section className="px-6 lg:px-16 py-12 border-t border-[var(--cream)]/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-display text-3xl md:text-4xl text-[var(--cream)]">
            {tr("Why padel changes everything", "Por qué el pádel lo cambia todo")}
          </h2>
          <p className="mt-2 text-[var(--cream)]/70 max-w-2xl">
            {tr(
              "Padel isn't just a sport — it's a social experience built on communication, teamwork and trust. Every match is a chance to meet someone new in a fun, low-pressure environment.",
              "El pádel no es solo un deporte — es una experiencia social basada en la comunicación, el trabajo en equipo y la confianza. Cada partido es una oportunidad de conocer a alguien nuevo en un ambiente divertido y sin presión."
            )}
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="text-display text-lg text-[var(--cream)]">
                {tr("Teamwork", "Trabajo en equipo")}
              </h3>
              <p className="mt-2 text-sm text-[var(--cream)]/60 px-2">
                {tr(
                  "You win or lose together. Padel teaches you to read your partner, communicate without words, and build trust fast.",
                  "Ganas o pierdes juntos. El pádel te enseña a leer a tu compi, comunicarte sin palabras y generar confianza rápido."
                )}
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-display text-lg text-[var(--cream)]">
                {tr("Communication", "Comunicación")}
              </h3>
              <p className="mt-2 text-sm text-[var(--cream)]/60 px-2">
                {tr(
                  "Every rally is a conversation. You learn how someone thinks under pressure, how they celebrate wins, and how they handle mistakes.",
                  "Cada punto es una conversación. Aprendes cómo piensa alguien bajo presión, cómo celebra las victorias y cómo gestiona los errores."
                )}
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-display text-lg text-[var(--cream)]">
                {tr("Community", "Comunidad")}
              </h3>
              <p className="mt-2 text-sm text-[var(--cream)]/60 px-2">
                {tr(
                  "The padel community is welcoming and diverse. Whether you're a beginner or a pro, there's always someone to play with and learn from.",
                  "La comunidad de pádel es acogedora y diversa. Ya seas principiante o pro, siempre hay alguien con quien jugar y de quien aprender."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-16 py-16 border-t border-[var(--cream)]/10 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-display text-4xl md:text-5xl text-[var(--cream)]">
            {tr("Ready to find your match?", "¿Listo para encontrar tu match?")}
          </h2>
          <p className="mt-4 text-[var(--cream)]/70">
            {tr(
              "Join thousands of players worldwide. Your next great game — and maybe your next great friend — is one tap away.",
              "Únete a miles de jugadores en todo el mundo. Tu próximo gran partido — y quizás tu próximo gran amigo — está a un toque."
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ redirect: undefined, join: undefined }}
              className="inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-8 py-3 hover:opacity-90"
            >
              {tr("Join free", "Únete gratis")}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-[var(--cream)]/30 text-[var(--cream)] font-semibold px-8 py-3 hover:bg-[var(--cream)]/5"
            >
              {tr("Back to home", "Volver al inicio")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 text-xs text-[var(--cream)]/50 flex flex-wrap items-center justify-between gap-3 max-w-4xl mx-auto">
        <span>{t("land.foot")}</span>
        <span className="flex gap-4">
          <Link to="/terms" className="hover:text-[var(--cream)]">Terms</Link>
          <Link to="/privacy" className="hover:text-[var(--cream)]">Privacy</Link>
        </span>
      </footer>
    </main>
  );
}
