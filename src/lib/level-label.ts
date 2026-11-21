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
