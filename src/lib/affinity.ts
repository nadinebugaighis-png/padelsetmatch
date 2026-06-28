// City proximity. Same city is the strong signal; otherwise neutral.
export function zoneAffinity(a: string, b: string): number {
  if (!a || !b) return 3;
  return a.trim().toLowerCase() === b.trim().toLowerCase() ? 0 : 3;
}

const CULTURE_GROUPS: string[][] = [
  ["Spain", "Portugal"],
  ["Spain", "Italy", "France"],
  ["Italy", "France"],
  ["Spain", "Argentina", "Mexico", "Colombia"],
  ["Argentina", "Mexico", "Colombia", "Brazil"],
  ["United Kingdom", "Ireland", "United States"],
  ["Germany", "Netherlands", "Switzerland", "Sweden"],
];

export function cultureAffinity(a: string, b: string): number {
  if (a === b) return 0;
  for (const g of CULTURE_GROUPS) if (g.includes(a) && g.includes(b)) return 1;
  return 2;
}

export function playtomicLink(city: string) {
  return `https://playtomic.io/search?q=${encodeURIComponent(city)}`;
}
