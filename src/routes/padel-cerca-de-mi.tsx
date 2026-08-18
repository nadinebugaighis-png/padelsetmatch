import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Users, KeyRound, CalendarCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { LangSwitch } from "@/lib/i18n";

const TITLE = "Pádel cerca de mí — Encuentra jugadores en Madrid | PadelSetMatch";
const DESC =
  "¿Buscas pádel cerca de ti en Madrid? Encuentra jugadores de tu nivel, únete a partidos abiertos y descubre pistas municipales, de urbanización y gratuitas. Perfil gratis.";
const URL = "https://padelsetmatch.com/padel-cerca-de-mi";

const PASOS = [
  {
    icon: Users,
    title: "1. Crea tu perfil",
    body: "Nivel, lado preferido (derecha o revés), horarios y las zonas de Madrid donde juegas. Tarda menos de dos minutos y es gratis.",
  },
  {
    icon: MapPin,
    title: "2. Mira quién juega cerca",
    body: "Verás jugadores de tu zona con su nivel y disponibilidad. Sin listas de espera ni grupos de WhatsApp interminables.",
  },
  {
    icon: CalendarCheck,
    title: "3. Únete a un partido abierto",
    body: "Los partidos con hueco aparecen con día, hora y club. Reservas tu plaza con un toque y hablas con el resto en el chat del partido.",
  },
  {
    icon: KeyRound,
    title: "4. Juega, también gratis",
    body: "Muchos jugadores tienen acceso a pista de comunidad o urbanización. Llevan una insignia de pista en su ficha: si te unes a ellos, no pagas alquiler.",
  },
];

const ZONAS = [
  "Chamartín",
  "Salamanca",
  "Chamberí",
  "Retiro",
  "Moncloa-Aravaca",
  "Hortaleza",
  "Las Rozas",
  "Pozuelo de Alarcón",
  "Alcobendas",
  "Majadahonda",
  "Boadilla del Monte",
  "Getafe",
];

const FAQ = [
  {
    q: "¿Cómo encuentro pádel cerca de mí en Madrid?",
    a: "Lo difícil casi nunca es la pista: es el cuarto jugador. En PadelSetMatch creas un perfil gratuito con tu nivel y tus zonas, ves quién juega cerca y te unes a partidos abiertos con plazas libres en clubes de Madrid y alrededores.",
  },
  {
    q: "¿Necesito ser socio de un club?",
    a: "No. Puedes jugar en pistas municipales, de urbanización o en clubes que alquilan por horas. Solo necesitas completar los cuatro jugadores.",
  },
  {
    q: "¿Cuánto cuesta una pista de pádel en Madrid?",
    a: "Una pista de club suele costar entre 16 € y 28 € la hora, que se reparten entre cuatro. En pistas municipales o de comunidad el coste baja mucho o desaparece.",
  },
  {
    q: "¿Y si no sé mi nivel?",
    a: "Basta con elegir entre iniciación, intermedio o avanzado. Los perfiles muestran el nivel de cada jugador para que los partidos estén equilibrados desde el principio.",
  },
  {
    q: "¿Puedo usarlo fuera de Madrid?",
    a: "Sí. La aplicación funciona en toda España y también cuando viajas: puedes buscar partidos y jugadores en Barcelona, Marbella, Valencia o cualquier otra ciudad.",
  },
];

export const Route = createFileRoute("/padel-cerca-de-mi")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [
      { rel: "canonical", href: URL },
      { rel: "alternate", hrefLang: "es-ES", href: URL },
      { rel: "alternate", hrefLang: "en", href: "https://padelsetmatch.com/" },
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
  component: PadelCercaDeMiPage,
});

function PadelCercaDeMiPage() {
  return (
    <main className="programme-page min-h-screen bg-[var(--paper)]" lang="es">
      <header className="px-5 sm:px-8 lg:px-16 pt-3 pb-2 flex items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2.5">
          <LangSwitch />
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] text-[12px] font-semibold uppercase tracking-[0.18em] px-4 py-2.5 hover:brightness-110 transition"
          >
            Únete
          </Link>
        </div>
      </header>

      <section className="px-5 sm:px-8 lg:px-16 pt-10 pb-12 max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--plum)_14%,var(--paper))] border border-[color-mix(in_oklab,var(--plum)_22%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--plum)]">
          Madrid
        </p>
        <h1 className="text-serif mt-4 uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem]">
          Pádel cerca de mí
          <span className="block text-[var(--plum)]">jugadores en Madrid</span>
        </h1>
        <p className="mt-5 text-[17px] leading-[1.6] text-[var(--ink)]/75">
          Tener ganas de jugar no es el problema. El problema es reunir a cuatro. PadelSetMatch es un
          directorio de jugadores de pádel cerca de ti: ves quién juega tu nivel, quién tiene hueco esta
          semana y quién puede poner la pista.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.18em] text-[13px] pl-6 pr-3 py-3 hover:brightness-110 transition"
          >
            Crear perfil gratis
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--paper)]/15 group-hover:translate-x-0.5 transition">
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
          <Link
            to="/play"
            className="inline-flex items-center rounded-full border border-[var(--ink)]/20 text-[var(--ink)] font-semibold uppercase tracking-[0.16em] text-[12px] px-5 py-3 hover:bg-[var(--ink)]/5 transition"
          >
            Ver partidos abiertos
          </Link>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          Cómo encontrar el cuarto jugador
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 max-w-4xl">
          {PASOS.map(({ icon: Icon, title, body }) => (
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

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          Pistas gratis y de comunidad
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-[1.6] text-[var(--ink)]/70">
          En Madrid hay dos tipos de pista que casi nadie aprovecha: las municipales, con precios muy bajos
          fuera de hora punta, y las miles de pistas de urbanización que están vacías porque el vecino que
          tiene acceso no encuentra a tres más. En PadelSetMatch esos jugadores llevan una insignia de pista
          en su ficha, así sabes a quién escribir.{" "}
          <Link to="/free-padel-courts" className="text-[var(--plum)] underline underline-offset-4">
            Más sobre pistas de pádel gratis
          </Link>
          .
        </p>
      </section>

      <section className="px-5 sm:px-8 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <h2 className="text-serif text-3xl sm:text-4xl uppercase text-[var(--ink)]">
          Zonas de Madrid
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-[1.6] text-[var(--ink)]/70">
          Hay jugadores registrados en el centro, en la zona noroeste y en el sur del área metropolitana.
          Elige tus zonas al crear el perfil y solo verás gente con la que te puedes cruzar de verdad.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2 max-w-3xl">
          {ZONAS.map((z) => (
            <li
              key={z}
              className="rounded-full border border-[var(--ink)]/15 bg-white px-4 py-2 text-[13px] text-[var(--ink)]/80"
            >
              {z}
            </li>
          ))}
        </ul>
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
            Esta semana puedes jugar
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink)]/70">
            Crea tu perfil, mira los partidos abiertos y quédate con la plaza que te encaje.{" "}
            <Link to="/how-it-works" className="text-[var(--plum)] underline underline-offset-4">
              Ver cómo funciona
            </Link>
            .
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
            <Link to="/terms" className="hover:text-[var(--paper)]">Términos</Link>
            <Link to="/privacy" className="hover:text-[var(--paper)]">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
