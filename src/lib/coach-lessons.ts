/** Pure helpers for coach lesson times (Book a coach). */
export type CoachSlot = {
  id: string;
  coach_profile_id: string;
  starts_at: string;
  duration_minutes: number;
  club_name: string;
  price_note: string | null;
  status: "open" | "requested" | "booked";
  student_profile_id: string | null;
  student_note: string | null;
};

export const COACH_HOURS = Array.from({ length: 16 }, (_, i) => 7 + i); // 07:00 to 22:00

/** Local calendar key, YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nextDays(n: number, from = new Date()): Date[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: n }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function bookable(s: CoachSlot, now: Date) {
  return s.status === "open" && new Date(s.starts_at).getTime() > now.getTime();
}

/** Open, future lesson times per local day. */
export function openCountByDay(slots: CoachSlot[], now = new Date()): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of slots) {
    if (!bookable(s, now)) continue;
    const k = dayKey(new Date(s.starts_at));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export type CoachDayGroup = { key: string; coachId: string; club: string; duration: number; price: string | null; slots: CoachSlot[] };

/** One card per coach, club and lesson length on a given day, earliest first. */
export function groupDay(slots: CoachSlot[], day: string, now = new Date()): CoachDayGroup[] {
  const groups = new Map<string, CoachDayGroup>();
  const sorted = slots
    .filter((s) => bookable(s, now) && dayKey(new Date(s.starts_at)) === day)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const s of sorted) {
    const key = `${s.coach_profile_id}|${s.club_name}|${s.duration_minutes}`;
    const g = groups.get(key) ?? { key, coachId: s.coach_profile_id, club: s.club_name, duration: s.duration_minutes, price: s.price_note, slots: [] };
    g.slots.push(s);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** First day in the strip with an open time, else the first day. */
export function firstOpenDay(days: Date[], counts: Map<string, number>): string {
  const hit = days.find((d) => (counts.get(dayKey(d)) ?? 0) > 0);
  return dayKey(hit ?? days[0]!);
}

/** ISO start times for the chosen local date and hours, skipping any already past. */
export function slotStarts(day: string, hours: number[], now = new Date()): string[] {
  const [y, m, d] = day.split("-").map(Number);
  return [...hours]
    .sort((a, b) => a - b)
    .map((h) => new Date(y!, (m ?? 1) - 1, d ?? 1, h, 0, 0, 0))
    .filter((dt) => dt.getTime() > now.getTime())
    .map((dt) => dt.toISOString());
}
