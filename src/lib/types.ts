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

export const MADRID_ZONES = [
  "Centro",
  "Chamberí",
  "Salamanca",
  "Retiro",
  "Malasaña",
  "Chamartín",
  "Moncloa",
  "Tetuán",
  "La Latina",
  "Chueca",
  "La Moraleja",
  "Alcobendas",
] as const;
export type MadridZone = (typeof MADRID_ZONES)[number];

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

export type Profile = {
  id: string;
  user_id: string | null;
  is_seed: boolean;
  first_name: string;
  age: number;
  gender: Gender;
  interested_in: Gender[];
  age_min: number;
  age_max: number;
  nationality: string;
  zone: MadridZone;
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
