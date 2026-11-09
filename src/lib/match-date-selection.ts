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
