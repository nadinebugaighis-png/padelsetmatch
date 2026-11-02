// Age-bracket matching helpers.
//
// Signup asks for an age BRACKET (18-24, 25-34, 35-45, 46-55, 56+), never an
// exact age. The stored `age` is only the bracket's midpoint (e.g. 56+ → 78),
// so age preferences must be compared as bracket spans, not raw numbers —
// otherwise every 56+ player is invisible to anyone whose preferred range ends
// below 78.

export const AGE_BRACKETS = [
  [18, 24],
  [25, 34],
  [35, 45],
  [46, 55],
  [56, 99],
] as const;

export type AgeBracket = readonly [number, number];

export function bracketMidpoint(bracket: AgeBracket): number {
  return Math.round((bracket[0] + bracket[1]) / 2);
}

export function bracketForMidpoint(age: number | null | undefined): AgeBracket | null {
  if (age == null) return null;
  return AGE_BRACKETS.find((b) => bracketMidpoint(b) === age) ?? null;
}

export function bracketLabel(bracket: AgeBracket): string {
  return bracket[1] >= 99 ? "56+" : `${bracket[0]}–${bracket[1]}`;
}

export type BracketedAge = {
  age: number | null;
  age_bracket_lo?: number | null;
  age_bracket_hi?: number | null;
};

/** The span a player's age covers: their chosen bracket, or exact age as a fallback. */
export function bracketSpan(p: BracketedAge): AgeBracket | null {
  if (p.age_bracket_lo != null && p.age_bracket_hi != null) return [p.age_bracket_lo, p.age_bracket_hi];
  const fromMidpoint = bracketForMidpoint(p.age);
  if (fromMidpoint) return fromMidpoint;
  if (p.age != null) return [p.age, p.age];
  return null;
}

export type AgePreference = { age_min: number; age_max: number };

/** True when the player's age span overlaps the given preferred range at all. */
export function ageMatchesPreference(preference: AgePreference, player: BracketedAge): boolean {
  const span = bracketSpan(player);
  if (!span) return false;
  return span[1] >= preference.age_min && span[0] <= preference.age_max;
}
