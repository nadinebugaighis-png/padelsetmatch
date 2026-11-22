import { describe, expect, it } from "vitest";
import { sharesMyArea, isMoralejaMember } from "./area-match";
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

describe("isMoralejaMember", () => {
  it("is true for La Moraleja and its surrounding communities", () => {
    expect(isMoralejaMember(loc("Madrid", "La Moraleja"))).toBe(true);
    expect(isMoralejaMember(loc("Madrid", "El Soto"))).toBe(true);
    expect(isMoralejaMember(loc("Madrid", "La Moraleja", "Salamanca"))).toBe(true);
  });
  it("is false for other areas, city-only players and other cities", () => {
    expect(isMoralejaMember(loc("Madrid", "Salamanca"))).toBe(false);
    expect(isMoralejaMember(loc("Madrid", "Hortaleza"))).toBe(false);
    expect(isMoralejaMember(loc("Madrid"))).toBe(false);
    expect(isMoralejaMember(loc("London", "Ealing"))).toBe(false);
  });
});

describe("paired communities", () => {
  it("Salamanca and Chamberí players see each other", () => {
    expect(sharesMyArea(loc("Madrid", "Salamanca & Chamberí"), loc("Madrid", "Chamberí"))).toBe(true);
    expect(sharesMyArea(loc("Madrid", "Salamanca"), loc("Madrid", "Salamanca & Chamberí"))).toBe(true);
  });
  it("Salamanca & Chamberí is not La Moraleja", () => {
    expect(sharesMyArea(loc("Madrid", "Salamanca & Chamberí"), loc("Madrid", "La Moraleja"))).toBe(false);
  });
  it("Chelsea and Battersea are one London community", () => {
    const london = (...a: string[]) => ({ locations: a.map((x) => `United Kingdom | London | ${x}`) });
    expect(sharesMyArea(london("Chelsea & Battersea"), london("Battersea"))).toBe(true);
    expect(sharesMyArea(london("Chelsea"), london("Chelsea & Battersea"))).toBe(true);
  });
  it("Coconut Grove and Brickell are one Miami community", () => {
    const miami = (...a: string[]) => ({ locations: a.map((x) => `United States | Miami | ${x}`) });
    expect(sharesMyArea(miami("Coconut Grove & Brickell"), miami("Brickell"))).toBe(true);
    expect(sharesMyArea(miami("Coconut Grove"), miami("Brickell"))).toBe(true);
  });
});

describe("location presets", () => {
  it("the communities are La Moraleja, Salamanca & Chamberí, Chelsea & Battersea, Coconut Grove & Brickell and Dubai", () => {
    expect(presetByKey("madrid_salamanca_chamberi")).toMatchObject({ city: "Madrid", area: "Salamanca & Chamberí" });
    expect(presetByKey("london_chelsea_battersea")).toMatchObject({ city: "London", area: "Chelsea & Battersea" });
    expect(presetByKey("miami_coconut_grove_brickell")).toMatchObject({ city: "Miami", area: "Coconut Grove & Brickell" });
    expect(presetByKey("dubai")).toMatchObject({ city: "Dubai" });
    expect(presetByKey("dubai")?.area).toBeUndefined();
    expect(presetByKey("marbella")).toMatchObject({ country: "Spain", city: "Marbella" });
    expect(presetByKey("marbella")?.area).toBeUndefined();
  });
  it("La Moraleja pre-fills Spain, Madrid, La Moraleja", () => {
    expect(presetByKey("madrid_la_moraleja")).toMatchObject({ country: "Spain", city: "Madrid", area: "La Moraleja" });
  });
});
