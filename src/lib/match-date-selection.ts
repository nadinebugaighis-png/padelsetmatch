// The Matches feed opens on today + tomorrow only, so a week of ready-made games
// never turns into one endless list. "All dates" stays an optional choice.
export const DEFAULT_MATCH_DAY_COUNT = 2;

export function defaultMatchDays(allKeys: string[]) {
  return new Set(allKeys.slice(0, DEFAULT_MATCH_DAY_COUNT));
}

// "All dates" is one choice, rather than 45 visibly selected choices.
export function toggleMatchDay(selected: Set<string>, key: string, allKeys: string[]) {
  if (selected.size === allKeys.length) return new Set([key]);
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  if (next.size === 0) next.add(key);
  return next;
}

// Split an already time-sorted list into consecutive calendar-day groups.
export function groupByDay<T>(items: T[], keyOf: (item: T) => string) {
  const groups: Array<{ key: string; items: T[] }> = [];
  for (const item of items) {
    const key = keyOf(item);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

// The chosen days survive leaving and returning to the Matches page within one
// app session. "all" is stored as a marker so new days still count as included.
export const MATCH_DAYS_STORAGE_KEY = "psm.matchDays";

export function serializeMatchDays(selected: Set<string>, allKeys: string[]) {
  return selected.size === allKeys.length ? "all" : JSON.stringify([...selected]);
}

export function restoreMatchDays(saved: string | null, allKeys: string[]): Set<string> | null {
  if (!saved) return null;
  if (saved === "all") return new Set(allKeys);
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return null;
    const valid = new Set(allKeys);
    const kept = parsed.filter((k): k is string => typeof k === "string" && valid.has(k));
    return kept.length ? new Set(kept) : null;
  } catch {
    return null;
  }
}
