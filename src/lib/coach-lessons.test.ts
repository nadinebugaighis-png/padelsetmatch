import { describe, expect, it } from "vitest";
import { groupDay, openCountByDay, slotStarts, type CoachSlot } from "./coach-lessons";

const now = new Date(2026, 10, 21, 12, 0);
const slot = (id: string, coach: string, h: number, extra: Partial<CoachSlot> = {}): CoachSlot => ({
  id, coach_profile_id: coach, starts_at: new Date(2026, 10, 23, h).toISOString(), duration_minutes: 60,
  club_name: "Club de Pádel La Moraleja", price_note: null, status: "open", student_profile_id: null, student_note: null, ...extra,
});

describe("coach lesson times", () => {
  it("only counts open future times as bookable", () => {
    const counts = openCountByDay([slot("a", "c1", 12), slot("b", "c1", 13, { status: "requested" }), slot("c", "c2", 14, { status: "booked" })], now);
    expect(counts.get("2026-11-23")).toBe(1);
  });
  it("groups one card per coach on a day, earliest first", () => {
    const groups = groupDay([slot("b", "c1", 15), slot("a", "c1", 12), slot("c", "c2", 13)], "2026-11-23", now);
    expect(groups.map((g) => g.coachId)).toEqual(["c1", "c2"]);
    expect(groups[0]!.slots.map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("never offers a lesson time that has already passed", () => {
    expect(slotStarts("2026-11-21", [10, 14], now)).toHaveLength(1);
  });
});
