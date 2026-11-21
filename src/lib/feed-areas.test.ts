import { describe, expect, it } from "vitest";
import { eventInArea, feedAreas, feedKeywords } from "./feed-areas";

const moraleja = "Spain | Madrid | La Moraleja";
const salamanca = "Spain | Madrid | Salamanca";

describe("Play feed areas", () => {
  it("a La Moraleja player only gets La Moraleja games, not Salamanca", () => {
    const [area] = feedAreas([moraleja]);
    expect(area?.label).toBe("La Moraleja");
    expect(eventInArea({ city: "La Moraleja", club_name: "Open game" }, area!)).toBe(true);
    expect(eventInArea({ city: "Madrid", club_address: "Calle de Serrano, Salamanca, Madrid" }, area!)).toBe(false);
    expect(feedKeywords([moraleja])).not.toContain("Madrid");
  });

  it("a player with Salamanca and La Moraleja gets both areas", () => {
    const areas = feedAreas([salamanca, moraleja]);
    expect(areas.map((a) => a.label)).toEqual(["Salamanca", "La Moraleja"]);
    const sal = areas[0]!;
    expect(eventInArea({ city: "Madrid", club_address: "Calle de Serrano, Salamanca" }, sal)).toBe(true);
  });

  it("El Soto and El Encinar count as La Moraleja", () => {
    const areas = feedAreas(["Spain | Madrid | El Soto de La Moraleja", "Spain | Madrid | El Encinar de los Reyes"]);
    expect(areas).toHaveLength(1);
    expect(eventInArea({ club_address: "Calle Nardo, El Encinar de los Reyes, Madrid" }, areas[0]!)).toBe(true);
  });

  it("Alcobendas is not La Moraleja", () => {
    const [area] = feedAreas([moraleja]);
    expect(eventInArea({ city: "Alcobendas", club_name: "Padel Alcobendas" }, area!)).toBe(false);
  });

  it("a city with no area covers the whole city", () => {
    const [area] = feedAreas(["United Arab Emirates | Dubai | "]);
    expect(eventInArea({ city: "Dubai" }, area!)).toBe(true);
  });

  it("no areas (World) gives no keywords, so every game shows", () => {
    expect(feedKeywords([])).toEqual([]);
    expect(feedKeywords(null)).toEqual([]);
  });
});
