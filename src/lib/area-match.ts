import { decodeLocation } from "./types";

type Loc = { locations?: string[] | null; zone?: string | null };
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Greater La Moraleja: the surrounding communities count as one, El Soto,
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

/**
 * Paired neighbourhoods that form one community (signup presets). Either
 * half, or the combined name, folds into the community key.
 */
export const PAIRED_COMMUNITIES: { key: string; label: string; parts: string[] }[] = [
  { key: "salamanca & chamberi", label: "Salamanca & Chamberí", parts: ["salamanca", "chamberi"] },
  { key: "chelsea & battersea", label: "Chelsea & Battersea", parts: ["chelsea", "battersea"] },
  { key: "coconut grove & brickell", label: "Coconut Grove & Brickell", parts: ["coconut grove", "brickell"] },
];

export function canonicalArea(area: string): string {
  const a = norm(area).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (a === "el soto" || a === "soto") return "la moraleja";
  if (GREATER_MORALEJA.some((p) => a.includes(p))) return "la moraleja";
  const paired = PAIRED_COMMUNITIES.find((c) => a === c.key || c.parts.includes(a));
  if (paired) return paired.key;
  return a;
}

/**
 * Cities that are one open community (signup presets without an area, e.g.
 * Marbella and Dubai): any neighbourhood there folds into the whole city.
 */
export const CITY_WIDE_CITIES = ["marbella", "dubai"];
const foldCity = (s: string) => norm(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function isCityWide(city: string): boolean {
  return CITY_WIDE_CITIES.includes(foldCity(city));
}

function placesOf(p: Loc) {
  const cities = new Set<string>();
  const areas = new Set<string>(); // "city|area"
  const areaCities = new Set<string>(); // cities where an area was chosen
  const openCities = new Set<string>(); // cities chosen without an area (or city-wide)
  (p.locations ?? []).forEach((l) => {
    const d = decodeLocation(l);
    if (!d.city) return;
    const city = norm(d.city);
    cities.add(city);
    if (d.area && !isCityWide(d.city)) {
      areas.add(`${city}|${canonicalArea(d.area)}`);
      areaCities.add(city);
    } else {
      openCities.add(city);
    }
  });
  if (p.zone) cities.add(norm(p.zone));
  return { cities, areas, areaCities, openCities };
}

/**
 * Grid gate (World off), one community at a time: an area community needs a
 * shared city+area (La Moraleja players see only La Moraleja); a city chosen
 * without an area (or a city-wide community like Dubai) needs a shared city,
 * unless I also chose an area in that same city, which keeps area
 * communities exclusive. With no locations at all, fall back to my zone.
 */
export function sharesMyArea(me: Loc, them: Loc): boolean {
  const mine = placesOf(me);
  const theirs = placesOf(them);
  for (const a of mine.areas) if (theirs.areas.has(a)) return true;
  const cityGates = mine.areas.size > 0
    ? [...mine.openCities].filter((c) => !mine.areaCities.has(c))
    : [...mine.cities];
  for (const c of cityGates) if (theirs.cities.has(c)) return true;
  return false;
}

/**
 * Roster heading: true when the viewer has chosen La Moraleja, or one of the
 * surrounding communities that count as it, as one of their areas. Only
 * La Moraleja gets its own heading for now; other places keep the plain one.
 */
export function isMoralejaMember(p: Loc): boolean {
  return (p.locations ?? []).some(
    (l) => canonicalArea(decodeLocation(l).area ?? "") === "la moraleja",
  );
}
