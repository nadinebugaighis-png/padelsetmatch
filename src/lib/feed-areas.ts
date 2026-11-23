import { LOCATION_DATA } from "./locations";
import { canonicalArea, isCityWide, PAIRED_COMMUNITIES } from "./area-match";

/**
 * The Play feed aggregates games by the player's own areas: every game at a
 * club or address in one of their areas shows, nothing from elsewhere.
 * A player with La Moraleja sees only Greater La Moraleja; a player with
 * Salamanca and La Moraleja sees both. A city chosen without an area covers
 * the whole city, and so does any neighbourhood in a city-wide community
 * (Dubai, Marbella), matching the grid gate in area-match.ts.
 */
export type FeedArea = { key: string; label: string; keywords: string[] };

/** Text that marks a game as Greater La Moraleja (see canonicalArea). */
const MORALEJA_WORDS = ["Moraleja", "El Soto", "Encinar", "Arroyo de la Vega", "La Solana", "Diversia", "Brains"];

/** "Salamanca & Chamberí" matches games in Salamanca, Chamberí (with or without accent) or the pair. */
function pairedWords(label: string): string[] {
  const halves = label.split("&").map((h) => h.trim());
  return Array.from(new Set([label, ...halves, ...halves.map((h) => h.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))]));
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function cityAreas(country: string, city: string): string[] {
  const c = LOCATION_DATA.find((x) => fold(x.name) === fold(country));
  return c?.cities.find((x) => fold(x.name) === fold(city))?.areas ?? [];
}

export function feedAreas(rawLocations: unknown): FeedArea[] {
  if (!Array.isArray(rawLocations)) return [];
  const out = new Map<string, FeedArea>();
  const add = (a: FeedArea) => { if (!out.has(a.key)) out.set(a.key, a); };

  for (const raw of rawLocations) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const parts = raw.split("|").map((p) => p.trim());
    if (parts.length === 1) {
      add({ key: `place:${fold(parts[0]!)}`, label: parts[0]!, keywords: [parts[0]!] });
      continue;
    }
    for (let i = 0; i < parts.length; i += 3) {
      const country = parts[i] ?? "";
      const city = parts[i + 1] ?? "";
      const area = parts[i + 2] ?? "";
      if (area && !isCityWide(city)) {
        const canon = canonicalArea(area);
        if (canon === "la moraleja") add({ key: "area:la moraleja", label: "La Moraleja", keywords: MORALEJA_WORDS });
        else {
          const paired = PAIRED_COMMUNITIES.find((c) => c.key === canon);
          if (paired) add({ key: `area:${canon}`, label: paired.label, keywords: pairedWords(paired.label) });
          else add({ key: `area:${canon}`, label: area, keywords: [area] });
        }
      } else if (city) {
        add({ key: `city:${fold(city)}`, label: city, keywords: [city, ...cityAreas(country, city)] });
      }
    }
  }
  return Array.from(out.values());
}

/** Every keyword across the player's areas, for the server-side feed query. */
export function feedKeywords(rawLocations: unknown): string[] {
  return Array.from(new Set(feedAreas(rawLocations).flatMap((a) => a.keywords)));
}

type Placed = { city?: string | null; club_address?: string | null; club_name?: string | null };

export function eventInArea(e: Placed, area: FeedArea): boolean {
  const text = fold([e.city, e.club_address, e.club_name].filter(Boolean).join(" "));
  return area.keywords.some((k) => text.includes(fold(k)));
}
