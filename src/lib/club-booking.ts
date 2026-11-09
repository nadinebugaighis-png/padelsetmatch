import { normalizePlaytomicLink } from "@/lib/affinity";

/**
 * Where to send a player to book the court for a match.
 * Playtomic has no public booking API, so we deep-link out:
 *   1. the host's own pasted Playtomic link,
 *   2. a curated Playtomic club page for known clubs,
 *   3. a web search for "Playtomic <club>" when the host picked a real club.
 * Private / free courts and undecided clubs never show a booking link.
 */

type KnownClub = { url: string; words: string[][] };

// Each entry matches when ALL words of ANY word-set appear in the club name
// (accents stripped, lowercase). Keep words specific so similar names don't collide.
const KNOWN_CLUBS: KnownClub[] = [
  // playtomic.com/tenant/<id> is an app link: it opens the Playtomic app on the club
  // (falls back to the website when the app isn't installed). /clubs/<slug> only opens the website.
  { url: "https://playtomic.com/tenant/e0448759-a18b-4b53-a3d5-b8cb7333c7d7", words: [["moraleja", "club", "padel"]] },
  { url: "https://playtomic.com/tenant/c4204b18-1228-466a-89f8-a94f181f37c3", words: [["irlandesas"]] },
  { url: "https://playtomic.com/es/clubs/la-vida-padel-alcobendas", words: [["vida", "padel", "alcobendas"]] },
  { url: "https://playtomic.com/es/clubs/ciudad-deportiva-jarama", words: [["ciudad", "deportiva", "jarama"]] },
  { url: "https://playtomic.com/es/clubs/dreamfit-sanse", words: [["dreamfit", "sanse"], ["dreamfit", "san", "sebastian"]] },
  { url: "https://playtomic.com/es/clubs/campus-23-club-de-tenis-y-padel", words: [["campus", "23"]] },
  { url: "https://playtomic.com/es/clubs/norte-real-sport-club", words: [["norte", "real", "sport"]] },
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

export type BookingLink = { url: string; source: "host" | "club" | "search" };

export function knownClubBookingUrl(clubName: string | null | undefined): string | null {
  const name = norm(clubName);
  if (!name) return null;
  const tokens = new Set(name.split(" "));
  const hit = KNOWN_CLUBS.find((c) => c.words.some((set) => set.every((w) => tokens.has(w))));
  return hit?.url ?? null;
}

export function clubBookingLink(m: BookingInput): BookingLink | null {
  const host = m.playtomic_link ? normalizePlaytomicLink(m.playtomic_link).url : null;
  if (host) return { url: host, source: "host" };
  if (m.is_private_court || m.free_court) return null;

  const name = norm(m.club_name);
  if (!name || PLACEHOLDER_WORDS.some((p) => name === p || name.includes(p))) return null;

  const known = knownClubBookingUrl(m.club_name);
  if (known) return { url: known, source: "club" };

  // Only search when the host picked a real club from the list, not a typed address.
  if (!m.club_place_id) return null;
  const q = `Playtomic ${m.club_name ?? ""} ${m.city ?? ""}`.replace(/\s+/g, " ").trim();
  return { url: `https://www.google.com/search?q=${encodeURIComponent(q)}`, source: "search" };
}
