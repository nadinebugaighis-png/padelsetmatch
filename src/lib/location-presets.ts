// Communities shown right after signup. Names must match src/lib/locations.ts
// so onboarding dropdowns pre-select them. Paired neighbourhoods fold into one
// community via PAIRED_COMMUNITIES in src/lib/area-match.ts.
export type LocationPresetKey =
  | "madrid_la_moraleja"
  | "madrid_salamanca_chamberi"
  | "london_chelsea_battersea"
  | "miami_coconut_grove_brickell"
  | "dubai";
export type LocationPreset = { key: LocationPresetKey; country: string; city: string; area?: string };

export const LOCATION_PRESETS: LocationPreset[] = [
  { key: "madrid_la_moraleja", country: "Spain", city: "Madrid", area: "La Moraleja" },
  { key: "madrid_salamanca_chamberi", country: "Spain", city: "Madrid", area: "Salamanca & Chamberí" },
  { key: "london_chelsea_battersea", country: "United Kingdom", city: "London", area: "Chelsea & Battersea" },
  { key: "miami_coconut_grove_brickell", country: "United States", city: "Miami", area: "Coconut Grove & Brickell" },
  { key: "dubai", country: "United Arab Emirates", city: "Dubai" },
];

export function presetByKey(key: string | undefined): LocationPreset | undefined {
  return LOCATION_PRESETS.find((p) => p.key === key);
}
