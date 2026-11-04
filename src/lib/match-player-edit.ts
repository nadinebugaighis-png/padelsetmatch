// Fields any joined player (not just the host) may change on a match.
export const PLAYER_EDITABLE_FIELDS = [
  "starts_at",
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
