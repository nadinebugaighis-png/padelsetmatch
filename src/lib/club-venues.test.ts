import { describe, it, expect } from "vitest";
import { clubVenueFor } from "./club-venues";

describe("club community venues", () => {
  it("starts Club de Pádel La Moraleja matches at the club", () => {
    expect(clubVenueFor("Spain | Madrid | Club de Pádel La Moraleja")?.name).toBe("Club de Pádel La Moraleja");
  });
  it("leaves the La Moraleja neighbourhood free to choose", () => {
    expect(clubVenueFor("Spain | Madrid | La Moraleja")).toBeNull();
    expect(clubVenueFor(null)).toBeNull();
  });
});

describe("clubVenueFor plain label", () => {
  it("accepts the bare club name", () => {
    expect(clubVenueFor("Club de Pádel La Moraleja")?.place_id).toBe("ChIJnfS5U1wsQg0R8WQD4_nRg1Q");
  });
});
