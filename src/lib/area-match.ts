import { decodeLocation } from "./types";

type Loc = { locations?: string[] | null; zone?: string | null };
const norm = (s: string) => s.trim().toLowerCase();

function placesOf(p: Loc) {
  const cities = new Set<string>();
  const areas = new Set<string>(); // "city|area"
  (p.locations ?? []).forEach((l) => {
    const d = decodeLocation(l);
    if (d.city) cities.add(norm(d.city));
    if (d.city && d.area) areas.add(`${norm(d.city)}|${norm(d.area)}`);
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
