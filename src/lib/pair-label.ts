// Short label for how a pair fits, from the on-court and off-court scores.
// Neither score is ever called low; the label only names what stands out.
export type PairLabel = "full_set" | "kindred" | "court";

export const FULL_SET_MIN = 80;
export const STANDOUT_GAP = 10;
export const STANDOUT_MIN = 70;

export function pairLabel(onCourt: number | null | undefined, offCourt: number | null | undefined): PairLabel | null {
  if (onCourt == null || offCourt == null) return null;
  if (onCourt >= FULL_SET_MIN && offCourt >= FULL_SET_MIN) return "full_set";
  if (offCourt - onCourt >= STANDOUT_GAP && offCourt >= STANDOUT_MIN) return "kindred";
  if (onCourt - offCourt >= STANDOUT_GAP && onCourt >= STANDOUT_MIN) return "court";
  return null;
}

/** The other player must have answered this many questions before an off-court score is shown. */
export const OFF_COURT_MIN_ANSWERS = 3;

/** Off-court score only when it rests on real answers, otherwise null (shown as "—"). */
export function offCourtScore(score: number | null | undefined, theirAnswers: number | null | undefined): number | null {
  if (score == null || (theirAnswers ?? 0) < OFF_COURT_MIN_ANSWERS) return null;
  return score;
}
