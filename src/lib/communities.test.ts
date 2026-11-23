import { describe, expect, it } from "vitest";
import { buildDirectory, communityOf, newCommunityLocation } from "./communities";

const p = (...locations: string[]) => ({ locations });
const find = (d: ReturnType<typeof buildDirectory>, label: string) =>
  d.countries.flatMap((c) => c.cities.flatMap((ci) => ci.communities)).find((c) => c.label === label);

describe("community directory", () => {
  const members = [
    p("Spain | Madrid | La Moraleja", "Spain | Madrid | El Encinar de los Reyes"),
    p("Spain | Madrid | El Soto de La Moraleja"),
    p("Spain | Madrid | Alcobendas"),
    p("Spain | Madrid | "),
    p("United Arab Emirates | Dubai | "),
    p("United Arab Emirates | Dubai | Arabian Ranches"),
  ];
  const d = buildDirectory(members, ["Spain | Madrid | La Moraleja"]);

  it("counts a Greater La Moraleja member once", () => {
    expect(find(d, "La Moraleja")?.members).toBe(2);
  });
  it("Dubai is one city-wide community counting every Dubai player", () => {
    expect(find(d, "Dubai")?.members).toBe(2);
    expect(find(d, "Arabian Ranches")).toBeUndefined();
  });
  it("hides a whole-Madrid entry because Madrid has neighbourhood communities", () => {
    expect(find(d, "Madrid")).toBeUndefined();
  });
  it("marks my communities", () => {
    expect(d.mine.map((c) => c.label)).toEqual(["La Moraleja"]);
    expect(find(d, "La Moraleja")?.mine).toBe(true);
    expect(find(d, "Alcobendas")?.mine).toBe(false);
  });
  it("always lists the curated communities, even with no members yet", () => {
    expect(find(d, "Coconut Grove & Brickell")?.members).toBe(0);
  });
  it("orders countries by members", () => {
    expect(d.countries[0]?.country).toBe("Spain");
  });
});

describe("starting a community", () => {
  it("saves country, city and neighbourhood", () => {
    expect(newCommunityLocation(" Italy ", "Milan", "Brera")).toBe("Italy | Milan | Brera");
  });
  it("allows a whole city", () => {
    expect(newCommunityLocation("Italy", "Milan", "")).toBe("Italy | Milan | ");
  });
  it("requires a country and a city", () => {
    expect(newCommunityLocation("", "Milan", "Brera")).toBeNull();
    expect(newCommunityLocation("Italy", " ", "")).toBeNull();
  });
  it("folds a neighbourhood into its existing community", () => {
    expect(communityOf("Spain | Madrid | El Soto")?.key).toBe(communityOf("Spain | Madrid | La Moraleja")?.key);
  });
});
