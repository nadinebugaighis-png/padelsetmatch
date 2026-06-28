export const PRIORITY_TRAITS = [
  "intellectual",
  "looks",
  "money",
  "social butterfly",
  "fun",
  "quiet",
  "preserved",
  "fashionable",
  "funny",
  "adventurous",
] as const;
export type PriorityTrait = (typeof PRIORITY_TRAITS)[number];

export const PADEL_LEVELS = ["just starting", "casual", "intermediate", "advanced", "competitive"] as const;
export type PadelLevel = (typeof PADEL_LEVELS)[number];

// Popular cities shown as quick-pick suggestions. Users can type any city worldwide.
export const POPULAR_CITIES = [
  "Madrid", "Barcelona", "Valencia", "Seville", "Málaga",
  "Lisbon", "Porto", "Paris", "Rome", "Milan",
  "London", "Dublin", "Berlin", "Amsterdam", "Stockholm",
  "Dubai", "Mexico City", "Buenos Aires", "São Paulo", "Bogotá",
  "Miami", "New York", "Los Angeles",
] as const;

export const POPULAR_COUNTRIES = [
  "Spain", "Portugal", "France", "Italy", "Germany", "United Kingdom",
  "Ireland", "Netherlands", "Sweden", "Switzerland",
  "United States", "Mexico", "Argentina", "Brazil", "Colombia",
  "United Arab Emirates", "Other",
] as const;

export const LANGUAGES = [
  "English", "Spanish", "Portuguese", "French", "Italian", "German",
  "Dutch", "Catalan", "Arabic", "Russian", "Mandarin", "Japanese",
  "Swedish", "Greek", "Turkish", "Hindi",
] as const;
export type Language = (typeof LANGUAGES)[number];

export const GENDERS = ["woman", "man", "non-binary"] as const;
export type Gender = (typeof GENDERS)[number];

// Audience options for friendship / partner targeting (broader than gender identity).
export const AUDIENCE_OPTIONS = [
  "women",
  "men",
  "non-binary",
  "gay men",
  "lesbian women",
  "bisexual",
  "queer",
  "everyone",
] as const;
export type Audience = (typeof AUDIENCE_OPTIONS)[number];

export const LOOKING_FOR = ["partner", "friend", "both"] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

export const NATIONALITIES = [
  "Spain", "Portugal", "Italy", "France", "Germany", "United Kingdom",
  "Argentina", "Mexico", "Colombia", "Brazil", "United States",
  "Netherlands", "Ireland", "Switzerland", "Sweden", "Other",
];

// A single location: country + city + optional area/barrio
export type LocationEntry = { country: string; city: string; area?: string };

// Serialized as "Country | City | Area" inside the locations text[] column
export function encodeLocation(l: LocationEntry): string {
  return [l.country, l.city, l.area ?? ""].map((s) => s.trim()).join(" | ");
}
export function decodeLocation(s: string): LocationEntry {
  const [country = "", city = "", area = ""] = s.split("|").map((x) => x.trim());
  return { country, city, area: area || undefined };
}
export function formatLocation(l: LocationEntry): string {
  return [l.area, l.city, l.country].filter(Boolean).join(", ");
}

export type Profile = {
  id: string;
  user_id: string | null;
  is_seed: boolean;
  first_name: string;
  age: number;
  gender: Gender;
  interested_in: Gender[];
  friend_interested_in: string[];
  partner_interested_in: string[];
  age_min: number;
  age_max: number;
  nationality: string;
  zone: string;
  locations: string[];
  languages: string[];
  level: PadelLevel;
  priorities: string[];
  looking_for: LookingFor;
  bio: string | null;
  photo_url: string | null;
};

export type RankedCandidate = Profile & {
  score: number;
  reasons: string[];
};
