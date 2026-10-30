export const CLUB_SEARCH_DELAY_MS = 80;

export function normalizeClubQuery(query: string) {
  return query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

type Suggestion = { place_id: string; name: string; address: string };

// Instance-scoped: never share a player's search history through SSR globals.
export function createClubSuggestionCache<T extends Suggestion>() {
  const queries = new Map<string, T[]>();
  const clubs = new Map<string, T>();
  return {
    remember(query: string, results: T[]) {
      const key = normalizeClubQuery(query);
      queries.delete(key);
      queries.set(key, results);
      if (queries.size > 30) {
        const oldest = queries.keys().next().value;
        if (oldest !== undefined) queries.delete(oldest);
      }
      results.forEach((club) => {
        const id = club.place_id || `${club.name}|${club.address}`;
        clubs.delete(id);
        clubs.set(id, club);
      });
      while (clubs.size > 60) {
        const oldest = clubs.keys().next().value;
        if (oldest !== undefined) clubs.delete(oldest);
      }
    },
    exact(query: string) { return queries.get(normalizeClubQuery(query)); },
    matching(query: string) {
      const words = normalizeClubQuery(query).split(/\s+/).filter(Boolean);
      return [...clubs.values()].filter((club) => {
        const text = normalizeClubQuery(`${club.name} ${club.address}`);
        return words.every((word) => text.includes(word));
      }).slice(0, 6);
    },
  };
}