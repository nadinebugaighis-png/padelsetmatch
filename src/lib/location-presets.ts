// "Choose your location" presets shown right after signup. Names must match
// src/lib/locations.ts so onboarding dropdowns pre-select them.
export type LocationPresetKey = "madrid_la_moraleja" | "madrid" | "london" | "miami" | "dubai";
export type LocationPreset = { key: LocationPresetKey; country: string; city: string; area?: string };

export const LOCATION_PRESETS: LocationPreset[] = [
  { key: "madrid_la_moraleja", country: "Spain", city: "Madrid", area: "La Moraleja" },
  { key: "madrid", country: "Spain", city: "Madrid" },
  { key: "london", country: "United Kingdom", city: "London" },
  { key: "miami", country: "United States", city: "Miami" },
  { key: "dubai", country: "United Arab Emirates", city: "Dubai" },
];

export function presetByKey(key: string | undefined): LocationPreset | undefined {
  return LOCATION_PRESETS.find((p) => p.key === key);
}
