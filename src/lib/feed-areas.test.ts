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
    expect(areas.map((a) => a.label)).toEqual(["Salamanca & Chamberí", "La Moraleja"]);
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

  it("Salamanca & Chamberí gets games in either barrio", () => {
    const [area] = feedAreas(["Spain | Madrid | Salamanca & Chamberí"]);
    expect(eventInArea({ club_address: "Calle de Serrano, Salamanca" }, area!)).toBe(true);
    expect(eventInArea({ club_address: "Calle de Santa Engracia, Chamberi" }, area!)).toBe(true);
    expect(eventInArea({ city: "La Moraleja" }, area!)).toBe(false);
  });

  it("the London daily game shows to Chelsea & Battersea players", () => {
    const [area] = feedAreas(["United Kingdom | London | Chelsea & Battersea"]);
    expect(area?.label).toBe("Chelsea & Battersea");
    expect(eventInArea({ city: "London", club_name: "Chelsea & Battersea · Club to be decided" }, area!)).toBe(true);
  });

  it("no areas (World) gives no keywords, so every game shows", () => {
    expect(feedKeywords([])).toEqual([]);
    expect(feedKeywords(null)).toEqual([]);
  });

  it("a Dubai or Marbella neighbourhood still covers the whole city", () => {
    const [dubai] = feedAreas(["United Arab Emirates | Dubai | Arabian Ranches"]);
    expect(dubai?.key).toBe("city:dubai");
    expect(eventInArea({ city: "Dubai", club_name: "Dubai · Club to be decided" }, dubai!)).toBe(true);
    const [marbella] = feedAreas(["Spain | Marbella | Nueva Andalucía"]);
    expect(eventInArea({ city: "Marbella", club_name: "Marbella · Club por decidir" }, marbella!)).toBe(true);
  });

  it("each community sees its own daily game and not La Moraleja's", () => {
    const games = {
      salamanca: { city: "Madrid", club_name: "Salamanca & Chamberí · Club por decidir" },
      miami: { city: "Miami", club_name: "Coconut Grove & Brickell · Club to be decided" },
      marbella: { city: "Marbella", club_name: "Marbella · Club por decidir" },
    };
    const moraleja = { city: "La Moraleja", club_name: "La Moraleja · Club por decidir" };
    const cases: Array<[string, keyof typeof games]> = [
      ["Spain | Madrid | Salamanca & Chamberí", "salamanca"],
      ["United States | Miami | Coconut Grove & Brickell", "miami"],
      ["Spain | Marbella | ", "marbella"],
    ];
    for (const [loc, key] of cases) {
      const [area] = feedAreas([loc]);
      expect(eventInArea(games[key], area!)).toBe(true);
      expect(eventInArea(moraleja, area!)).toBe(false);
    }
    const [mor] = feedAreas(["Spain | Madrid | La Moraleja"]);
    expect(eventInArea(games.salamanca, mor!)).toBe(false);
  });
});
