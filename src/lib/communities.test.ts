import { describe, expect, it } from "vitest";
import { buildDirectory, communityOf, isCityOnly, isVisitingOther, newCommunityLocation } from "./communities";

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

describe("Padelodontics", () => {
  it("is listed under London with its seal, even before anyone joins", () => {
    const d = buildDirectory([], []);
    const london = d.countries.find((c) => c.country === "United Kingdom")?.cities.find((c) => c.city === "London");
    const p = london?.communities.find((c) => c.label === "Padelodontics");
    expect(p?.logo).toMatch(/padelodontics_seal\.png$/);
    expect(p?.members).toBe(0);
  });

  it("counts a member who keeps another London community too", () => {
    const tarik = { locations: ["United Kingdom | London | Chelsea & Battersea", "United Kingdom | London | Padelodontics"] };
    const d = buildDirectory([tarik], tarik.locations);
    const p = d.mine.find((c) => c.label === "Padelodontics");
    expect(p?.members).toBe(1);
    expect(d.mine.map((c) => c.label)).toEqual(["Chelsea & Battersea", "Padelodontics"]);
  });
});

describe("city-only communities", () => {
  it("treats a city whose players chose no neighbourhood as one entry", () => {
    const d = buildDirectory([p("United States | Seattle | "), p("United States | Palm Beach | Delray Beach")], []);
    const us = d.countries.find((c) => c.country === "United States")!;
    const seattle = us.cities.find((c) => c.city === "Seattle")!;
    const palm = us.cities.find((c) => c.city === "Palm Beach")!;
    expect(isCityOnly(seattle)).toBe(true);
    expect(isCityOnly(palm)).toBe(false);
  });

  it("folds Dubai neighbourhoods into one Dubai community", () => {
    const d = buildDirectory([p("United Arab Emirates | Dubai | "), p("United Arab Emirates | Dubai | Arabian Ranches")], []);
    const dubai = d.countries.find((c) => c.country === "United Arab Emirates")!.cities[0]!;
    expect(isCityOnly(dubai)).toBe(true);
    expect(dubai.communities[0]!.members).toBe(2);
  });
});

describe("visiting another community", () => {
  it("counts a visit to Benghazi from Madrid as visiting", () => {
    expect(isVisitingOther("Libya | Benghazi | ", ["Spain | Madrid | La Moraleja"])).toBe(true);
  });
  it("is not visiting when the community is one of mine", () => {
    expect(isVisitingOther("Spain | Madrid | La Moraleja", ["Spain | Madrid | La Moraleja"])).toBe(false);
  });
  it("is not visiting with no community chosen", () => {
    expect(isVisitingOther(null, ["Spain | Madrid | La Moraleja"])).toBe(false);
  });
});

import { publicDirectory } from "./communities";
describe("publicDirectory", () => {
  const c = (country: string, city: string, label: string, members: number, mine = false, logo?: string) =>
    ({ key: `${country}|${city}|${label}`, location: "", country, city, area: label, label, members, mine, ...(logo ? { logo } : {}) });
  const dir = {
    mine: [c("Spain", "Madrid", "La Moraleja", 58, true)],
    total: 0,
    countries: [
      { country: "Spain", members: 0, cities: [{ city: "Madrid", members: 0, communities: [c("Spain", "Madrid", "La Moraleja", 58, true), c("Spain", "Madrid", "Lonely", 1)] }] },
      { country: "Libya", members: 0, cities: [{ city: "Benghazi", members: 0, communities: [c("Libya", "Benghazi", "Benghazi", 1)] }] },
      { country: "United Kingdom", members: 0, cities: [{ city: "London", members: 0, communities: [c("United Kingdom", "London", "Chelsea", 7), c("United Kingdom", "London", "Padelodontics", 0, false, "logo.png")] }] },
    ],
  };
  it("hides one-member communities from others", () => {
    const r = publicDirectory(dir, { world: true });
    const labels = r.countries.flatMap((co) => co.cities.flatMap((ci) => ci.communities.map((x) => x.label)));
    expect(labels).not.toContain("Lonely");
    expect(labels).not.toContain("Benghazi");
  });
  it("keeps a one-member community visible to its founder", () => {
    const own = { ...dir, countries: [{ country: "Libya", members: 0, cities: [{ city: "Benghazi", members: 0, communities: [c("Libya", "Benghazi", "Benghazi", 1, true)] }] }] };
    expect(publicDirectory(own, { world: true }).countries).toHaveLength(1);
  });
  it("keeps branded communities even before members join", () => {
    const labels = publicDirectory(dir, { world: true }).countries.flatMap((co) => co.cities.flatMap((ci) => ci.communities.map((x) => x.label)));
    expect(labels).toContain("Padelodontics");
  });
  it("shows only my country until I ask for the world", () => {
    const r = publicDirectory(dir, { world: false });
    expect(r.countries.map((co) => co.country)).toEqual(["Spain"]);
    expect(r.hiddenElsewhere).toBe(true);
  });
});
