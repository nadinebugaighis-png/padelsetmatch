import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Users, KeyRound, CalendarCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LangSwitch } from "@/lib/i18n";

const TITLE = "Pistas de pádel gratis — dónde jugar sin pagar pista";
const DESC =
  "Cómo encontrar pistas de pádel gratis cerca de ti: pistas municipales, pistas de urbanización y comunidad, horas valle en clubes y jugadores con pista propia. Encuéntralos en PadelSetMatch.";
const URL = "https://padelsetmatch.com/pistas-de-padel-gratis";
const EN_URL = "https://padelsetmatch.com/free-padel-courts";

const FAQ = [
  {
    q: "¿Existen de verdad pistas de pádel gratis?",
    a: "Sí. Muchos ayuntamientos tienen pistas municipales gratuitas o casi gratuitas en horas valle, y miles de pistas privadas de urbanizaciones y comunidades están vacías porque el vecino no encuentra un cuarto jugador. Son las pistas de las que casi nadie se entera.",
  },
  {
    q: "¿Cómo encuentro una pista de pádel gratis cerca de mí?",
    a: "Empieza por la web de deportes de tu ayuntamiento para las pistas municipales y después busca jugadores que ya tengan acceso a una pista. En PadelSetMatch, los jugadores que pueden aportar una pista gratuita o privada llevan un distintivo de pista, así ves a quién preguntar antes de reservar nada.",
  },
  {
    q: "¿Necesito ser socio de un club para jugar?",
    a: "No. Si juegas en una pista de comunidad, urbanización o municipal con alguien que tiene acceso, no hay que apuntarse a nada y normalmente no se paga nada más allá de una pequeña tasa de reserva, si la hay.",
  },
  {
    q: "¿Cuánto cuesta jugar al pádel si pagas pista?",
    a: "En España una pista de club suele costar entre 16 € y 28 € la hora, a repartir entre cuatro jugadores. Jugar en una pista gratuita o privada elimina ese coste por completo.",
  },
];

export const Route = createFileRoute("/pistas-de-padel-gratis")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [
      { rel: "canonical", href: URL },
      { rel: "alternate", hrefLang: "es-ES", href: URL },
      { rel: "alternate", hrefLang: "en", href: EN_URL },
      { rel: "alternate", hrefLang: "x-default", href: EN_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: "es-ES",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: PistasGratisPage,
});

const WAYS = [
  {
    icon: MapPin,
    title: "Pistas municipales",
    body: "Muchos ayuntamientos tienen pistas de pádel públicas gratuitas o de pocos euros en horas valle. Mira la página de deportes de tu ayuntamiento: casi nunca se anuncian en otro sitio.",
  },
  {
    icon: KeyRound,
    title: "Urbanizaciones y comunidades",
    body: "La mayor oferta oculta. Miles de pistas de comunidad están sin usar porque el residente no encuentra a tres jugadores más. Si te invitan, juegas sin pagar.",
  },
  {
    icon: CalendarCheck,
    title: "Horas valle en clubes",
    body: "Los clubes bajan mucho el precio a media mañana y a última hora. Repartido entre cuatro, sale casi gratis.",
  },
  {
    icon: Users,
    title: "Jugadores con pista",
    body: "El camino más rápido: encontrar a alguien que ya tiene pista y busca un cuarto. En PadelSetMatch esos jugadores llevan un distintivo de pista en su ficha.",
  },
];

function PistasGratisPage() {
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
            Unirme
          </Link>
        </div>
      </header>

      <section className="px-5 sm:px-8 lg:px-16 pt-10 pb-12 max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--plum)_14%,var(--paper))] border border-[color-mix(in_oklab,var(--plum)_22%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--plum)]">
          Guía
        </p>
        <h1 className="text-serif mt-4 uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem]">
          Pistas de pádel gratis
          <span className="block text-[var(--plum)]">cerca de ti</span>
        </h1>
        <p className="mt-5 text-[17px] leading-[1.6] text-[var(--ink)]/75">
          El precio de la pista es el principal motivo por el que se juega menos al pádel de lo que se
          querría. Pero una gran parte de las pistas —municipales, de comunidad, de urbanización— se pueden
          usar gratis y están vacías ahora mismo. Lo difícil nunca fue la pista: es encontrar a los otros
          tres jugadores.
        </p>
        <div className="mt-7">
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.18em] text-[13px] pl-6 pr-3 py-3 hover:brightness-110 transition"
          >
            Buscar jugadores con pista
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--paper)]/15 group-hover:translate-x-0.5 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          Cuatro formas de jugar gratis
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
          Preguntas frecuentes
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
            Pista resuelta. Ahora, el cuarto.
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink)]/70">
            PadelSetMatch es un directorio de jugadores de pádel cerca de ti. Mira quién juega tu nivel,
            quién tiene hueco esta semana y quién puede poner la pista.{" "}
            <Link to="/padel-cerca-de-mi" className="text-[var(--plum)] underline underline-offset-4">
              Pádel cerca de mí
            </Link>{" "}
            ·{" "}
            <Link to="/play" className="text-[var(--plum)] underline underline-offset-4">
              Partidos abiertos
            </Link>
          </p>
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="mt-6 inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.16em] text-[12px] px-5 py-3 hover:brightness-110 transition"
          >
            Crear perfil gratis
          </Link>
        </div>
      </section>

      <footer className="bg-[var(--ink)] text-[var(--paper)]">
        <div className="h-1.5 bg-[var(--plum)]" aria-hidden />
        <div className="px-5 sm:px-8 lg:px-16 py-5 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="text-sm tracking-wide">padelsetmatch.com</Link>
          <div className="flex items-center gap-5 text-xs text-[var(--paper)]/70">
            <Link to="/free-padel-courts" className="hover:text-[var(--paper)]">English version</Link>
            <Link to="/terms" className="hover:text-[var(--paper)]">Términos</Link>
            <Link to="/privacy" className="hover:text-[var(--paper)]">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
