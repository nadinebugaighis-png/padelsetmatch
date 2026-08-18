import { LOCATION_DATA } from "./locations";

function addConfiguredAreaGroup(keywords: Set<string>, countryName: string, cityName: string) {
  const country = LOCATION_DATA.find((item) => item.name.toLocaleLowerCase() === countryName.toLocaleLowerCase());
  const city = country?.cities.find((item) => item.name.toLocaleLowerCase() === cityName.toLocaleLowerCase());

  keywords.add(cityName);
  city?.areas.forEach((area) => keywords.add(area));
}

export function locationMatchKeywords(rawLocations: unknown): string[] {
  if (!Array.isArray(rawLocations)) return [];

  const keywords = new Set<string>();
  for (const rawLocation of rawLocations) {
    if (typeof rawLocation !== "string" || !rawLocation.trim()) continue;

    const parts = rawLocation.split("|").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 1) {
      keywords.add(parts[0]);
      continue;
    }

    for (let index = 0; index < parts.length; index += 3) {
      const country = parts[index];
      const city = parts[index + 1];
      const area = parts[index + 2];

      if (country && city) addConfiguredAreaGroup(keywords, country, city);
      else if (city) keywords.add(city);
      if (area) keywords.add(area);
    }
  }

  return Array.from(keywords);
}