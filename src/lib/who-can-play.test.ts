import { describe, expect, it } from "vitest";
import { groupCheckins, slotStillOpen, upcomingDays, type PlayCheckin } from "./who-can-play";

const row = (p: Partial<PlayCheckin>): PlayCheckin => ({
  id: Math.random().toString(36), profile_id: "a", play_date: "2026-11-22", slot: "evening",
  first_name: "A", photo_url: null, level: null, mine: false, ...p,
});

describe("who can play", () => {
  it("offers seven days starting today in the viewer's calendar", () => {
    const days = upcomingDays(new Date(2026, 10, 28, 23, 30));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-11-28");
    expect(days[3]).toBe("2026-12-01");
  });

  it("drops today's morning after midday and afternoon after 17:00", () => {
    const now = new Date(2026, 10, 22, 17, 5);
    expect(slotStillOpen("morning", "2026-11-22", now)).toBe(false);
    expect(slotStillOpen("afternoon", "2026-11-22", now)).toBe(false);
    expect(slotStillOpen("evening", "2026-11-22", now)).toBe(true);
    expect(slotStillOpen("morning", "2026-11-23", now)).toBe(true);
  });

  it("groups players by day and slot, soonest first, viewer first", () => {
    const now = new Date(2026, 10, 22, 9, 0);
    const groups = groupCheckins([
      row({ profile_id: "b", play_date: "2026-11-23", slot: "morning" }),
      row({ profile_id: "a", play_date: "2026-11-22", slot: "evening" }),
      row({ profile_id: "me", play_date: "2026-11-22", slot: "evening", mine: true }),
      row({ profile_id: "c", play_date: "2026-11-22", slot: "morning" }),
      row({ profile_id: "old", play_date: "2026-11-21", slot: "evening" }),
    ], now);
    expect(groups.map((g) => g.key)).toEqual(["2026-11-22|morning", "2026-11-22|evening", "2026-11-23|morning"]);
    expect(groups[1]!.players.map((p) => p.profile_id)).toEqual(["me", "a"]);
    expect(groups[1]!.imIn).toBe(true);
    expect(groups[0]!.imIn).toBe(false);
  });
});
