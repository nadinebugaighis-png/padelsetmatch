/**
 * "Who can play?" on Connect: players say which day and part of the day they
 * are free, others tap "Me too". Check-ins are shown only to players who share
 * one of the same areas (see feed-areas.ts), so a London player never sees
 * La Moraleja availability. Connect shows one area at a time (the player's
 * home area by default) and each area, day and part of the day has its own chat.
 */
import { feedAreas } from "./feed-areas";
import { LOCATION_PRESETS } from "./location-presets";

export const PLAY_SLOTS = ["morning", "afternoon", "evening"] as const;
export type PlaySlot = (typeof PLAY_SLOTS)[number];

/** How many days ahead a player can say they are free, today included. */
export const PLAY_DAYS_AHEAD = 7;

export type PlayCheckin = {
  id: string;
  profile_id: string;
  play_date: string;
  slot: PlaySlot;
  first_name: string | null;
  photo_url: string | null;
  level: string | null;
  level_rating: number | null;
  mine: boolean;
};

export type PlayGroup = {
  key: string;
  date: string;
  slot: PlaySlot;
  players: PlayCheckin[];
  imIn: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** The viewer's own calendar date as YYYY-MM-DD (never UTC). */
export function localISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today plus the following days the picker offers, in the viewer's calendar. */
export function upcomingDays(now: Date, count = PLAY_DAYS_AHEAD): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push(localISODate(d));
  }
  return out;
}

/** Slots that are still worth offering today: morning ends at 12:00, afternoon at 17:00. */
export function slotStillOpen(slot: PlaySlot, date: string, now: Date): boolean {
  if (date !== localISODate(now)) return true;
  const h = now.getHours();
  if (slot === "morning") return h < 12;
  if (slot === "afternoon") return h < 17;
  return h < 22;
}

/** One card per day and slot, soonest first; within a card, the viewer first, then by who said it first. */
export function groupCheckins(rows: PlayCheckin[], now: Date): PlayGroup[] {
  const today = localISODate(now);
  const map = new Map<string, PlayGroup>();
  for (const r of rows) {
    if (r.play_date < today) continue;
    if (!slotStillOpen(r.slot, r.play_date, now)) continue;
    const key = `${r.play_date}|${r.slot}`;
    const g = map.get(key) ?? { key, date: r.play_date, slot: r.slot, players: [], imIn: false };
    if (g.players.some((p) => p.profile_id === r.profile_id)) continue;
    g.players.push(r);
    if (r.mine) g.imIn = true;
    map.set(key, g);
  }
  const order = (s: PlaySlot) => PLAY_SLOTS.indexOf(s);
  return Array.from(map.values())
    .map((g) => ({ ...g, players: [...g.players.filter((p) => p.mine), ...g.players.filter((p) => !p.mine)] }))
    .sort((a, b) => (a.date === b.date ? order(a.slot) - order(b.slot) : a.date < b.date ? -1 : 1));
}

/** Areas a player can switch Connect to: their own first (home = first), then the main communities. */
export type ConnectArea = { key: string; label: string };

const PRESET_LOCATIONS = LOCATION_PRESETS.map((p) => `${p.country}|${p.city}|${p.area ?? ""}`);

export function connectAreaOptions(rawLocations: unknown): { mine: ConnectArea[]; elsewhere: ConnectArea[] } {
  const mine = feedAreas(rawLocations).map(({ key, label }) => ({ key, label }));
  const own = new Set(mine.map((a) => a.key));
  const elsewhere = feedAreas(PRESET_LOCATIONS)
    .filter((a) => !own.has(a.key))
    .map(({ key, label }) => ({ key, label }));
  return { mine, elsewhere };
}

/** Readable name for an area key that is not in the option lists, e.g. from an old alert link. */
export function areaLabelFromKey(key: string): string {
  const raw = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
  return raw.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** The hour "Start a match" suggests for each part of the day; the host can change it. */
export const SLOT_START: Record<PlaySlot, string> = { morning: "10:00", afternoon: "15:00", evening: "19:00" };

export function matchStartFor(date: string, slot: PlaySlot): string {
  return `${date}T${SLOT_START[slot]}`;
}

/** One chat per area, day and part of the day. */
export function slotThreadKey(area: string, date: string, slot: PlaySlot): string {
  return `${area}|${date}|${slot}`;
}
