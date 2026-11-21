/** Play page filters: level, time of day and places left. Areas come from feed-areas.ts. */
export type TimeOfDay = "all" | "morning" | "afternoon" | "evening";
export type MatchFilters = { myLevel: boolean; time: TimeOfDay; spotsLeft: boolean };
export const NO_FILTERS: MatchFilters = { myLevel: false, time: "all", spotsLeft: false };
export const MATCH_FILTERS_STORAGE_KEY = "pm-match-filters-v1";

const LEVEL_INDEX: Record<string, number> = { "just starting": 0, casual: 1, intermediate: 2, advanced: 3, competitive: 4 };

type FilterableMatch = {
  starts_at: string;
  time_tbd?: boolean | null;
  needs: number;
  level_min?: string | null;
  level_max?: string | null;
};

export function activeFilterCount(f: MatchFilters): number {
  return Number(f.myLevel) + Number(f.time !== "all") + Number(f.spotsLeft);
}

export function passesFilters(e: FilterableMatch, f: MatchFilters, myLevel?: string | null): boolean {
  if (f.spotsLeft && e.needs <= 0) return false;
  // A game with no hour yet suits any time of day.
  if (f.time !== "all" && !e.time_tbd) {
    const h = new Date(e.starts_at).getHours();
    if (f.time === "morning" && h >= 12) return false;
    if (f.time === "afternoon" && (h < 12 || h >= 17)) return false;
    if (f.time === "evening" && h < 17) return false;
  }
  if (f.myLevel && myLevel && LEVEL_INDEX[myLevel] !== undefined) {
    const my = LEVEL_INDEX[myLevel]!;
    const lo = LEVEL_INDEX[e.level_min ?? "just starting"] ?? 0;
    const hi = LEVEL_INDEX[e.level_max ?? "competitive"] ?? 4;
    if (my < lo || my > hi) return false;
  }
  return true;
}

export function restoreFilters(raw: string | null): MatchFilters {
  if (!raw) return NO_FILTERS;
  try {
    const v = JSON.parse(raw) as Partial<MatchFilters>;
    const time: TimeOfDay = v.time === "morning" || v.time === "afternoon" || v.time === "evening" ? v.time : "all";
    return { myLevel: v.myLevel === true, time, spotsLeft: v.spotsLeft === true };
  } catch {
    return NO_FILTERS;
  }
}
