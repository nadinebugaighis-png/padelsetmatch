import { decodeLocation } from "./types";

type Loc = { locations?: string[] | null; zone?: string | null };
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Greater La Moraleja: the surrounding communities count as one — El Soto,
 * El Encinar (officially Hortaleza, by the airport), Arroyo de la Vega,
 * La Solana and the Diversia / Brains school side. Hortaleza and Alcobendas
 * as wholes are NOT included.
 */
const GREATER_MORALEJA = [
  "moraleja",
  "encinar",
  "arroyo de la vega",
  "solana",
  "diversia",
  "brains",
];

export function canonicalArea(area: string): string {
  const a = norm(area).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (a === "el soto" || a === "soto") return "la moraleja";
  if (GREATER_MORALEJA.some((p) => a.includes(p))) return "la moraleja";
  return a;
}

function placesOf(p: Loc) {
  const cities = new Set<string>();
  const areas = new Set<string>(); // "city|area"
  (p.locations ?? []).forEach((l) => {
    const d = decodeLocation(l);
    if (d.city) cities.add(norm(d.city));
    if (d.city && d.area) areas.add(`${norm(d.city)}|${canonicalArea(d.area)}`);
  });
  if (p.zone) cities.add(norm(p.zone));
  return { cities, areas };
}

/**
 * Grid gate (World off): if I chose areas, a player must share one of my
 * city+area pairs (La Moraleja players see only La Moraleja). If I only gave
 * cities, fall back to sharing a city.
 */
export function sharesMyArea(me: Loc, them: Loc): boolean {
  const mine = placesOf(me);
  const theirs = placesOf(them);
  if (mine.areas.size > 0) {
    for (const a of mine.areas) if (theirs.areas.has(a)) return true;
    return false;
  }
  for (const c of mine.cities) if (theirs.cities.has(c)) return true;
  return false;
}
