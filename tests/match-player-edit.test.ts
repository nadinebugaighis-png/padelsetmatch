import { describe, expect, it } from "vitest";
import { nonHostCanEdit, pickPlayerEditable } from "../src/lib/match-player-edit";

describe("joined-player match edits", () => {
  it("keeps club, date/time, level and note", () => {
    const out = pickPlayerEditable({ club_name: "X", starts_at: "2026-11-05T09:30:00Z", level_min: "casual", note: "hi" });
    expect(out).toEqual({ club_name: "X", starts_at: "2026-11-05T09:30:00Z", level_min: "casual", note: "hi" });
  });
  it("lets players switch a game between 60 and 90 minutes", () => {
    expect(pickPlayerEditable({ duration_minutes: 60 })).toEqual({ duration_minutes: 60 });
  });
  it("drops host-only fields like status, gender and booked court", () => {
    const out = pickPlayerEditable({ status: "cancelled", gender_rule: "men_only", court_booked: true, host_profile_id: "x" });
    expect(out).toEqual({});
  });
});

describe("who can edit a match", () => {
  it("lets any player edit an open or full match they did not create", () => {
    expect(nonHostCanEdit("open")).toBe(true);
    expect(nonHostCanEdit("full")).toBe(true);
  });
  it("blocks edits once the match is cancelled", () => {
    expect(nonHostCanEdit("cancelled")).toBe(false);
  });
});
