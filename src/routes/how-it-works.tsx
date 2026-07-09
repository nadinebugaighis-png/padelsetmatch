import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { ArrowRight, Shield, Users, MessageSquareHeart, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

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
    <div className="relative rounded-2xl bg-white border border-[var(--ink)]/10 p-6 shadow-[0_1px_2px_rgba(15,62,46,0.04),0_12px_28px_-20px_rgba(15,62,46,0.18)]">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] text-sm font-semibold flex items-center justify-center text-serif">
          {number}
        </span>
        <span className="h-px flex-1 bg-[var(--ink)]/10" />
      </div>
      <h3 className="text-serif text-xl leading-tight text-[var(--ink)]">{title}</h3>
      <p className="mt-2.5 text-sm text-[var(--ink)]/70 leading-relaxed">{body}</p>
    </div>
  );
}

function FeatureRow({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
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

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ink)]/10 bg-white p-6">
      <div className="w-8 h-8 rounded-full bg-[var(--grass)]/50 border border-[var(--ink)]/10" />
      <h3 className="mt-4 text-serif text-xl text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--ink)]/65 leading-relaxed">{body}</p>
    </div>
  );
}

function HowItWorksPage() {
  const t = useT();
  const tr = useTr();

  return (
    <main className="programme-page min-h-screen flex flex-col">
      {/* Header — matches landing / auth / app */}
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
      <section className="px-5 sm:px-8 lg:px-16 pt-6 pb-14 max-w-4xl mx-auto w-full">
        <p className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--plum)_16%,var(--paper))] border border-[color-mix(in_oklab,var(--plum)_25%,transparent)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--plum)]">
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
          {tr("The social game", "El juego social", "Le jeu social")}
        </p>

        <h1 className="text-serif mt-6 uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.75rem] sm:text-6xl md:text-7xl">
          <span className="block">{tr("Padel is a team sport.", "El pádel es un deporte de equipo.", "Le padel est un sport d'équipe.")}</span>
          <span className="block text-[var(--plum)]">
            {tr("So it's important you have the right teammate.", "Así que es importante tener al compi adecuado.", "Il faut donc avoir le bon coéquipier.")}
          </span>
        </h1>

        <p className="mt-7 text-[15px] sm:text-base text-[var(--ink)]/75 max-w-2xl leading-[1.7]">
          {tr("PadelMatch is built on one simple idea: padel is more fun when you play with people who match your energy. We use AI to connect you with compatible players, help you discover free courts and games, and spend less time searching so you can spend more time playing. Great matches that lead to teammates, lasting friendships, or even something more — but every connection starts with a great game.", "PadelMatch se basa en una idea sencilla: el pádel es más divertido cuando juegas con gente que comparte tu energía. Usamos IA para conectarte con jugadores compatibles, ayudarte a descubrir pistas y partidos gratuitos, y pasar menos tiempo buscando para poder pasar más tiempo jugando. Grandes matches que llevan a compañeros de equipo, amistades duraderas o incluso algo más — pero cada conexión empieza con un gran partido.", "PadelMatch repose sur une idée simple : le padel est plus fun quand tu joues avec des gens qui matchent ton énergie. On utilise l'IA pour te connecter à des joueurs compatibles, te faire découvrir des pistas et des parties gratuites, et te faire passer moins de temps à chercher pour en passer plus à jouer. De beaux matches qui mènent à des coéquipiers, des amitiés durables, voire plus — mais chaque connexion commence par une bonne partie.")}
        </p>
      </section>

      {/* Steps */}
      <section className="px-5 sm:px-8 lg:px-16 py-14 border-t border-[var(--ink)]/10">
        <div className="max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/15 bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)]/70">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--grass)]" />
            {tr("Four steps", "Cuatro pasos", "Quatre étapes")}
          </p>
          <h2 className="text-serif mt-4 text-4xl md:text-5xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("How it works", "Cómo funciona", "Comment ça marche")}
          </h2>
          <p className="mt-3 text-[var(--ink)]/65 max-w-xl leading-relaxed">
            {tr("Four simple steps from signup to your first match on court.", "Cuatro pasos sencillos desde el registro hasta tu primer match en pista.", "Quatre étapes simples de l'inscription à ton premier match sur pista.")}
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-4 sm:gap-5">
            <StepCard
              number="1"
              title={tr("Create your profile", "Crea tu perfil", "Crée ton profil")}
              body={tr("Who you are, where you play, your level and what matters to you. Your preferences stay private — they're only used by our AI to find matches, never shown on your public profile.", "Quién eres, dónde juegas, tu nivel y qué te importa. Tus preferencias son privadas — solo las usa nuestra IA para encontrar matches, nunca se muestran en tu perfil público.", "Qui tu es, où tu joues, ton niveau et ce qui compte pour toi. Tes préférences restent privées — elles ne servent qu'à notre IA pour trouver des matches, jamais affichées sur ton profil public.")}
            />
            <StepCard
              number="2"
              title={tr("Answer your Matchmaking code", "Responde tu Código de afinidad", "Réponds à ton Code d'affinité")}
              body={tr("Our AI generates personalized questions based on your profile. Answer as many as you like — each shared answer sharpens your matches. Skip anything that feels too personal. You're in control.", "Nuestra IA genera preguntas personalizadas según tu perfil. Responde las que quieras — cada respuesta compartida afina tus matches. Salta lo que te resulte muy personal. Tú mandas.", "Notre IA génère des questions personnalisées selon ton profil. Réponds à autant que tu veux — chaque réponse partagée affine tes matches. Passe ce qui te semble trop personnel. Tu contrôles.")}
            />
            <StepCard
              number="3"
              title={tr("Browse the Home", "Explora el Inicio", "Explore le Home")}
              body={tr("See players who match your level, zone and personality. Tap the ones you'd play with. They won't know you tapped them unless they tap you back — no awkwardness, no obligation.", "Verás jugadores que encajan con tu nivel, tu zona y tu personalidad. Pulsa sobre aquellos con quienes jugarías. No sabrán que les has dado a conectar a menos que ellos hagan lo mismo — sin momentos incómodos y sin ningún compromiso.", "Vois les joueurs qui matchent ton niveau, ta zone et ta personnalité. Tape ceux avec qui tu jouerais. Ils ne sauront pas que tu les as tapés tant qu'ils ne te tapent pas en retour — pas de gêne, pas d'obligation.")}
            />
            <StepCard
              number="4"
              title={tr("Chat & Organize", "Chatea y organiza", "Chat et Organisation")}
              body={tr("When you both tap, a chat opens. Coordinate your match and book a public court on Playtomic — or, if someone has free access to a padel court, arrange the game right there and invite more players to join. You don't have to leave the app.", "Cuando os tocáis mutuamente, se abre el chat. Coordinad el partido y reservad una pista pública en Playtomic — o, si alguien tiene acceso gratuito a una pista, organizad el partido ahí mismo e invitad a más jugadores. No tienes que salir de la app.", "Quand vous vous tapez tous les deux, un chat s'ouvre. Organise ton match et réserve une pista publique sur Playtomic — ou, si quelqu'un a accès gratuit à une pista, organise la partie directement et invite d'autres joueurs à se joindre. Sans quitter l'app.")}
            />
          </div>
        </div>
      </section>

      {/* Privacy & Safety — soft tinted band */}
      <section className="px-5 sm:px-8 lg:px-16 py-14 border-t border-[var(--ink)]/10 bg-[var(--paper-2)]/60">
        <div className="max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--ink)]/15 bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink)]/70">
            <Shield className="w-3.5 h-3.5" strokeWidth={2} />
            {tr("Privacy first", "Privacidad primero", "Vie privée d'abord")}
          </p>
          <h2 className="text-serif mt-4 text-4xl md:text-5xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("Built with your privacy in mind", "Hecho pensando en tu privacidad", "Conçu en pensant à ta vie privée")}
          </h2>
          <p className="mt-3 text-[var(--ink)]/65 max-w-xl leading-relaxed">
            {tr("We believe you should enjoy the journey without worrying about your data or feeling exposed.", "Creemos que deberías disfrutar del camino sin preocuparte por tus datos ni sentirte expuesto.", "Nous pensons que tu dois profiter du parcours sans t'inquiéter pour tes données ni te sentir exposé·e.")}
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-7 max-w-3xl">
            <FeatureRow
              icon={Shield}
              title={tr("Your answers are private", "Tus respuestas son privadas", "Tes réponses sont privées")}
              body={tr("Your matchmaking answers are never shown publicly. Only when two people share an answer does it contribute to their match score. Nobody sees what you answered alone.", "Tus respuestas de afinidad nunca se muestran públicamente. Solo cuando dos personas comparten una respuesta contribuye a su puntuación de match. Nadie ve lo que respondiste tú solo.", "Tes réponses de matchmaking ne sont jamais affichées publiquement. Ce n'est que lorsque deux personnes partagent une réponse qu'elle compte pour leur score de match. Personne ne voit ce que tu as répondu tout seul.")}
            />
            <FeatureRow
              icon={MessageSquareHeart}
              title={tr("Anonymous-first likes", "Likes anónimos primero", "Likes anonymes d'abord")}
              body={tr("Tap someone you like? They'll never know unless they tap you back. This removes all pressure and awkwardness — you're free to explore without fear of rejection or unwanted attention.", "¿Le das a conectar a alguien? No lo sabrá a menos que te lo devuelva. Esto elimina toda presión y awkwardness — eres libre de explorar sin miedo al rechazo ni atención no deseada.", "Tu tapes quelqu'un qui te plaît ? Il·elle ne le saura jamais tant qu'il·elle ne te tape pas en retour. Cela élimine toute pression et gêne — tu es libre d'explorer sans peur du rejet ni d'attention non souhaitée.")}
            />
            <FeatureRow
              icon={Shield}
              title={tr("Safety by design", "Seguridad por diseño", "Sécurité dès la conception")}
              body={tr("We encourage booking through Playtomic for verified public courts. Block and report tools are one tap away. Reports are reviewed by real humans, and offending accounts are suspended immediately.", "Animamos a reservar a través de Playtomic para pistas públicas verificadas. Bloquear y reportar está a un toque. Los reportes los revisan humanos reales, y las cuentas infractoras se suspenden al instante.", "Nous encourageons la réservation via Playtomic pour des pistas publiques vérifiées. Les outils de blocage et signalement sont à un tap. Les signalements sont revus par de vraies personnes, et les comptes fautifs sont suspendus immédiatement.")}
            />
            <FeatureRow
              icon={Sparkles}
              title={tr("You control your intent", "Tú controlas tu intención", "Tu contrôles ton intention")}
              body={tr("Looking for padel partners, friends, or something more? Set your preferences privately. If you're only here for padel and friendship, you'll never see relationship questions — or anyone interested in a relationship with you — and vice versa.", "¿Buscas compis de pádel, amigos o algo más? Configura tus preferencias en privado. Si solo estás aquí para pádel y amistad, nunca verás preguntas de relación — ni a nadie interesado en una relación contigo — y viceversa.", "Tu cherches des partenaires de padel, des amis ou plus ? Définis tes préférences en privé. Si tu es ici juste pour le padel et l'amitié, tu ne verras jamais de questions sur les relations — ni personne qui cherche une relation avec toi — et inversement.")}
            />
            <FeatureRow
              icon={Users}
              title={tr("Free court access", "Pista propia", "Accès pista gratuit")}
              body={tr("Players with court access can mark it on their profile. It's a great way to play for free and meet new people — just coordinate through chat and enjoy the game.", "Los jugadores con pista propia pueden marcarlo en su perfil. Es una gran forma de jugar gratis y conocer gente — solo coordinad por chat y disfrutad del partido.", "Les joueurs avec accès à une pista peuvent l'indiquer sur leur profil. Une super façon de jouer gratuitement et de rencontrer du monde — coordonnez-vous par chat et profitez.")}
            />
            <FeatureRow
              icon={Shield}
              title={tr("Your Home grid is yours alone", "Tu home grid es solo tuyo", "Ton home grid n'appartient qu'à toi")}
              body={tr("No one can see who you've tapped, skipped, or matched with on your Home grid. Your activity stays completely private — there is no public feed or visibility into anyone else's Home grid.", "Nadie puede ver a quién has dado a conectar, a quién has saltado o con quién has hecho match en tu home grid. Tu actividad es completamente privada — no hay feed público ni visibilidad del home grid de nadie más.", "Personne ne peut voir qui tu as tapé, passé ou matché sur ton home grid. Ton activité reste totalement privée — il n'y a pas de fil public ni de visibilité sur le home grid des autres.")}
            />
            <FeatureRow
              icon={Users}
              title={tr("Hide someone, disappear from theirs", "Oculta a alguien y desaparece del suyo", "Masque quelqu'un, disparais du sien")}
              body={tr("Not interested in someone for any reason? Hide them and you'll automatically be removed from their Home grid too. Clean, mutual, and completely drama-free.", "¿No te interesa alguien por cualquier motivo? Ocúltalo y tú desaparecerás automáticamente de su home grid también. Limpio, mutuo y sin dramas.", "Pas intéressé·e par quelqu'un pour une raison quelconque ? Masque-le et tu disparais automatiquement de son home grid aussi. Propre, mutuel, et sans drame.")}
            />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-5 sm:px-8 lg:px-16 py-14 border-t border-[var(--ink)]/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-serif text-4xl md:text-5xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("Why padel changes everything", "Por qué el pádel lo cambia todo", "Pourquoi le padel change tout")}
          </h2>
          <p className="mt-3 text-[var(--ink)]/65 max-w-2xl leading-relaxed">
            {tr("Padel isn't just a sport — it's a social experience built on communication, teamwork and trust. Every match is a chance to meet someone new in a fun, low-pressure environment.", "El pádel no es solo un deporte — es una experiencia social basada en la comunicación, el trabajo en equipo y la confianza. Cada partido es una oportunidad de conocer a alguien nuevo en un ambiente divertido y sin presión.", "Le padel n'est pas qu'un sport — c'est une expérience sociale bâtie sur la communication, l'esprit d'équipe et la confiance. Chaque match est l'occasion de rencontrer quelqu'un de nouveau dans un cadre fun et sans pression.")}
          </p>

          <div className="mt-10 grid md:grid-cols-3 gap-4 sm:gap-5">
            <Pillar
              title={tr("Teamwork", "Trabajo en equipo", "Esprit d'équipe")}
              body={tr("You win or lose together. Padel teaches you to read your partner, communicate without words, and build trust fast.", "Ganas o pierdes juntos. El pádel te enseña a leer a tu compi, comunicarte sin palabras y generar confianza rápido.", "Tu gagnes ou perds ensemble. Le padel t'apprend à lire ton partenaire, communiquer sans mots et créer la confiance vite.")}
            />
            <Pillar
              title={tr("Communication", "Comunicación", "Communication")}
              body={tr("Every rally is a conversation. You learn how someone thinks under pressure, how they celebrate wins, and how they handle mistakes.", "Cada punto es una conversación. Aprendes cómo piensa alguien bajo presión, cómo celebra las victorias y cómo gestiona los errores.", "Chaque échange est une conversation. Tu apprends comment quelqu'un pense sous pression, célèbre les victoires et gère les erreurs.")}
            />
            <Pillar
              title={tr("Community", "Comunidad", "Communauté")}
              body={tr("The padel community is welcoming and diverse. Whether you're a beginner or a pro, there's always someone to play with and learn from.", "La comunidad de pádel es acogedora y diversa. Ya seas principiante o pro, siempre hay alguien con quien jugar y de quien aprender.", "La communauté padel est accueillante et diverse. Que tu sois débutant·e ou pro, il y a toujours quelqu'un avec qui jouer et apprendre.")}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-8 lg:px-16 py-16 border-t border-[var(--ink)]/10">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-serif text-4xl md:text-5xl uppercase tracking-[-0.01em] text-[var(--ink)]">
            {tr("Ready to find your match?", "¿Listo para encontrar tu match?", "Prêt·e à trouver ton match ?")}
          </h2>
          <p className="mt-4 text-[var(--ink)]/70 leading-relaxed">
            {tr("Join thousands of players worldwide. Your next great game — and maybe your next great friend — is one tap away.", "Únete a miles de jugadores en todo el mundo. Tu próximo gran partido — y quizás tu próximo gran amigo — está a un toque.", "Rejoins des milliers de joueurs partout dans le monde. Ton prochain super match — et peut-être ton prochain super ami — est à un tap.")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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

      {/* Dark green footer — same as landing */}
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
