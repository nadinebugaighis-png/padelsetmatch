import { normalizePlaytomicLink } from "@/lib/affinity";

/**
 * Where to send a player to book the court for a match.
 * Playtomic has no public booking API, so we deep-link out:
 *   1. the host's own pasted Playtomic link,
 *   2. a curated Playtomic club page for known clubs,
 *   3. a web search for "Playtomic <club>" when the host picked a real club.
 * Private / free courts and undecided clubs never show a booking link.
 *
 * Every Playtomic link we send out carries UTM tags so Playtomic and the clubs
 * can see the visit came from PadelSetMatch; Google searches are left untagged.
 */

export const BOOKING_UTM = {
  utm_source: "padelsetmatch",
  utm_medium: "app",
  utm_campaign: "book_court",
} as const;

/** Adds PadelSetMatch UTM tags, replacing any existing utm_* values (e.g. Playtomic's own share tags). */
export function tagBookingUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  for (const k of [...parsed.searchParams.keys()]) if (k.startsWith("utm_")) parsed.searchParams.delete(k);
  for (const [k, v] of Object.entries(BOOKING_UTM)) parsed.searchParams.set(k, v);
  return parsed.toString();
}

type KnownClub = { key: string; url: string; words: string[][] };

// Each entry matches when ALL words of ANY word-set appear in the club name
// (accents stripped, lowercase). Keep words specific so similar names don't collide.
const KNOWN_CLUBS: KnownClub[] = [
  // playtomic.com/tenant/<id> is an app link: it opens the Playtomic app on the club
  // (falls back to the website when the app isn't installed). /clubs/<slug> only opens the website.
  // Riber must come before La Moraleja: "Riber Pádel Moraleja Club" would also match La Moraleja's words.
  { key: "riber_padel_moraleja", url: "https://playtomic.com/tenant/a788ca6f-847a-4745-8d31-cab2e332c17b", words: [["riber"]] },
  { key: "club_padel_la_moraleja", url: "https://playtomic.com/tenant/e0448759-a18b-4b53-a3d5-b8cb7333c7d7", words: [["moraleja", "club", "padel"]] },
  { key: "club_irlandesas", url: "https://playtomic.com/tenant/c4204b18-1228-466a-89f8-a94f181f37c3", words: [["irlandesas"]] },
  { key: "calido_alcobendas", url: "https://playtomic.com/tenant/4fb9cb56-8fe7-46f9-9b57-c83cf1da18f8", words: [["calido", "alcobendas"]] },
  { key: "liceo_europeo", url: "https://playtomic.com/tenant/da765f8e-43b3-11e8-8674-52540049669c", words: [["liceo", "europeo"]] },
  { key: "golf_park", url: "https://playtomic.com/tenant/da7887db-43b3-11e8-8674-52540049669c", words: [["golf", "park"]] },
  { key: "las_tablas_sports_club", url: "https://playtomic.com/tenant/da79175c-43b3-11e8-8674-52540049669c", words: [["tablas", "sports"]] },
  { key: "la_vida_padel_alcobendas", url: "https://playtomic.com/es/clubs/la-vida-padel-alcobendas", words: [["vida", "padel", "alcobendas"]] },
  { key: "ciudad_deportiva_jarama", url: "https://playtomic.com/es/clubs/ciudad-deportiva-jarama", words: [["ciudad", "deportiva", "jarama"]] },
  { key: "dreamfit_sanse", url: "https://playtomic.com/es/clubs/dreamfit-sanse", words: [["dreamfit", "sanse"], ["dreamfit", "san", "sebastian"]] },
  { key: "campus_23", url: "https://playtomic.com/es/clubs/campus-23-club-de-tenis-y-padel", words: [["campus", "23"]] },
  { key: "norte_real_sport_club", url: "https://playtomic.com/es/clubs/norte-real-sport-club", words: [["norte", "real", "sport"]] },
];

const PLACEHOLDER_WORDS = ["tbd", "por decidir", "to be decided", "a decider", "club por definir"];

function norm(s: string | null | undefined) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type BookingInput = {
  club_name: string | null;
  city?: string | null;
  club_place_id?: string | null;
  playtomic_link?: string | null;
  is_private_court?: boolean | null;
  free_court?: boolean | null;
};

export type BookingLink = {
  url: string;
  source: "host" | "club" | "search";
  /** Low-cardinality club id for analytics: curated key, or "other" for any other club. */
  club: string;
};

function knownClub(clubName: string | null | undefined): KnownClub | null {
  const name = norm(clubName);
  if (!name) return null;
  const tokens = new Set(name.split(" "));
  return KNOWN_CLUBS.find((c) => c.words.some((set) => set.every((w) => tokens.has(w)))) ?? null;
}

export function knownClubBookingUrl(clubName: string | null | undefined): string | null {
  return knownClub(clubName)?.url ?? null;
}

export function clubBookingLink(m: BookingInput): BookingLink | null {
  const known = knownClub(m.club_name);
  const club = known?.key ?? "other";
  const host = m.playtomic_link ? normalizePlaytomicLink(m.playtomic_link).url : null;
  if (host) return { url: tagBookingUrl(host), source: "host", club };
  if (m.is_private_court || m.free_court) return null;

  const name = norm(m.club_name);
  if (!name || PLACEHOLDER_WORDS.some((p) => name === p || name.includes(p))) return null;

  if (known) return { url: tagBookingUrl(known.url), source: "club", club };

  // Only search when the host picked a real club from the list, not a typed address.
  if (!m.club_place_id) return null;
  const q = `Playtomic ${m.club_name ?? ""} ${m.city ?? ""}`.replace(/\s+/g, " ").trim();
  return { url: `https://www.google.com/search?q=${encodeURIComponent(q)}`, source: "search", club };
}

/* ------------------------------------------------------------------ */
/* Direct WhatsApp booking (host only)                                 */
/* ------------------------------------------------------------------ */
// Clubs that take bookings by WhatsApp. Only the match host sees this, so one
// person stays in charge of the reservation. Numbers are digits only (wa.me format).
const CLUB_WHATSAPP: Record<string, { number: string; displayName: string }> = {
  club_padel_la_moraleja: { number: "34647103375", displayName: "Club de Pádel La Moraleja" },
};

export const COURT_TYPES = [
  { key: "glass_outdoor", es: "Cristal exterior", en: "Outdoor glass", fr: "Vitrée extérieure" },
  { key: "wall_outdoor", es: "Muro exterior", en: "Outdoor wall", fr: "Mur extérieur" },
  { key: "wall_covered", es: "Cubierta de muro", en: "Covered wall", fr: "Mur couvert" },
  { key: "any", es: "Cualquiera disponible", en: "Any available", fr: "Peu importe" },
] as const;
export type CourtTypeKey = (typeof COURT_TYPES)[number]["key"];

/** Standard padel slot length used in the booking request. */
export const BOOKING_SLOT_MINUTES = 90;

export function clubWhatsappBooking(clubName: string | null | undefined) {
  const known = knownClub(clubName);
  if (!known) return null;
  const wa = CLUB_WHATSAPP[known.key];
  return wa ? { club: known.key, ...wa } : null;
}

function madridParts(d: Date) {
  const date = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(d);
  const time = (x: Date) =>
    new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false }).format(x);
  return { date, start: time(d), end: time(new Date(d.getTime() + BOOKING_SLOT_MINUTES * 60_000)) };
}

/** The Spanish message the host sends to the club (clubs in Spain read Spanish). */
export function clubBookingMessage(input: {
  clubDisplayName: string;
  startsAt: Date | string;
  courtType: CourtTypeKey;
  hostName?: string | null;
}): string {
  const { date, start, end } = madridParts(new Date(input.startsAt));
  const court = COURT_TYPES.find((c) => c.key === input.courtType)!.es;
  const name = input.hostName?.trim();
  return [
    `Hola, ${input.clubDisplayName}. Me gustaría reservar una pista de pádel:`,
    ``,
    `Día: ${date}`,
    `Hora: ${start}–${end}`,
    `Pista: ${court}`,
    ...(name ? [`Nombre: ${name}`] : []),
    ``,
    `¿Tenéis disponibilidad? Muchas gracias.`,
    `(Partido organizado con PadelSetMatch)`,
  ].join("\n");
}

/** wa.me link with the booking request pre-written, or null when the club doesn't book by WhatsApp. */
export function clubWhatsappBookingUrl(input: {
  clubName: string | null | undefined;
  startsAt: Date | string;
  courtType: CourtTypeKey;
  hostName?: string | null;
}): string | null {
  const wa = clubWhatsappBooking(input.clubName);
  if (!wa) return null;
  if (Number.isNaN(new Date(input.startsAt).getTime())) return null;
  const text = clubBookingMessage({ clubDisplayName: wa.displayName, startsAt: input.startsAt, courtType: input.courtType, hostName: input.hostName });
  return `https://wa.me/${wa.number}?text=${encodeURIComponent(text)}`;
}
