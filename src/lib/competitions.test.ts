import { describe, expect, it } from "vitest";
import { canRegisterInApp, competitionPhase } from "./competitions";

describe("competitionPhase", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  it("is upcoming before the start", () => {
    expect(competitionPhase("2026-11-22T10:00:00Z", null, now)).toBe("upcoming");
  });
  it("is live between start and end", () => {
    expect(competitionPhase("2026-11-01T10:00:00Z", "2026-11-29T20:00:00Z", now)).toBe("live");
  });
  it("is past after the end", () => {
    expect(competitionPhase("2026-11-01T10:00:00Z", "2026-11-02T20:00:00Z", now)).toBe("past");
  });
});

describe("competition sign-up", () => {
  it("lets players register in the app only for competitions PadelSetMatch hosts", () => {
    expect(canRegisterInApp({ hosted: true })).toBe(true);
    expect(canRegisterInApp({ hosted: false })).toBe(false);
  });
});
