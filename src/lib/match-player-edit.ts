// Fields any player (not just the host) may change on a match listed on Play.
export const PLAYER_EDITABLE_FIELDS = [
  "starts_at",
  "time_tbd",
  "duration_minutes",
  "club_name",
  "club_address",
  "club_place_id",
  "club_lat",
  "club_lng",
  "city",
  "country",
  "level_min",
  "level_max",
  "note",
] as const;

export function pickPlayerEditable(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of PLAYER_EDITABLE_FIELDS) if (k in patch && patch[k] !== undefined) out[k] = patch[k];
  return out;
}

// Non-hosts may edit any match they can see, except a cancelled one.
export function nonHostCanEdit(status: string | null | undefined): boolean {
  return status !== "cancelled";
}
