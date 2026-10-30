// "All dates" is one choice, rather than 45 visibly selected choices.
export function toggleMatchDay(selected: Set<string>, key: string, allKeys: string[]) {
  if (selected.size === allKeys.length) return new Set([key]);
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  if (next.size === 0) next.add(key);
  return next;
}