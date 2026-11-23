import { normalizePlaytomicLink } from "@/lib/affinity";

/**
 * Where to send a player to book the court for a match.
 * Playtomic has no public booking API, so we deep-link out:
 *   1. the host's own pasted Playtomic link,
 *   2. a curated club booking page for known clubs (Playtomic, or the club's own
 *      booking site when it isn't on Playtomic),
 *   3. a web search for "Playtomic <club>" when the host picked a real club.
 * Private / free courts and undecided clubs never show a booking link.
 *
 * Every Playtomic / Padel Mates link we send out carries UTM tags so Playtomic and the clubs
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
  { key: "club_el_estudiante", url: "https://playtomic.com/tenant/4739d8b8-41e0-499a-9eda-b7d6e658e29b", words: [["estudiante"]] },
  // Chamberí. FMP books on Playtomic; Parque de Santander (Canal Ocio y Deporte) only on its own site, after signing in.
  { key: "fmp_canal_isabel_ii", url: "https://playtomic.com/clubs/fmp-canal-de-isabel-ii", words: [["fmp", "canal"], ["fmp", "isabel"], ["federacion", "padel", "canal"]] },
  // London clubs on Playtomic .
  { key: "rocks_lane_chiswick", url: "https://playtomic.com/clubs/rocks-lane-chiswick", words: [["rocks", "lane", "chiswick"]] },
  { key: "rocks_lane_barnes", url: "https://playtomic.com/clubs/rocks-lane-barnes-london", words: [["rocks", "lane", "barnes"]] },
  { key: "barn_elms", url: "https://playtomic.com/clubs/barn-elms-sports-centre", words: [["barn", "elms"]] },
  { key: "battersea_millennium_arena", url: "https://playtomic.com/clubs/battersea-park-millennium-arena", words: [["battersea", "millennium"], ["millennium", "arena"]] },
  { key: "padel_social_earls_court", url: "https://playtomic.com/clubs/padel-social-club-earls-court", words: [["padel", "social", "earls"], ["padel", "social", "earl"]] },
  { key: "padel_social_o2", url: "https://playtomic.com/clubs/padel-social-club-the-o2", words: [["padel", "social", "o2"]] },
  { key: "cw_padel_club", url: "https://playtomic.com/clubs/cw-padel-club", words: [["cw", "padel"]] },
  { key: "powerleague_shoreditch", url: "https://playtomic.com/clubs/powerleague-shoreditch", words: [["powerleague", "shoreditch"]] },
  { key: "padel_play_london", url: "https://playtomic.com/clubs/padel-play-london", words: [["padel", "play", "london"]] },
  { key: "padelhub_n20", url: "https://playtomic.com/clubs/the-padel-hub-n20-north-london", words: [["padelhub"], ["padel", "hub", "n20"]] },
  { key: "padel_united_willesden", url: "https://playtomic.com/clubs/padel-united-willesden", words: [["padel", "united", "willesden"]] },
  { key: "s3_finchley_road", url: "https://playtomic.com/clubs/s3-finchley-rd", words: [["s3", "finchley"]] },
  { key: "s3_wembley", url: "https://playtomic.com/clubs/social-sports-wembley", words: [["s3", "wembley"], ["social", "sports", "wembley"]] },
  { key: "s3_sutton", url: "https://playtomic.com/clubs/s3-padel-sutton", words: [["s3", "sutton"]] },
  { key: "the_hive_london", url: "https://playtomic.com/clubs/the-hive-london", words: [["hive", "london"]] },
  { key: "catford_padel", url: "https://playtomic.com/clubs/catford-padel-collective", words: [["catford", "padel"]] },
  { key: "padel_pals_sydenham", url: "https://playtomic.com/clubs/padel-pals", words: [["padel", "pals"]] },
  { key: "padel_padel_eltham", url: "https://playtomic.com/clubs/padel-padel-eltham", words: [["padel", "eltham"]] },
  { key: "georgians_padel", url: "https://playtomic.com/clubs/georgians-padel", words: [["georgians", "padel"]] },
  { key: "padel_zest", url: "https://playtomic.com/clubs/padel-zest", words: [["padel", "zest"]] },
  { key: "padel_and_coffee", url: "https://playtomic.com/clubs/padel-and-coffee", words: [["padel", "coffee"]] },
  { key: "the_108", url: "https://playtomic.com/clubs/the-108", words: [["108", "padel"]] },
  // London clubs on Padel Mates (Padium, Racketeer and Rocket Padel moved there from Playtomic).
  { key: "padium_canary_wharf", url: "https://padelmates.se/club/47d2eb0db7194a9dbd29783c3a2a82ad", words: [["padium"]] },
  { key: "racketeer", url: "https://padelmates.se/club/5111764d9bb14be3adbdb8e133e8bd80", words: [["racketeer"]] },
  { key: "rocket_padel_battersea", url: "https://padelmates.se/club/n8T0bz1PtMa1WhVElJ7Eclg0ooj2", words: [["rocket", "padel", "battersea"], ["rocket", "padel", "bps"], ["rocket", "padel", "cupra"]] },
  { key: "rocket_padel_beckton", url: "https://padelmates.se/club/f953765495194a299e49f49674d69a41", words: [["rocket", "padel", "beckton"]] },
  { key: "rocket_padel_ilford", url: "https://padelmates.se/club/788fa2c66535421aabc60fd27f941c42", words: [["rocket", "padel", "ilford"]] },
  { key: "instantpadel_canada_water", url: "https://padelmates.se/club/10a9c13109b94d148565f4920c55dd62", words: [["instantpadel"], ["instant", "padel", "canada"]] },
  { key: "house_of_racquet", url: "https://padelmates.se/club/d11965b0f8c24527bf36491e6c32a39f", words: [["house", "racquet"]] },
  { key: "playtime_padel_kingston", url: "https://padelmates.se/club/playtimepadelclubkingstonlondon", words: [["playtime", "padel", "kingston"]] },
  // London. ParkSports sites aren't on Playtomic; the page opens on today's date.
  { key: "parksports_lammas", url: "https://lammas.parksports.co.uk/Booking/BookByDate#?role=guest&resource-group-id=2f693518-ea79-40ef-8f53-13cb83bf211f", words: [["lammas"]] },
  { key: "parque_santander", url: "https://www.ocioydeportecanal.es/es/signin", words: [["parque", "santander"], ["canal", "ocio", "deporte"], ["tercer", "deposito"]] },
  // Marbella. Nueva Alcántara books on Taykus, the rest on Playtomic.
  { key: "los_naranjos_marbella", url: "https://playtomic.com/clubs/los-naranjos-padel-club", words: [["naranjos", "padel"], ["naranjos", "marbella"]] },
  { key: "puente_romano", url: "https://playtomic.com/clubs/puente-romano", words: [["puente", "romano"]] },
  { key: "manolo_santana_marbella", url: "https://playtomic.com/clubs/new-manolo-santana", words: [["manolo", "santana"]] },
  { key: "padel_center_banus", url: "https://playtomic.com/clubs/padel-center-banus", words: [["padel", "banus"], ["center", "banus"], ["centre", "banus"]] },
  { key: "el_mirador_marbella", url: "https://playtomic.com/clubs/club-de-tenis-y-padel-el-mirador", words: [["mirador", "marbella"], ["tenis", "padel", "mirador"], ["tennis", "padel", "mirador"]] },
  { key: "los_granados_marbella", url: "https://playtomic.com/clubs/club-de-padel-los-granados", words: [["granados", "padel"], ["granados", "marbella"], ["racket", "club", "granados"]] },
  { key: "royal_tennis_marbella", url: "https://playtomic.com/clubs/royal-tennis-club-marbella", words: [["royal", "tennis", "marbella"]] },
  { key: "cap_racket_club", url: "https://playtomic.com/clubs/cap-racket-club", words: [["cap", "racket"]] },
  { key: "rafa_nadal_marbella", url: "https://playtomic.com/clubs/rafa-nadal-tennis-center-marbella", words: [["rafa", "nadal", "marbella"]] },
  { key: "nueva_alcantara_club", url: "https://nac.taykus.com/bookingtypes?bookings=true", words: [["nueva", "alcantara"]] },
  // Dubai, all on Playtomic.
  { key: "sab_padel_difc", url: "https://playtomic.com/clubs/sab-padel", words: [["sab", "padel"]] },
  { key: "padel_pro_one_central", url: "https://playtomic.com/clubs/padel-pro-one-central", words: [["padel", "pro", "central"]] },
  { key: "club_padel_dubai", url: "https://playtomic.com/clubs/club-padel-dubai", words: [["club", "padel", "dubai"]] },
  { key: "casa_padel_ripe", url: "https://playtomic.com/clubs/casa-padel-ripe-market", words: [["casa", "padel"]] },
  { key: "padel_park_dubai", url: "https://playtomic.com/clubs/padelpark-dubai", words: [["padel", "park", "ripe"], ["padel", "park", "dubai"], ["padelpark"]] },
  { key: "padel_islands_dubai", url: "https://playtomic.com/clubs/padelx-floating-club", words: [["padel", "islands"]] },
  { key: "playce_dubai", url: "https://playtomic.com/clubs/playce", words: [["playce"]] },
  { key: "dock_and_court", url: "https://playtomic.com/clubs/dock-and-court", words: [["dock", "court"]] },
  { key: "matcha_club_al_quoz", url: "https://playtomic.com/clubs/matcha-club-alquoz", words: [["matcha"]] },
  { key: "padel_kingdom_dubai", url: "https://playtomic.com/clubs/padel-kingdom-dubai", words: [["padel", "kingdom"]] },
  { key: "club_15_dubai", url: "https://playtomic.com/clubs/club-15", words: [["club", "15", "quoz"], ["club", "15", "dubai"]] },
  { key: "premier_padel_al_quoz", url: "https://playtomic.com/clubs/premier-padel", words: [["premier", "padel", "quoz"]] },
  { key: "al_habtoor_sports_hub", url: "https://playtomic.com/clubs/al-habtoor-sports-hub", words: [["habtoor"]] },
  // Miami. Reserve Seaplane books on Reserve's own site, the rest on Playtomic.
  { key: "ultra_padel_aventura", url: "https://playtomic.com/clubs/ultra-padel-aventura", words: [["ultra", "padel", "aventura"]] },
  { key: "ultra_padel_magic_city", url: "https://playtomic.com/clubs/ultra-padel-miami", words: [["ultra", "padel", "magic"], ["ultra", "padel", "miami"], ["ultra", "club", "magic"]] },
  { key: "padel_x_lincoln_road", url: "https://playtomic.com/clubs/padel-x-summer-club", words: [["padel", "x", "lincoln"]] },
  { key: "padel_x_miami", url: "https://playtomic.com/clubs/padel-x-miami", words: [["padel", "x", "miami"]] },
  { key: "real_padel_miami", url: "https://playtomic.com/clubs/real-padel-miami", words: [["real", "padel", "miami"]] },
  { key: "reserve_sole_mia", url: "https://playtomic.com/clubs/reserve-sole-mia", words: [["reserve", "sole"]] },
  { key: "reserve_seaplane", url: "https://book.reservepadel.com/", words: [["reserve", "seaplane"]] },
  { key: "point_miami_beach", url: "https://playtomic.com/clubs/point-miami-beach", words: [["point", "miami", "beach"], ["padel", "point", "miami"]] },
  { key: "midtown_padel_miami", url: "https://playtomic.com/clubs/midtown-padel", words: [["midtown", "padel"]] },
  { key: "the_gables_padel", url: "https://playtomic.com/clubs/the-gables-padel", words: [["gables", "padel"]] },
  { key: "icon_padel_club", url: "https://playtomic.com/clubs/icon-padel", words: [["icon", "padel"]] },
  { key: "platinum_padel_miami", url: "https://playtomic.com/clubs/platinum-padel", words: [["platinum", "padel"]] },
  { key: "pulse_padel_hub", url: "https://playtomic.com/clubs/pulse-padel-hub", words: [["pulse", "padel"]] },
  { key: "one_indoor_club", url: "https://playtomic.com/clubs/one-padel-indoor-club", words: [["one", "indoor", "club"]] },
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
export const COURT_TYPES = [
  { key: "glass_outdoor", es: "Cristal exterior", en: "Outdoor glass", fr: "Vitrée extérieure" },
  { key: "glass_covered", es: "Cristal cubierta", en: "Covered glass", fr: "Vitrée couverte" },
  { key: "wall_outdoor", es: "Muro exterior", en: "Outdoor wall", fr: "Mur extérieur" },
  { key: "wall_covered", es: "Cubierta de muro", en: "Covered wall", fr: "Mur couvert" },
  { key: "any", es: "Cualquiera disponible", en: "Any available", fr: "Peu importe" },
] as const;
export type CourtTypeKey = (typeof COURT_TYPES)[number]["key"];

// Each club lists only the court types it actually has ("any" is always offered last).
const CLUB_WHATSAPP: Record<string, { number: string; displayName: string; courts: CourtTypeKey[] }> = {
  club_padel_la_moraleja: {
    number: "34647103375",
    displayName: "Club de Pádel La Moraleja",
    courts: ["glass_outdoor", "wall_outdoor", "wall_covered", "any"],
  },
  // Alcobendas, 40 glass courts (30 covered, 10 outdoor). Number from the club website's WhatsApp button.
  club_el_estudiante: {
    number: "34677212074",
    displayName: "Club El Estudiante",
    courts: ["glass_covered", "glass_outdoor", "any"],
  },
};

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

/* ------------------------------------------------------------------ */
/* Book a court: curated clubs players can reserve directly            */
/* ------------------------------------------------------------------ */
export type BookCourtRegion = "madrid" | "london" | "marbella" | "dubai" | "miami";
/** Book a court city tabs, in order. */
export const BOOK_COURT_REGIONS: BookCourtRegion[] = ["madrid", "london", "marbella", "dubai", "miami"];
const BOOK_COURT_NAMES: Array<[string, string, BookCourtRegion]> = [
  ["club_padel_la_moraleja", "Club de Pádel La Moraleja", "madrid"],
  ["riber_padel_moraleja", "Riber Pádel Moraleja", "madrid"],
  ["club_irlandesas", "Club Irlandesas", "madrid"],
  ["club_el_estudiante", "Club El Estudiante", "madrid"],
  ["liceo_europeo", "Liceo Europeo", "madrid"],
  ["golf_park", "Golf Park", "madrid"],
  ["las_tablas_sports_club", "Las Tablas Sports Club", "madrid"],
  ["la_vida_padel_alcobendas", "La Vida Pádel Alcobendas", "madrid"],
  ["calido_alcobendas", "Cálido Alcobendas", "madrid"],
  ["ciudad_deportiva_jarama", "Ciudad Deportiva Jarama", "madrid"],
  ["dreamfit_sanse", "Dreamfit Sanse", "madrid"],
  ["campus_23", "Campus 23", "madrid"],
  ["norte_real_sport_club", "Norte Real Sport Club", "madrid"],
  ["fmp_canal_isabel_ii", "FMP Canal de Isabel II", "madrid"],
  ["parque_santander", "Parque de Santander", "madrid"],
  ["rocks_lane_chiswick", "Rocks Lane Chiswick", "london"],
  ["rocks_lane_barnes", "Rocks Lane Barnes", "london"],
  ["barn_elms", "Barn Elms Sports Centre", "london"],
  ["battersea_millennium_arena", "Battersea Park Millennium Arena", "london"],
  ["padel_social_earls_court", "Padel Social Club Earl's Court", "london"],
  ["padel_social_o2", "Padel Social Club The O2", "london"],
  ["cw_padel_club", "CW Padel Club", "london"],
  ["powerleague_shoreditch", "Powerleague Shoreditch", "london"],
  ["padel_play_london", "Padel Play London", "london"],
  ["padelhub_n20", "The Padel Hub N20", "london"],
  ["padel_united_willesden", "Padel United Willesden", "london"],
  ["s3_finchley_road", "S3 Finchley Road", "london"],
  ["s3_wembley", "S3 Wembley", "london"],
  ["s3_sutton", "S3 Sutton", "london"],
  ["the_hive_london", "The Hive London", "london"],
  ["catford_padel", "Catford Padel Collective", "london"],
  ["padel_pals_sydenham", "Padel Pals Sydenham", "london"],
  ["padel_padel_eltham", "Padel Padel Eltham", "london"],
  ["georgians_padel", "Georgians Padel", "london"],
  ["padel_zest", "Padel Zest", "london"],
  ["padel_and_coffee", "Padel & Coffee", "london"],
  ["the_108", "The 108", "london"],
  ["padium_canary_wharf", "Padium Canary Wharf", "london"],
  ["racketeer", "Racketeer", "london"],
  ["rocket_padel_battersea", "Rocket Padel Battersea", "london"],
  ["rocket_padel_beckton", "Rocket Padel Beckton", "london"],
  ["rocket_padel_ilford", "Rocket Padel Ilford", "london"],
  ["instantpadel_canada_water", "InstantPadel Canada Water", "london"],
  ["house_of_racquet", "House of Racquet", "london"],
  ["playtime_padel_kingston", "Playtime Padel Kingston", "london"],
  ["parksports_lammas", "Lammas Park, Ealing", "london"],
  ["los_naranjos_marbella", "Los Naranjos Padel Club", "marbella"],
  ["puente_romano", "Puente Romano", "marbella"],
  ["manolo_santana_marbella", "Manolo Santana Racquets Club", "marbella"],
  ["padel_center_banus", "Padel Center Banús", "marbella"],
  ["el_mirador_marbella", "Club de Tenis y Pádel El Mirador", "marbella"],
  ["los_granados_marbella", "Club de Pádel Los Granados", "marbella"],
  ["royal_tennis_marbella", "Royal Tennis Club Marbella", "marbella"],
  ["cap_racket_club", "CAP Racket Club", "marbella"],
  ["rafa_nadal_marbella", "Rafa Nadal Tennis Center Marbella", "marbella"],
  ["nueva_alcantara_club", "Nueva Alcántara Club", "marbella"],
  ["sab_padel_difc", "SAB Padel, DIFC", "dubai"],
  ["padel_pro_one_central", "Padel Pro One Central", "dubai"],
  ["club_padel_dubai", "Club Padel Dubai", "dubai"],
  ["casa_padel_ripe", "Casa Padel Ripe Market", "dubai"],
  ["padel_park_dubai", "Padel Park Dubai, Ripe Market", "dubai"],
  ["padel_islands_dubai", "Padel Islands Floating Club", "dubai"],
  ["playce_dubai", "Playce", "dubai"],
  ["dock_and_court", "Dock and Court", "dubai"],
  ["matcha_club_al_quoz", "Matcha Club Al Quoz", "dubai"],
  ["padel_kingdom_dubai", "Padel Kingdom Dubai", "dubai"],
  ["club_15_dubai", "Club 15", "dubai"],
  ["premier_padel_al_quoz", "Premier Padel, Al Quoz", "dubai"],
  ["al_habtoor_sports_hub", "Al Habtoor Sports Hub", "dubai"],
  ["ultra_padel_magic_city", "Ultra Padel Miami, Magic City", "miami"],
  ["padel_x_miami", "Padel X Miami", "miami"],
  ["real_padel_miami", "Real Padel Miami", "miami"],
  ["reserve_seaplane", "Reserve Seaplane", "miami"],
  ["reserve_sole_mia", "Reserve Sole Mia", "miami"],
  ["point_miami_beach", "Point Miami Beach", "miami"],
  ["padel_x_lincoln_road", "Padel X Lincoln Road", "miami"],
  ["midtown_padel_miami", "Midtown Padel", "miami"],
  ["the_gables_padel", "The Gables Padel", "miami"],
  ["icon_padel_club", "Icon Padel Club", "miami"],
  ["platinum_padel_miami", "Platinum Padel", "miami"],
  ["pulse_padel_hub", "Pulse Padel Hub", "miami"],
  ["ultra_padel_aventura", "Ultra Padel Aventura", "miami"],
  ["one_indoor_club", "One Indoor Club", "miami"],
];

export type BookCourtClub = { key: string; name: string; region: BookCourtRegion; url: string; via: "playtomic" | "padelmates" | "club" };

/** Every curated club with its tagged booking page, in display order. */
export function bookCourtClubs(): BookCourtClub[] {
  const out: BookCourtClub[] = [];
  for (const [key, name, region] of BOOK_COURT_NAMES) {
    const known = KNOWN_CLUBS.find((c) => c.key === key);
    if (!known) continue;
    const via = known.url.includes("playtomic.com") ? "playtomic" : known.url.includes("padelmates") ? "padelmates" : "club";
    out.push({ key, name, region, url: tagBookingUrl(known.url), via });
  }
  return out;
}

/** The Book a court tab a player lands on: their first place that has a club list, else Madrid. */
export function bookCourtRegionFor(locations: readonly string[] | null | undefined): BookCourtRegion {
  for (const raw of locations ?? []) {
    const t = norm(raw);
    if (/\b(london|londres)\b/.test(t)) return "london";
    if (/\bmarbella\b/.test(t)) return "marbella";
    if (/\bdubai\b/.test(t)) return "dubai";
    if (/\bmiami\b/.test(t)) return "miami";
    if (/\bmadrid\b/.test(t)) return "madrid";
  }
  return "madrid";
}
