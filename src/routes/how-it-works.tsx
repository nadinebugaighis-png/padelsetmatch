import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { ArrowRight, UserRound, Search, CalendarCheck, EyeOff, ThumbsUp, Send } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — PadelSetMatch" },
      { name: "description", content: "A directory of padel players around you. See who is up for a game, who has free court access, and meet players ahead of time." },
      { property: "og:title", content: "How PadelSetMatch works" },
      { property: "og:description", content: "Find players. Play more." },
    ],
  }),
  component: HowItWorksPage,
});

type Accent = "plum" | "ink" | "lime";

function Card({
  n,
  accent,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  accent: Accent;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  const accentStyles: Record<Accent, { bg: string; fg: string; badge: string; badgeFg: string }> = {
    plum: {
      bg: "bg-[color-mix(in_oklab,var(--plum)_16%,var(--paper))]",
      fg: "text-[var(--plum)]",
      badge: "bg-[color-mix(in_oklab,var(--plum)_18%,var(--paper))]",
      badgeFg: "text-[var(--plum)]",
    },
    ink: {
      bg: "bg-[var(--ink)]/8",
      fg: "text-[var(--ink)]",
      badge: "bg-[var(--ink)]/10",
      badgeFg: "text-[var(--ink)]/70",
    },
    lime: {
      bg: "bg-[color-mix(in_oklab,#a3e635_28%,var(--paper))]",
      fg: "text-[color-mix(in_oklab,#4d7c0f_90%,var(--ink))]",
      badge: "bg-[color-mix(in_oklab,#a3e635_25%,var(--paper))]",
      badgeFg: "text-[color-mix(in_oklab,#4d7c0f_90%,var(--ink))]",
    },
  };
  const a = accentStyles[accent];

  return (
    <div className="relative rounded-2xl bg-white border border-[var(--ink)]/8 p-6 sm:p-7 shadow-[0_18px_40px_-30px_rgba(15,62,46,0.35)] flex flex-col">
      <div className="flex items-start justify-between">
        <span className={`inline-flex items-center justify-center w-11 h-11 rounded-full ${a.bg} ${a.fg}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </span>
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${a.badge} ${a.badgeFg}`}>
          {n}
        </span>
      </div>
      <h3 className="mt-10 text-serif uppercase tracking-[-0.005em] text-[var(--ink)] text-xl sm:text-2xl">
        {title}
      </h3>
      <p className="mt-3 text-[15px] text-[var(--ink)]/70 leading-relaxed">{body}</p>
    </div>
  );
}

function HowItWorksPage() {
  const t = useT();
  const tr = useTr();

  return (
    <main className="programme-page min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle at center, color-mix(in oklab, var(--plum) 35%, transparent), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle at center, color-mix(in oklab, #a3e635 40%, transparent), transparent 70%)" }}
      />

      <header className="relative px-5 sm:px-8 lg:px-16 pt-6 pb-4 flex items-center justify-between">
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
      <section className="relative px-5 sm:px-8 lg:px-16 pt-10 sm:pt-14 pb-10 max-w-6xl mx-auto w-full">
        <span className="inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--plum)_35%,transparent)] text-[var(--plum)] text-[11px] font-semibold uppercase tracking-[0.22em] px-4 py-1.5">
          {tr("Why PadelSetMatch", "Por qué PadelSetMatch", "Pourquoi PadelSetMatch")}
        </span>
        <h1 className="mt-6 text-serif uppercase text-[var(--ink)] leading-[0.92] tracking-[-0.02em] text-[2.75rem] sm:text-6xl lg:text-7xl">
          {tr("Find players. Play more.", "Encuentra jugadores. Juega más.", "Trouve des joueurs. Joue plus.")}
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] sm:text-lg text-[var(--ink)]/75 leading-relaxed">
          {tr(
            "A directory of padel players around you. See who is up for a game, who has free court access, and meet players ahead of time — in your city or wherever you travel.",
            "Un directorio de jugadores de pádel cerca de ti. Descubre quién quiere jugar, quién tiene pista disponible y conoce a los jugadores antes de jugar — en tu ciudad o adonde viajes.",
            "Un annuaire des joueurs de padel près de toi. Vois qui veut jouer, qui a une piste dispo, et rencontre les joueurs à l'avance — dans ta ville ou en voyage."
          )}
        </p>
      </section>

      {/* 3 Cards */}
      <section className="relative px-5 sm:px-8 lg:px-16 pb-16 max-w-6xl mx-auto w-full">
        <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
          <Card
            n="1"
            accent="plum"
            icon={UserRound}
            title={tr("Private profile", "Perfil privado", "Profil privé")}
            body={tr(
              "Share as much as you want. The more the AI knows, the better your matches. Nothing is shown to anyone.",
              "Comparte lo que quieras. Cuanto más sepa la IA, mejores serán tus conexiones. Nada es visible para otros.",
              "Partage ce que tu veux. Plus l'IA en sait, meilleurs sont tes matches. Rien n'est visible pour les autres."
            )}
          />
          <Card
            n="2"
            accent="ink"
            icon={Search}
            title={tr("Find & connect", "Busca y conecta", "Cherche et connecte")}
            body={tr(
              "Browse players around you on Home. Tap to connect with the people you would play with.",
              "Explora jugadores cerca de ti en Inicio. Pulsa para conectar con quienes te gustaría jugar.",
              "Explore les joueurs près de toi sur l'accueil. Tape pour te connecter à ceux avec qui tu jouerais."
            )}
          />
          <Card
            n="3"
            accent="lime"
            icon={CalendarCheck}
            title={tr("Set your time", "Marca tu hora", "Choisis ton créneau")}
            body={tr(
              "Open a slot with one click. Others join. Or join theirs. No more waiting on WhatsApp groups.",
              "Crea un hueco con un clic. Otros se apuntan. O apúntate a los suyos. Sin quedarte esperando en grupos de WhatsApp.",
              "Ouvre un créneau en un clic. D'autres rejoignent. Ou rejoins les leurs. Fini l'attente sur WhatsApp."
            )}
          />
        </div>
      </section>

      {/* The juicy parts */}
      <section className="relative px-5 sm:px-8 lg:px-16 pb-16 max-w-6xl mx-auto w-full">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <span className="inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--plum)_35%,transparent)] text-[var(--plum)] text-[11px] font-semibold uppercase tracking-[0.22em] px-4 py-1.5">
            {tr("The juicy parts", "Lo interesante", "Le meilleur")}
          </span>
        </div>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--ink)] text-[var(--paper)] p-6 sm:p-7">
            <EyeOff className="w-5 h-5 text-[var(--paper)]/70" strokeWidth={2} />
            <h3 className="mt-6 text-serif uppercase text-xl leading-tight">
              {tr("Hide by group", "Ocultar por grupo", "Cacher par groupe")}
            </h3>
            <p className="mt-3 text-[14px] text-[var(--paper)]/75 leading-relaxed">
              {tr(
                "Hide someone from your Home group and you disappear from theirs too. Awkwardness solved.",
                "Oculta a alguien del grupo Relación y tú también desaparecerás del suyo — pero seguís en Amistad o Pádel. Sin momentos incómodos.",
                "Cache quelqu'un du groupe Relation et tu disparais du sien aussi — mais vous restez dans Amis ou Padel. Fini les moments gênants."
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-[color-mix(in_oklab,var(--plum)_16%,var(--paper))] p-6 sm:p-7 border border-[color-mix(in_oklab,var(--plum)_25%,transparent)]">
            <ThumbsUp className="w-5 h-5 text-[var(--plum)]" strokeWidth={2} />
            <h3 className="mt-6 text-serif uppercase text-xl leading-tight text-[var(--ink)]">
              {tr("Silent likes", "Me gusta en silencio", "Likes silencieux")}
            </h3>
            <p className="mt-3 text-[14px] text-[var(--ink)]/75 leading-relaxed">
              {tr(
                "Tap someone and they'll never know — unless they tap you back. No notifications, no pressure, no ego bruises.",
                "Dale 'me gusta' a alguien y no lo sabrá — a menos que te lo devuelva. Sin notificaciones, sin presión, sin herir egos.",
                "Tape quelqu'un et il ne le saura jamais — sauf s'il te tape aussi. Aucune notification, aucune pression."
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-[color-mix(in_oklab,#a3e635_22%,var(--paper))] p-6 sm:p-7 border border-[color-mix(in_oklab,#a3e635_35%,transparent)]">
            <Send className="w-5 h-5 text-[color-mix(in_oklab,#4d7c0f_90%,var(--ink))]" strokeWidth={2} />
            <h3 className="mt-6 text-serif uppercase text-xl leading-tight text-[var(--ink)]">
              {tr("Direct invites", "Invitaciones directas", "Invitations directes")}
            </h3>
            <p className="mt-3 text-[14px] text-[var(--ink)]/75 leading-relaxed">
              {tr(
                "Found a player with a compatible level and schedule? Send them a match invite for a specific day, time and club. Skip the small talk.",
                "¿Has encontrado a un jugador con un nivel y horario compatibles? Envíale una invitación para un día, hora y club concretos. Sin rodeos.",
                "Tu as trouvé un joueur avec un niveau et un créneau compatibles ? Envoie-lui une invitation pour un jour, une heure et un club précis. Sans détour."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-5 sm:px-8 lg:px-16 py-14 border-t border-[var(--ink)]/10">

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

      <footer className="relative bg-[var(--ink)] text-[var(--paper)] mt-auto">
        <div className="h-1.5 bg-[var(--plum)]" aria-hidden />
        <div className="px-5 sm:px-8 lg:px-16 py-5 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm tracking-wide text-[var(--paper)]/90">{t("land.foot")}</span>
          <div className="flex items-center gap-5 text-xs text-[var(--paper)]/70">
            <Link to="/terms" className="hover:text-[var(--paper)]">{tr("Terms", "Términos", "Conditions")}</Link>
            <Link to="/privacy" className="hover:text-[var(--paper)]">{tr("Privacy", "Privacidad", "Confidentialité")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
