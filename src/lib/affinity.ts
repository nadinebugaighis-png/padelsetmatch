import { decodeLocation } from "./types";

// City proximity. Same city is the strong signal; otherwise neutral.
export function zoneAffinity(a: string, b: string): number {
  if (!a || !b) return 3;
  return a.trim().toLowerCase() === b.trim().toLowerCase() ? 0 : 3;
}

// Compare arrays of "Country | City | Area" location strings.
// Returns: 0 = same city, 1 = same country, 3 = no overlap.
export function locationAffinity(a: string[], b: string[]): { score: number; sharedCity?: string; sharedCountry?: string } {
  if (!a?.length || !b?.length) return { score: 3 };
  const A = a.map(decodeLocation);
  const B = b.map(decodeLocation);
  for (const x of A) for (const y of B) {
    if (x.city && y.city && x.city.toLowerCase() === y.city.toLowerCase()) {
      return { score: 0, sharedCity: x.city };
    }
  }
  for (const x of A) for (const y of B) {
    if (x.country && y.country && x.country.toLowerCase() === y.country.toLowerCase()) {
      return { score: 1, sharedCountry: x.country };
    }
  }
  return { score: 3 };
}

export function languageOverlap(a: string[], b: string[]): string[] {
  if (!a?.length || !b?.length) return [];
  const set = new Set(a.map((x) => x.toLowerCase()));
  return b.filter((x) => set.has(x.toLowerCase()));
}

// Groups use adjectival nationality forms matching NATIONALITIES in types.ts.
const CULTURE_GROUPS: string[][] = [
  ["Spanish", "Portuguese"],
  ["Spanish", "Italian", "French"],
  ["Italian", "French"],
  ["Spanish", "Argentine", "Mexican", "Colombian", "Peruvian", "Chilean", "Uruguayan", "Venezuelan", "Ecuadorian", "Bolivian", "Paraguayan"],
  ["Argentine", "Mexican", "Colombian", "Brazilian", "Peruvian", "Chilean", "Uruguayan", "Venezuelan"],
  ["British", "Irish", "American", "Canadian", "Australian", "New Zealander", "Scottish", "Welsh"],
  ["German", "Dutch", "Swiss", "Austrian", "Belgian", "Luxembourgish"],
  ["Swedish", "Norwegian", "Danish", "Finnish", "Icelandic"],
  ["Saudi", "Emirati", "Qatari", "Kuwaiti", "Bahraini", "Omani", "Yemeni"],
  ["Egyptian", "Jordanian", "Lebanese", "Syrian", "Palestinian", "Iraqi"],
  ["Moroccan", "Algerian", "Tunisian", "Libyan"],
  ["Indian", "Pakistani", "Bangladeshi", "Sri Lankan", "Nepali"],
  ["Chinese", "Taiwanese", "Singaporean"],
  ["Japanese", "South Korean"],
  ["Polish", "Czech", "Slovak", "Hungarian"],
  ["Serbian", "Croatian", "Bosnian", "Montenegrin", "Slovenian", "Macedonian", "Kosovar"],
  ["Russian", "Ukrainian", "Belarusian"],
  ["Kenyan", "Tanzanian", "Ugandan", "Rwandan"],
  ["Nigerian", "Ghanaian", "Ivorian", "Senegalese"],
];

export function cultureAffinity(a: string, b: string): number {
  if (a === b) return 0;
  for (const g of CULTURE_GROUPS) if (g.includes(a) && g.includes(b)) return 1;
  return 2;
}

export function playtomicLink(city: string) {
  return `https://playtomic.io/search?q=${encodeURIComponent(city)}`;
}

/**
 * Normalize a user-pasted Playtomic booking link.
 * - Trims whitespace
 * - Adds https:// if missing
 * - Rewrites bare playtomic.com (which returns a CloudFront 403) to playtomic.io
 * - Returns null for empty input
 * - Returns { error } for anything that isn't a Playtomic URL
 */
export function normalizePlaytomicLink(
  raw: string | null | undefined,
): { url: string | null; error?: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { url: null };
  if (trimmed.length > 500) return { url: null, error: "Link is too long" };

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { url: null, error: "Not a valid link" };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const isPlaytomic =
    host === "playtomic.io" ||
    host === "playtomic.com" ||
    host.endsWith(".playtomic.io") ||
    host.endsWith(".playtomic.com");
  if (!isPlaytomic) return { url: null, error: "Must be a playtomic.io link" };

  // playtomic.com/ (root) returns a CloudFront 403 in mobile browsers.
  // Deep club paths like playtomic.com/clubs/... work; rewrite only the bare host.
  if (host === "playtomic.com") {
    if (parsed.pathname === "/" || parsed.pathname === "") {
      parsed.hostname = "playtomic.io";
    }
  }

  parsed.protocol = "https:";
  return { url: parsed.toString() };
}
