// One wording for padel levels on every card, profile and shared page.
// Numbers and words follow Playtomic's published 0 to 7 scale, so a player's
// number here reads the same as in their Playtomic app. Players pick their own
// number on a scale; it is never computed from results and never moves.
type Tr = (en: string, es: string, fr?: string) => string;

const ORDER = ["just starting", "casual", "intermediate", "advanced", "competitive"];

export const RATING_MIN = 0;
export const RATING_MAX = 7;
export const RATING_STEP = 0.1;

/** Playtomic bands, lowest first: [from, en, es, fr]. */
const BANDS: Array<[number, string, string, string]> = [
  [0, "Initiation", "Iniciación", "Initiation"],
  [1.0, "Beginner", "Principiante", "Débutant"],
  [1.5, "Initiation Intermediate", "Iniciación intermedia", "Initiation intermédiaire"],
  [2.5, "Intermediate", "Intermedio", "Intermédiaire"],
  [3.5, "Intermediate High", "Intermedio alto", "Intermédiaire haut"],
  [4.5, "Intermediate Advanced", "Intermedio avanzado", "Intermédiaire avancé"],
  [5.5, "Competition", "Competición", "Compétition"],
  [6.0, "Professional", "Profesional", "Professionnel"],
];

/** Round to one decimal and keep inside the 0 to 7 scale. */
export function clampRating(n: number): number {
  return Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(n * 10) / 10));
}

/** Playtomic band word for an exact number, e.g. 3.8 -> "Intermediate High". */
export function ratingWord(rating: number, tr: Tr): string {
  const r = clampRating(rating);
  let band = BANDS[0]!;
  for (const b of BANDS) if (r + 1e-9 >= b[0]) band = b;
  return tr(band[1], band[2], band[3]);
}

/** The level band an exact number belongs to (keeps match rules working). */
export function levelFromRating(rating: number): (typeof ORDER)[number] {
  const r = clampRating(rating);
  if (r < 2.5) return "just starting";
  if (r < 3.5) return "casual";
  if (r < 4.5) return "intermediate";
  if (r < 5.5) return "advanced";
  return "competitive";
}

/** Where the scale starts for a player who only has a level band so far. */
export function ratingForLevel(level: string | null | undefined): number {
  switch (level) {
    case "just starting": return 1.5;
    case "casual": return 3.0;
    case "intermediate": return 4.0;
    case "advanced": return 5.0;
    case "competitive": return 5.5;
    default: return 3.0;
  }
}

export const fmtRating = (n: number) => clampRating(n).toFixed(1);

/** Level band word, in Playtomic wording. */
export function levelName(level: string, tr: Tr): string {
  switch (level) {
    case "just starting": return tr("Initiation", "Iniciación", "Initiation");
    case "casual": return tr("Intermediate", "Intermedio", "Intermédiaire");
    case "intermediate": return tr("Intermediate High", "Intermedio alto", "Intermédiaire haut");
    case "advanced": return tr("Intermediate Advanced", "Intermedio avanzado", "Intermédiaire avancé");
    case "competitive": return tr("Competition", "Competición", "Compétition");
    default: return level;
  }
}

/**
 * A range that starts at the two lowest bands and reaches the advanced band or
 * above welcomes everyone, so it reads "All levels". Narrower ranges read
 * "Intermediate to Intermediate High".
 */
export function levelRangeLabel(min: string | null | undefined, max: string | null | undefined, tr: Tr): string {
  if (!min) return "";
  const hiKey = max ?? min;
  const lo = ORDER.indexOf(min);
  const hi = ORDER.indexOf(hiKey);
  if (lo !== -1 && hi !== -1 && lo <= 1 && hi >= 3) return tr("All levels", "Todos los niveles", "Tous niveaux");
  if (min === hiKey) return levelName(min, tr);
  return `${levelName(min, tr)} ${tr("to", "a", "à")} ${levelName(hiKey, tr)}`;
}

/** Playtomic number span for each level band. */
const RATING: Record<string, [number, number | null]> = {
  "just starting": [0, 2.4],
  casual: [2.5, 3.4],
  intermediate: [3.5, 4.4],
  advanced: [4.5, 5.4],
  competitive: [5.5, null],
};

function span(lo: number, hi: number | null): string {
  if (hi == null) return `${lo.toFixed(1)}+`;
  if (lo === 0) return `0–${hi.toFixed(1)}`;
  return `${lo.toFixed(1)}–${hi.toFixed(1)}`;
}

/** "3.5–4.4" for one band, "5.5+" for competition, "" when unknown. */
export function levelRating(level: string | null | undefined): string {
  const r = level ? RATING[level] : undefined;
  return r ? span(r[0], r[1]) : "";
}

/** Number span covering a match's whole level range, e.g. "3.5–5.4". */
export function levelRangeRating(min: string | null | undefined, max: string | null | undefined): string {
  const lo = min ? RATING[min] : undefined;
  const hi = RATING[max ?? min ?? ""];
  if (!lo || !hi) return "";
  return span(lo[0], hi[1]);
}

/** "Intermedio alto · 3.5–4.4": a level word followed by its band numbers. */
export function withRating(word: string, level: string | null | undefined): string {
  const r = levelRating(level);
  if (!word) return r;
  return r ? `${word} · ${r}` : word;
}

/**
 * A player's level as shown on cards and profiles: their exact number when they
 * set one ("Intermedio alto · 3.8"), else their band ("Intermedio alto · 3.5–4.4").
 */
export function playerLevel(level: string | null | undefined, rating: number | null | undefined, tr: Tr): string {
  if (rating != null && Number.isFinite(Number(rating))) {
    const n = Number(rating);
    return `${ratingWord(n, tr)} · ${fmtRating(n)}`;
  }
  if (!level) return "";
  return withRating(levelName(level, tr), level);
}

/**
 * Match-card wording with the number span: "Intermediate to Intermediate High · 2.5–4.4".
 * "All levels" stays plain, since a number there adds nothing.
 */
export function levelRangeWithRating(min: string | null | undefined, max: string | null | undefined, tr: Tr): string {
  const words = levelRangeLabel(min, max, tr);
  if (!words) return "";
  if (words === tr("All levels", "Todos los niveles", "Tous niveaux")) return words;
  const r = levelRangeRating(min, max);
  return r ? `${words} · ${r}` : words;
}
