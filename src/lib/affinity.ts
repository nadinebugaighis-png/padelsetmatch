// Madrid neighborhood proximity (curated, not real geo).
const ZONE_CLUSTERS: Record<string, number> = {
  "Centro|Malasaña": 1, "Centro|Chueca": 1, "Centro|La Latina": 1, "Centro|Chamberí": 2,
  "Chamberí|Malasaña": 1, "Chamberí|Chamartín": 2, "Chamberí|Salamanca": 2,
  "Salamanca|Retiro": 1, "Salamanca|Chamartín": 2, "Salamanca|Chueca": 1,
  "Retiro|La Latina": 2, "Retiro|Centro": 2,
  "Malasaña|Chueca": 1, "Malasaña|La Latina": 2,
  "Moncloa|Chamberí": 2, "Moncloa|Tetuán": 2,
  "Tetuán|Chamartín": 1, "Tetuán|Chamberí": 2,
};

export function zoneAffinity(a: string, b: string): number {
  if (a === b) return 0;
  return ZONE_CLUSTERS[`${a}|${b}`] ?? ZONE_CLUSTERS[`${b}|${a}`] ?? 3;
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

export function playtomicLink(zone: string) {
  return `https://playtomic.io/search?q=${encodeURIComponent("Madrid " + zone)}`;
}
