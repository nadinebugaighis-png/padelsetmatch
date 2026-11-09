import { describe, expect, it } from "vitest";
import { clubBookingLink } from "./club-booking";

const MORALEJA = "https://playtomic.com/tenant/e0448759-a18b-4b53-a3d5-b8cb7333c7d7";

describe("clubBookingLink", () => {
  it("sends Club de Pádel La Moraleja to its Playtomic page", () => {
    expect(clubBookingLink({ club_name: "Club de Pádel La Moraleja", club_place_id: "abc" })).toEqual({ url: MORALEJA, source: "club" });
    expect(clubBookingLink({ club_name: "La Moraleja Club de Pádel", club_place_id: "abc" })?.url).toBe(MORALEJA);
  });

  it("sends Club Irlandesas to its Playtomic app link", () => {
    expect(clubBookingLink({ club_name: "Club Irlandesas", club_place_id: "abc" })?.url)
      .toBe("https://playtomic.com/tenant/c4204b18-1228-466a-89f8-a94f181f37c3");
  });

  it("sends Cálido Alcobendas to its Playtomic app link", () => {
    expect(clubBookingLink({ club_name: "Cálido Alcobendas", club_place_id: "abc" })?.url)
      .toBe("https://playtomic.com/tenant/4fb9cb56-8fe7-46f9-9b57-c83cf1da18f8");
  });

  it("sends Riber Pádel Moraleja to its own link, not La Moraleja's", () => {
    expect(clubBookingLink({ club_name: "Riber Pádel Moraleja Club", club_place_id: "abc" })?.url)
      .toBe("https://playtomic.com/tenant/a788ca6f-847a-4745-8d31-cab2e332c17b");
  });

  it("sends Liceo Europeo to its Playtomic app link", () => {
    expect(clubBookingLink({ club_name: "Liceo Europeo - Pádel y Fútbol", club_place_id: "abc" })?.url)
      .toBe("https://playtomic.com/tenant/da765f8e-43b3-11e8-8674-52540049669c");
  });

  it("prefers the host's own Playtomic link", () => {
    expect(
      clubBookingLink({ club_name: "Club de Pádel La Moraleja", playtomic_link: "playtomic.com/clubs/my-club" }),
    ).toEqual({ url: "https://playtomic.com/clubs/my-club", source: "host" });
  });

  it("never offers booking for undecided clubs", () => {
    expect(clubBookingLink({ club_name: "La Moraleja · Club por decidir", club_place_id: "x" })).toBeNull();
    expect(clubBookingLink({ club_name: "TBD", club_place_id: "x" })).toBeNull();
  });

  it("never offers booking for private or free courts", () => {
    expect(clubBookingLink({ club_name: "Club de Pádel La Moraleja", is_private_court: true })).toBeNull();
    expect(clubBookingLink({ club_name: "Club de Pádel La Moraleja", free_court: true })).toBeNull();
  });

  it("typed home addresses get no booking link", () => {
    expect(clubBookingLink({ club_name: "Paseo de Los Parques 6", club_place_id: null })).toBeNull();
  });

  it("other picked clubs fall back to a Playtomic search", () => {
    const r = clubBookingLink({ club_name: "Ola Club", city: "Doral", club_place_id: "p1" });
    expect(r?.source).toBe("search");
    expect(r?.url).toBe("https://www.google.com/search?q=Playtomic%20Ola%20Club%20Doral");
  });
});
