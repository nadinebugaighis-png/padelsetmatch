import { describe, expect, it } from "vitest";
import { visibleToMe } from "./connect.functions";

type Author = { id: string; first_name: string | null; photo_url: string | null; locations: string[] | null; zone: string | null };
const author = (id: string, locations: string[] | null, zone: string | null = null): Author =>
  ({ id, first_name: id, photo_url: null, locations, zone });
const map = (...authors: Author[]) => new Map(authors.map((a) => [a.id, a]));

const moralejaMe = { locations: ["Spain|Madrid|La Moraleja"], zone: "Madrid" };

describe("Connect feed area gate", () => {
  it("La Moraleja viewer sees Greater La Moraleja authors (El Soto, Arroyo de la Vega)", () => {
    const authors = map(
      author("soto", ["Spain|Madrid|El Soto de La Moraleja"]),
      author("arroyo", ["Spain|Madrid|Arroyo de la Vega"]),
    );
    expect(visibleToMe(moralejaMe, "me", "soto", authors)).toBe(true);
    expect(visibleToMe(moralejaMe, "me", "arroyo", authors)).toBe(true);
  });

  it("La Moraleja viewer does NOT see Alcobendas or Las Tablas authors", () => {
    const authors = map(
      author("alco", ["Spain|Madrid|Alcobendas"]),
      author("tablas", ["Spain|Madrid|Las Tablas"]),
    );
    expect(visibleToMe(moralejaMe, "me", "alco", authors)).toBe(false);
    expect(visibleToMe(moralejaMe, "me", "tablas", authors)).toBe(false);
  });

  it("viewer with only a city falls back to shared city", () => {
    const me = { locations: ["Spain|Madrid"], zone: null };
    const authors = map(author("a", ["Spain|Madrid|Salamanca"]), author("b", ["UK|London|Chelsea"]));
    expect(visibleToMe(me, "me", "a", authors)).toBe(true);
    expect(visibleToMe(me, "me", "b", authors)).toBe(false);
  });

  it("viewer with no location sees everyone; own posts always visible", () => {
    const authors = map(author("x", ["UAE|Dubai|Marina"]));
    expect(visibleToMe(null, "me", "x", authors)).toBe(true);
    expect(visibleToMe({ locations: [], zone: null }, "me", "x", authors)).toBe(true);
    expect(visibleToMe(moralejaMe, "me", "me", new Map())).toBe(true);
  });
});
