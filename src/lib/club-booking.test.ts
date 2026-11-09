import { describe, expect, it } from "vitest";
import { clubBookingLink } from "./club-booking";

const MORALEJA = "https://playtomic.com/tenant/e0448759-a18b-4b53-a3d5-b8cb7333c7d7";

describe("clubBookingLink", () => {
  it("sends Club de Pádel La Moraleja to its Playtomic page", () => {
    expect(clubBookingLink({ club_name: "Club de Pádel La Moraleja", club_place_id: "abc" })).toEqual({ url: MORALEJA, source: "club" });
    expect(clubBookingLink({ club_name: "La Moraleja Club de Pádel", club_place_id: "abc" })?.url).toBe(MORALEJA);
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
