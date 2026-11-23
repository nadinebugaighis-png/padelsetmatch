import { canonicalArea, isCityWide, PAIRED_COMMUNITIES } from "./area-match";
import { LOCATION_PRESETS } from "./location-presets";
import { decodeLocation, encodeLocation } from "./types";

/**
 * Community directory. A community is a city + neighbourhood (or a whole city
 * when no neighbourhood was chosen, or for city-wide places like Dubai).
 * Membership is simply having that place in your profile's locations, so the
 * grid and Play feed already show each community's players and games.
 * Member counts follow the same rule as the grid gate in area-match.ts.
 */
export type Community = {
  /** Stable id: "country|city|area" folded, area canonical ("" for city-wide). */
  key: string;
  /** Encoded location to save on a profile or pass as a visit. */
  location: string;
  country: string;
  city: string;
  area?: string;
  /** Display name: neighbourhood, or city for city-wide communities. */
  label: string;
  members: number;
  mine: boolean;
};
export type DirectoryCity = { city: string; members: number; communities: Community[] };
export type DirectoryCountry = { country: string; members: number; cities: DirectoryCity[] };
export type Directory = { mine: Community[]; countries: DirectoryCountry[]; total: number };

const fold = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\s]+$/g, "");
const tidy = (s: string) => {
  const t = s.trim().replace(/[.\s]+$/g, "");
  return t && t === t.toLowerCase() ? t.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : t;
};

function areaLabel(canonical: string, raw: string): string {
  if (canonical === "la moraleja") return "La Moraleja";
  const paired = PAIRED_COMMUNITIES.find((c) => c.key === canonical);
  return paired ? paired.label : tidy(raw);
}

type Parsed = { key: string; cityKey: string; country: string; city: string; area?: string; label: string };

/** The community a saved location belongs to, or null when it has no city. */
export function communityOf(location: string): Parsed | null {
  const d = decodeLocation(location);
  if (!d.city || !d.country) return null;
  const country = tidy(d.country);
  const city = tidy(d.city);
  const cityKey = `${fold(country)}|${fold(city)}`;
  if (!d.area || isCityWide(d.city)) return { key: `${cityKey}|`, cityKey, country, city, label: city };
  const canon = canonicalArea(d.area);
  const label = areaLabel(canon, d.area);
  return { key: `${cityKey}|${canon}`, cityKey, country, city, area: label, label };
}

export function communityLocation(c: { country: string; city: string; area?: string }): string {
  return encodeLocation({ country: c.country, city: c.city, area: c.area });
}

/** Display name for a saved location ("La Moraleja", "Dubai"). */
export function communityLabel(location: string | null | undefined): string | null {
  return location ? communityOf(location)?.label ?? null : null;
}

type Member = { locations?: string[] | null };

export function buildDirectory(members: Member[], myLocations: string[] | null | undefined): Directory {
  const areaMembers = new Map<string, number>();
  const cityMembers = new Map<string, number>();
  const info = new Map<string, Parsed & { spellings: Map<string, number> }>();

  const remember = (p: Parsed) => {
    const cur = info.get(p.key) ?? { ...p, spellings: new Map<string, number>() };
    cur.spellings.set(p.label, (cur.spellings.get(p.label) ?? 0) + 1);
    info.set(p.key, cur);
  };

  for (const m of members) {
    const keys = new Set<string>();
    const cities = new Set<string>();
    for (const l of m.locations ?? []) {
      const p = communityOf(l);
      if (!p) continue;
      remember(p);
      keys.add(p.key);
      cities.add(p.cityKey);
    }
    keys.forEach((k) => { if (!k.endsWith("|")) areaMembers.set(k, (areaMembers.get(k) ?? 0) + 1); });
    cities.forEach((c) => cityMembers.set(c, (cityMembers.get(c) ?? 0) + 1));
  }

  // Curated communities always appear, even before anyone joins.
  for (const p of LOCATION_PRESETS) {
    const parsed = communityOf(communityLocation(p));
    if (parsed && !info.has(parsed.key)) info.set(parsed.key, { ...parsed, spellings: new Map([[parsed.label, 0]]) });
  }

  const mineKeys = new Set<string>();
  const myParsed: Parsed[] = [];
  for (const l of myLocations ?? []) {
    const p = communityOf(l);
    if (p && !mineKeys.has(p.key)) { mineKeys.add(p.key); myParsed.push(p); if (!info.has(p.key)) remember(p); }
  }

  const countOf = (p: Parsed) => (p.key.endsWith("|") ? cityMembers.get(p.cityKey) ?? 0 : areaMembers.get(p.key) ?? 0);
  const toCommunity = (key: string): Community => {
    const i = info.get(key)!;
    const best = [...i.spellings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? i.label;
    const area = i.area ? best : undefined;
    const label = i.area ? best : i.city;
    return { key, location: communityLocation({ country: i.country, city: i.city, area }), country: i.country, city: i.city, area, label, members: countOf(i), mine: mineKeys.has(key) };
  };

  // A whole-city entry is listed only where it is the community (city-wide
  // places, or cities with no neighbourhood community yet).
  const citiesWithAreas = new Set<string>();
  info.forEach((i, k) => { if (!k.endsWith("|") && (areaMembers.get(k) ?? 0) > 0) citiesWithAreas.add(i.cityKey); });

  const byCountry = new Map<string, Map<string, Community[]>>();
  const countryName = new Map<string, string>();
  const cityName = new Map<string, string>();
  info.forEach((i, key) => {
    if (key.endsWith("|") && !isCityWide(i.city) && citiesWithAreas.has(i.cityKey)) return;
    const c = toCommunity(key);
    const countryKey = fold(i.country);
    countryName.set(countryKey, countryName.get(countryKey) ?? i.country);
    cityName.set(i.cityKey, cityName.get(i.cityKey) ?? i.city);
    const cities = byCountry.get(countryKey) ?? new Map<string, Community[]>();
    cities.set(i.cityKey, [...(cities.get(i.cityKey) ?? []), c]);
    byCountry.set(countryKey, cities);
  });

  const countries: DirectoryCountry[] = [...byCountry.entries()].map(([countryKey, cities]) => {
    const cityList: DirectoryCity[] = [...cities.entries()].map(([cityKey, list]) => ({
      city: cityName.get(cityKey)!,
      members: cityMembers.get(cityKey) ?? 0,
      communities: list.sort((a, b) => b.members - a.members || a.label.localeCompare(b.label)),
    })).sort((a, b) => b.members - a.members || a.city.localeCompare(b.city));
    const memberSet = cityList.reduce((n, c) => n + c.members, 0);
    return { country: countryName.get(countryKey)!, members: memberSet, cities: cityList };
  }).sort((a, b) => b.members - a.members || a.country.localeCompare(b.country));

  return { mine: myParsed.map((p) => toCommunity(p.key)), countries, total: members.length };
}

/** Validate and normalise a place typed into "Start a community". */
export function newCommunityLocation(country: string, city: string, area: string): string | null {
  const c = country.trim(), ci = city.trim(), a = area.trim();
  if (!c || !ci || c.length > 60 || ci.length > 60 || a.length > 60) return null;
  if ([c, ci, a].some((s) => s.includes("|"))) return null;
  return communityLocation({ country: c, city: ci, area: a || undefined });
}
