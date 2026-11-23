import { describe, expect, it } from "vitest";
import { canAddToCalendar, matchIcs } from "../src/lib/match-calendar";

const base = { id: "11111111-2222-3333-4444-555555555555", starts_at: "2026-11-24T18:00:00.000Z", club_name: "La Moraleja Padel Club", city: "Madrid" };

describe("add to calendar", () => {
  it("a 90 minute match ends 90 minutes after it starts", () => {
    const ics = matchIcs({ ...base, duration_minutes: 90 }, "https://padelsetmatch.com/m/x");
    expect(ics).toContain("DTSTART:20261124T180000Z");
    expect(ics).toContain("DTEND:20261124T193000Z");
  });

  it("a 60 minute match ends one hour after it starts", () => {
    const ics = matchIcs({ ...base, duration_minutes: 60 }, "https://padelsetmatch.com/m/x");
    expect(ics).toContain("DTEND:20261124T190000Z");
  });

  it("reminds the player one hour before", () => {
    expect(matchIcs(base, "https://padelsetmatch.com/m/x")).toContain("TRIGGER:-PT60M");
  });

  it("matches without a set time cannot be added", () => {
    expect(canAddToCalendar({ time_tbd: true, status: "open" })).toBe(false);
    expect(canAddToCalendar({ time_tbd: false, status: "open" })).toBe(true);
  });

  it("cancelled matches cannot be added", () => {
    expect(canAddToCalendar({ status: "cancelled" })).toBe(false);
  });
});

describe("calendar links", () => {
  it("the calendar file always comes from the live site", async () => {
    const { matchCalendarUrl } = await import("../src/lib/match-calendar");
    expect(matchCalendarUrl(base.id)).toBe(`https://padelsetmatch.com/api/public/calendar/${base.id}`);
  });

  it("Google Calendar opens with the match's real start and end", async () => {
    const { googleCalendarUrl } = await import("../src/lib/match-calendar");
    const url = new URL(googleCalendarUrl({ ...base, duration_minutes: 90 }));
    expect(url.searchParams.get("dates")).toBe("20261124T180000Z/20261124T193000Z");
    expect(url.searchParams.get("location")).toBe("La Moraleja Padel Club, Madrid");
  });
});
