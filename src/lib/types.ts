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
] as const;
export type MadridZone = (typeof MADRID_ZONES)[number];

export const GENDERS = ["woman", "man", "non-binary"] as const;
export type Gender = (typeof GENDERS)[number];

export type Profile = {
  handle: string;
  avatar: string; // emoji
  gender: Gender;
  age: number;
  ageMin: number;
  ageMax: number;
  interestedIn: Gender[];
  nationality: string;
  zone: MadridZone;
  level: PadelLevel;
  priorities: PriorityTrait[]; // ordered, most important first
  bio?: string;
};

export type Candidate = Profile & { id: string };

export type RankedMatch = {
  id: string;
  score: number; // 0-100
  reasons: string[]; // short bullet reasons (rule-based)
  blurb: string; // AI-generated "why you'd click on court" note
};
