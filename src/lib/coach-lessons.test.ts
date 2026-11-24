import { describe, expect, it } from "vitest";
import { GROUP_CLASS_PLAYERS, bookingKind, coachesWithTimes, groupDay, groupSpotsLeft, openCountByDay, placeFields, requestPlace, slotStarts, type CoachSlot } from "./coach-lessons";

const now = new Date(2026, 10, 21, 12, 0);
const slot = (id: string, coach: string, h: number, extra: Partial<CoachSlot> = {}): CoachSlot => ({
  id, coach_profile_id: coach, starts_at: new Date(2026, 10, 23, h).toISOString(), duration_minutes: 60,
  club_name: "Club de Pádel La Moraleja", price_note: null, status: "open", student_profile_id: null, student_note: null,
  lesson_place: "club", travel_area: null, student_place: null, offers_group: true, group_price_note: null, lesson_kind: null, match_event_id: null, ...extra,
});

describe("coach lesson times", () => {
  it("lists every coach with open times, even one who has none on the first day", () => {
    const later = (id: string, coach: string, day: number, h: number) => slot(id, coach, h, { starts_at: new Date(2026, 10, day, h).toISOString() });
    const list = coachesWithTimes([later("n1", "nadine", 24, 10), later("g1", "gonzalo", 26, 9), later("g2", "gonzalo", 27, 19), later("x", "gone", 25, 9)].map((s) => s.id === "x" ? { ...s, status: "booked" } : s), now);
    expect(list.map((c) => c.coachId)).toEqual(["nadine", "gonzalo"]);
    expect(list[1]!.nextDay).toBe("2026-11-26");
  });
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
  it("keeps a coach's club times and home-visit times on separate cards", () => {
    const groups = groupDay([slot("a", "c1", 12), slot("b", "c1", 13, { lesson_place: "travel", club_name: "El Soto", travel_area: "El Soto" })], "2026-11-23", now);
    expect(groups.map((g) => g.place)).toEqual(["club", "travel"]);
  });
  it("needs the areas covered before a coach can offer to come to players", () => {
    expect(placeFields("travel", "", "  ")).toBeNull();
    expect(placeFields("both", "Club de Pádel La Moraleja", "")).toBeNull();
    expect(placeFields("travel", "", "La Moraleja urbanizaciones")).toEqual({ club_name: "La Moraleja urbanizaciones", travel_area: "La Moraleja urbanizaciones" });
    expect(placeFields("club", "Club de Pádel La Moraleja", "El Soto")).toEqual({ club_name: "Club de Pádel La Moraleja", travel_area: null });
  });
  it("lets the player choose club or home only when the coach offers both", () => {
    expect(requestPlace("club", "travel")).toBe("club");
    expect(requestPlace("travel", null)).toBe("travel");
    expect(requestPlace("both", null)).toBeNull();
    expect(requestPlace("both", "travel")).toBe("travel");
  });
});

describe("private or group lessons", () => {
  it("books a group class only when the coach offers groups at that time", () => {
    expect(bookingKind({ offers_group: true }, "group")).toBe("group");
    expect(bookingKind({ offers_group: false }, "group")).toBe("private");
    expect(bookingKind({ offers_group: true }, "private")).toBe("private");
  });
  it("an open group holds up to 4 players besides the coach", () => {
    expect(GROUP_CLASS_PLAYERS).toBe(4);
    expect(groupSpotsLeft(2)).toBe(3); // coach + first player
    expect(groupSpotsLeft(5)).toBe(0);
    expect(groupSpotsLeft(6)).toBe(0);
  });
});
