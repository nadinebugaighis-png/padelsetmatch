import { describe, expect, it } from "vitest";
import { createClubSuggestionCache, CLUB_SEARCH_DELAY_MS } from "../src/lib/club-suggestions";

const club = { place_id: "test-club", name: "Club de Pádel La Moraleja", address: "Alcobendas, Madrid" };

describe("fast club suggestions", () => {
  it("starts a new search after an 80ms typing pause", () => {
    expect(CLUB_SEARCH_DELAY_MS).toBe(80);
  });
  it("reuses the same search regardless of case or surrounding whitespace", () => {
    const cache = createClubSuggestionCache<typeof club>();
    cache.remember("La Moraleja", [club]);
    expect(cache.exact(" LA MORALEJA ")).toEqual([club]);
  });
  it("matches cached club names and areas immediately, ignoring accents", () => {
    const cache = createClubSuggestionCache<typeof club>();
    cache.remember("Moraleja", [club]);
    expect(cache.matching("padel madrid")).toEqual([club]);
    expect(cache.matching("Marbella")).toEqual([]);
  });
  it("isolates each player's search cache", () => {
    const first = createClubSuggestionCache<typeof club>();
    first.remember("Moraleja", [club]);
    expect(createClubSuggestionCache<typeof club>().matching("Moraleja")).toEqual([]);
  });
});