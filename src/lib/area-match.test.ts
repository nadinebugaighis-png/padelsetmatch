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
  it("El Soto and El Encinar count as La Moraleja", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "El Soto de La Moraleja"))).toBe(true);
    expect(sharesMyArea(loc("Madrid", "El Encinar de los Reyes"), loc("Madrid", "La Moraleja"))).toBe(true);
  });
  it("Hortaleza as a whole is not La Moraleja", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "Hortaleza"))).toBe(false);
  });
  it("Arroyo de la Vega, La Solana, Diversia and Brains count as La Moraleja", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "Arroyo de la Vega"))).toBe(true);
    expect(sharesMyArea(loc("Madrid", "La Solana"), loc("Madrid", "La Moraleja"))).toBe(true);
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "Diversia"))).toBe(true);
    expect(sharesMyArea(loc("Madrid", "Brains"), loc("Madrid", "El Soto de La Moraleja"))).toBe(true);
  });
  it("Arroyomolinos is not Arroyo de la Vega", () => {
    expect(sharesMyArea(loc("Madrid", "La Moraleja"), loc("Madrid", "Arroyomolinos"))).toBe(false);
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
