export const PRIORITY_TRAITS = [
  // Social & relationships
  "Friendship",
  "Family",
  "Romance & relationships",
  "Community",
  "Deep conversations",
  "Humor & laughter",
  // Lifestyle & wellbeing
  "Health & wellbeing",
  "Fitness",
  "Mindfulness & meditation",
  "Comfort & home life",
  "Food & cooking",
  "Travel",
  "Nature & outdoors",
  "Adventure",
  // Growth & purpose
  "Learning & curiosity",
  "Personal growth",
  "Purpose & meaning",
  "Work & career",
  "Ambition & success",
  "Entrepreneurship",
  "Education",
  "Money & financial freedom",
  // Creativity & culture
  "Creativity & making",
  "Art",
  "Music",
  "Reading",
  "Gaming",
  "Technology",
  // Values & giving
  "Social causes",
  "Sustainability",
  "Volunteering & giving back",
  "Pets & animals",
  "Spontaneity & surprises",
] as const;

export type PriorityTrait = (typeof PRIORITY_TRAITS)[number];

export const PERSONAL_STRENGTHS = [
  "Honest", "Kind", "Calm", "Curious", "Confident", "Friendly", "Loyal", "Patient",
  "Organized", "Open-minded", "Ambitious", "Ambidextrous", "Brave", "Creative",
  "Determined", "Diplomatic", "Easygoing", "Empathetic", "Energetic", "Flexible",
  "Generous", "Humble", "Independent", "Introverted", "Outgoing", "Practical",
  "Reflective", "Reliable", "Serious", "Witty/funny",
] as const;
export const HONEST_EDGES = [
  "Direct", "Reserved", "Quiet", "Sensitive", "Emotional",
  "Impatient", "Stubborn", "Perfectionist",
] as const;
export const PERSONAL_TRAITS = [...PERSONAL_STRENGTHS, ...HONEST_EDGES] as const;
export type PersonalTrait = (typeof PERSONAL_TRAITS)[number];

export const PADEL_STYLES = [
  "Defensive", "Strategic", "Balanced", "Aggressive", "Power hitter",
  "Fast & athletic", "Patient", "Creative", "Net specialist", "Smash lover",
  // Legacy values kept so existing profiles remain valid
  "Competitive", "Casual", "Team player", "Coachable", "Loves tournaments",
  "Just for fun", "Always improving", "Fitness-focused", "Social player",
] as const;
export type PadelStyle = (typeof PADEL_STYLES)[number];

export const PADEL_LEVELS = ["just starting", "casual", "intermediate", "advanced", "competitive"] as const;
export type PadelLevel = (typeof PADEL_LEVELS)[number];

// New 7-tier detail label. Stored in profiles.level_detail. Old `level` stays authoritative for filters.
export const PADEL_LEVEL_DETAILS = [
  "Beginner", "Beginner+", "Intermediate", "Intermediate+",
  "Advanced", "Advanced+", "Competition / Pro",
] as const;
export type PadelLevelDetail = (typeof PADEL_LEVEL_DETAILS)[number];

export const PLAY_FREQUENCIES = [
  "Every day", "5–6 times/week", "3–4 times/week",
  "1–2 times/week", "A few times/month", "Occasionally",
] as const;
export type PlayFrequency = (typeof PLAY_FREQUENCIES)[number];

export const LOOKING_FOR_TAGS = [
  "Competitive matches", "Casual games", "Training partner", "Mixed matches",
  "Women's matches", "Men's matches", "Tournaments", "New friends",
  "Long-term padel partner", "Last-minute games", "Players nearby",
  "Improve my level", "Coaching",
] as const;
export type LookingForTag = (typeof LOOKING_FOR_TAGS)[number];

export const MAIN_GOALS = [
  "Play more often", "Meet players my level", "Find regular partners",
  "Improve my game", "Join tournaments", "Find mixed matches",
  "Expand my social circle", "Stay active", "Discover new clubs",
] as const;
export type MainGoal = (typeof MAIN_GOALS)[number];

export const AVAILABILITY_SLOTS = [
  "Weekday mornings", "Weekday lunchtime", "Weekday evenings",
  "Weekend mornings", "Weekend afternoons", "Weekend evenings",
] as const;
export type AvailabilitySlot = (typeof AVAILABILITY_SLOTS)[number];

export const COURT_SIDES = ["right", "left", "both"] as const;
export type CourtSide = (typeof COURT_SIDES)[number];

export const REPORT_REASONS = [
  "Harassment or abuse",
  "Fake profile or catfishing",
  "Inappropriate photos",
  "Inappropriate messages",
  "Spam or scam",
  "Underage user",
  "No-show on booked match",
  "Other",
] as const;

// Madrid zones / barrios — v1 focuses on Madrid only.
export const MADRID_ZONES = [
  "Centro", "Salamanca", "Chamberí", "Chamartín", "Retiro",
  "Moncloa-Aravaca", "Aravaca", "Mirasierra", "Tetuán", "Arganzuela",
  "Latina", "Carabanchel", "Usera", "Puente de Vallecas", "Moratalaz",
  "Ciudad Lineal", "Arturo Soria", "Conde Orgaz", "Hortaleza", "Villaverde",
  "Villa de Vallecas", "Vicálvaro", "San Blas-Canillejas", "Barajas",
  "La Moraleja", "Alcobendas", "San Sebastián de los Reyes",
  "Tres Cantos", "Las Rozas", "Majadahonda", "Pozuelo de Alarcón",
  "Boadilla del Monte", "Villanueva de la Cañada", "Villaviciosa de Odón",
] as const;
export type MadridZone = (typeof MADRID_ZONES)[number];

// Kept for backward-compat (read by other code); not surfaced in onboarding UI.
export const POPULAR_CITIES = ["Madrid"] as const;
export const POPULAR_COUNTRIES = ["Spain"] as const;


export const LANGUAGES = [
  "English", "Spanish", "Portuguese", "French", "Italian", "German",
  "Dutch", "Catalan", "Arabic", "Russian", "Mandarin", "Japanese",
  "Swedish", "Greek", "Turkish", "Hindi",
] as const;
export type Language = (typeof LANGUAGES)[number];

export const GENDERS = ["woman", "man", "non-binary", "self-describe"] as const;
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

// New multi-select intent model. A user can want any combination of:
// - "padel"        : just a padel partner, no social pressure
// - "friend"       : open to friendship beyond the court
// - "relationship" : open to dating
export const INTENTS = ["padel", "friend", "relationship"] as const;
export type Intent = (typeof INTENTS)[number];

// Comprehensive list of world nationalities (UN member states + widely recognized).
// Alphabetical, with "Other" at the end for anything not listed.
export const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguan", "Argentine", "Armenian", "Australian", "Austrian", "Azerbaijani",
  "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Botswanan", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabé", "Burmese", "Burundian",
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech",
  "Danish", "Djiboutian", "Dominican",
  "Dutch", "East Timorese", "Ecuadorian", "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Eswatini", "Ethiopian",
  "Fijian", "Filipino", "Finnish", "French",
  "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinean", "Guyanese",
  "Haitian", "Honduran", "Hungarian",
  "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Ivorian",
  "Jamaican", "Japanese", "Jordanian",
  "Kazakhstani", "Kenyan", "Kiribati", "Kosovar", "Kuwaiti", "Kyrgyz",
  "Lao", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourgish",
  "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese", "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan", "Monégasque", "Mongolian", "Montenegrin", "Moroccan", "Mozambican",
  "Namibian", "Nauruan", "Nepali", "New Zealander", "Nicaraguan", "Nigerian", "Nigerien", "North Korean", "Norwegian",
  "Omani",
  "Pakistani", "Palauan", "Palestinian", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Puerto Rican",
  "Qatari",
  "Romanian", "Russian", "Rwandan",
  "Saint Lucian", "Salvadoran", "Sammarinese", "Samoan", "São Toméan", "Saudi", "Scottish", "Senegalese", "Serbian", "Seychellois", "Sierra Leonean", "Singaporean", "Slovak", "Slovenian", "Solomon Islander", "Somali", "South African", "South Korean", "South Sudanese", "Spanish", "Sri Lankan", "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss", "Syrian",
  "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan", "Trinidadian", "Tunisian", "Turkish", "Turkmen", "Tuvaluan",
  "Ugandan", "Ukrainian", "Uruguayan", "Uzbek",
  "Vanuatuan", "Vatican", "Venezuelan", "Vietnamese",
  "Welsh",
  "Yemeni",
  "Zambian", "Zimbabwean",
  "Other",
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
  gender_custom: string | null;
  sexual_orientation?: string | null;
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
  intents?: string[];
  bio: string | null;
  photo_url: string | null;
  availability?: string[];
  court_side?: string | null;
  mixed_doubles?: boolean;
  played_count?: number;
  no_show_count?: number;
  free_court_access?: boolean;
  free_court_note?: string | null;
  personal_traits?: string[];
  padel_style?: string[];
  world_mode?: boolean;
  is_coach?: boolean;
  // Added Phase 1 — new player-card fields
  play_frequency?: string | null;
  favorite_clubs?: string[];
  other_sports?: string[];
  main_goal?: string | null;
  looking_for_tags?: string[];
  level_detail?: string | null;
};


export type RankedCandidate = Profile & {
  score: number;
  reasons: string[];
};
