// Shared, browser-safe rules for who can join a match and how it is described.

export const GENDER_RULES = ["open", "mixed", "men_only", "women_only"] as const;
export type GenderRule = (typeof GENDER_RULES)[number];

/** New matches are open to everyone unless the host deliberately picks a restriction. */
export const DEFAULT_GENDER_RULE: GenderRule = "open";

type Tr = (en: string, es: string, fr?: string) => string;

export function genderRuleLabel(rule: string | null | undefined, tr: Tr): string {
  switch (rule) {
    case "mixed":
      return tr("Mixed", "Mixto", "Mixte");
    case "men_only":
      return tr("Men only", "Solo hombres", "Hommes uniquement");
    case "women_only":
      return tr("Women only", "Solo mujeres", "Femmes uniquement");
    default:
      return tr("Open to all", "Abierto a todos", "Ouvert à tous");
  }
}

/** Only men-only and women-only matches restrict who can join; open and mixed accept anyone. */
export function genderRuleAllows(rule: string | null | undefined, gender: string | null | undefined): boolean {
  if (rule === "men_only") return !gender || gender === "man";
  if (rule === "women_only") return !gender || gender === "woman";
  return true;
}

/** Text that goes with a shared match link (WhatsApp etc.). Mentions "free" only when the host marked the court free. */
export function matchShareText(
  opts: { clubName: string; when: string; freeCourt: boolean },
  tr: Tr,
): string {
  const tail = `${opts.clubName} · ${opts.when}`;
  if (opts.freeCourt) {
    return tr(
      `🎾 Free court! Join my padel match on PadelSetMatch — ${tail}`,
      `🎾 ¡Pista gratis! Únete a mi partido de pádel en PadelSetMatch — ${tail}`,
      `🎾 Terrain gratuit ! Rejoins mon match de padel sur PadelSetMatch — ${tail}`,
    );
  }
  return tr(
    `Join my padel match on PadelSetMatch — ${tail}`,
    `Únete a mi partido de pádel en PadelSetMatch — ${tail}`,
    `Rejoins mon match de padel sur PadelSetMatch — ${tail}`,
  );
}

/** Link preview (WhatsApp card) title and description for a shared match. */
export function matchPreviewMeta(freeCourt: boolean | null | undefined): { title: string; description: string } {
  if (freeCourt) {
    return {
      title: "🎾 Pista gratis · Join my padel match — PadelSetMatch",
      description: "Free court — joining costs nothing. Tap to grab an open spot. / Pista gratis: unirte no cuesta nada.",
    };
  }
  return {
    title: "Join my padel match — PadelSetMatch",
    description: "You're invited to a padel match on PadelSetMatch. Tap to grab an open spot.",
  };
}

// ---------- Classes ----------
/** A class is a coach (the host) plus 1–3 students. */
export const CLASS_STUDENT_OPTIONS = [1, 2, 3] as const;
export const DEFAULT_CLASS_STUDENTS = 3;
export const CLASS_FEE_MAX = 40;

type ClassLike = { is_class?: boolean | null; class_students?: number | null };

/** Seats in a game, host included: 4 for a match, coach + students for a class. Mirrors public.match_event_capacity. */
export function matchCapacity(e: ClassLike | null | undefined): number {
  if (!e?.is_class) return 4;
  const n = e.class_students ?? DEFAULT_CLASS_STUDENTS;
  return 1 + Math.min(3, Math.max(1, n));
}
