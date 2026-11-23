// One wording for a match's level range on every card and shared page.
type Tr = (en: string, es: string, fr?: string) => string;

const ORDER = ["just starting", "casual", "intermediate", "advanced", "competitive"];

export function levelName(level: string, tr: Tr): string {
  switch (level) {
    case "just starting": return tr("Beginner", "Iniciación", "Débutant");
    case "casual": return tr("Casual", "Casual", "Loisir");
    case "intermediate": return tr("Intermediate", "Intermedio", "Intermédiaire");
    case "advanced": return tr("Advanced", "Avanzado", "Avancé");
    case "competitive": return tr("Competitive", "Competición", "Compétition");
    default: return level;
  }
}

/**
 * A range that starts at beginner/casual and reaches advanced or above welcomes
 * everyone, so it reads "All levels" instead of a confusing "Beginner – Advanced".
 * Narrower ranges read "Intermediate to Advanced".
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

/**
 * The familiar 1.0 to 7.0 padel rating scale, the NTRP-derived self-rating used
 * across padel (USPA, LTA Padel, most club scales). It is NOT a Playtomic level:
 * theirs is algorithmic, moves with match results and publishes bands ending at
 * .4 (1.5-2.4, 2.5-3.4, 3.5-4.4, 4.5-5.4). Players here still pick one of the
 * five levels; numbers are never typed, never computed from results, never move.
 */
const RATING: Record<string, [number, number | null]> = {
  "just starting": [1.5, 2.5],
  casual: [2.5, 3.5],
  intermediate: [3.5, 4.5],
  advanced: [4.5, 5.5],
  competitive: [5.5, null],
};

const fmt = (n: number) => n.toFixed(1);

function span(lo: number, hi: number | null): string {
  return hi == null ? `${fmt(lo)}+` : `${fmt(lo)}–${fmt(hi)}`;
}

/** "3.5–4.5" for one level, "5.5+" for competitive, "" when unknown. */
export function levelRating(level: string | null | undefined): string {
  const r = level ? RATING[level] : undefined;
  return r ? span(r[0], r[1]) : "";
}

/** Rating span covering a match's whole level range, e.g. "3.5–5.5". */
export function levelRangeRating(min: string | null | undefined, max: string | null | undefined): string {
  const lo = min ? RATING[min] : undefined;
  const hi = RATING[max ?? min ?? ""];
  if (!lo || !hi) return "";
  return span(lo[0], hi[1]);
}

/** "Intermedio · 3.5–4.5": a level word followed by its rating. */
export function withRating(word: string, level: string | null | undefined): string {
  const r = levelRating(level);
  if (!word) return r;
  return r ? `${word} · ${r}` : word;
}

/**
 * Match-card wording with the rating span: "Intermediate to Advanced · 3.5–5.5".
 * "All levels" stays plain, since a number there adds nothing.
 */
export function levelRangeWithRating(min: string | null | undefined, max: string | null | undefined, tr: Tr): string {
  const words = levelRangeLabel(min, max, tr);
  if (!words) return "";
  if (words === tr("All levels", "Todos los niveles", "Tous niveaux")) return words;
  const r = levelRangeRating(min, max);
  return r ? `${words} · ${r}` : words;
}
