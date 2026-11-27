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
