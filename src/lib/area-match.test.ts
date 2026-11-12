import { describe, expect, it } from "vitest";
import { sharesMyArea } from "./area-match";
import { presetByKey } from "./location-presets";

const loc = (city: string, ...areas: string[]) => ({
  locations: areas.length ? areas.map((a) => `Spain | ${city} | ${a}`) : [`Spain | ${city} | `],
});

describe("sharesMyArea", () => {
  it("hides Alcobendas players from a La Moraleja player", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "Alcobendas"))).toBe(false);
  });
  it("hides city-only Madrid players from a La Moraleja player", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid"))).toBe(false);
  });
  it("shows La Moraleja players to a La Moraleja player", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "La Moraleja"))).toBe(true);
  });
  it("shows players from any of my areas", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja", "Las Tablas"), loc("Madrid", "Las Tablas"))).toBe(true);
  });
  it("city-only players see their whole city", () => {
    expect(sharesMyArea(loc("Madrid"), loc("Madrid", "Alcobendas"))).toBe(true);
  });
});

describe("location presets", () => {
  it("La Moraleja pre-fills Spain, Madrid, La Moraleja", () => {
    expect(presetByKey("madrid_la_moraleja")).toMatchObject({ country: "Spain", city: "Madrid", area: "La Moraleja" });
  });
});
