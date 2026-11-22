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
  /** club = at the club, travel = the coach comes to the player, both = the player chooses. */
  lesson_place: LessonPlace;
  /** Areas a travelling coach covers (urbanizaciones, neighbourhoods). */
  travel_area: string | null;
  /** Where the requesting player chose to have the lesson. */
  student_place: "club" | "travel" | null;
  /** The coach also takes an open group (up to 4 players) at this time. */
  offers_group: boolean;
  /** Group price per person; price_note is the private price. */
  group_price_note: string | null;
  /** What the player asked for; null on older bookings means private. */
  lesson_kind: LessonKind | null;
  /** The class on the Matches page once the coach accepts a group booking. */
  match_event_id: string | null;
};

export type LessonKind = "private" | "group";

/** Players in an open group class, besides the coach (mirrors book_coach_slot / respond_coach_slot). */
export const GROUP_CLASS_PLAYERS = 4;

/** Private unless the player chose a group and the coach offers groups at that time. */
export function bookingKind(slot: Pick<CoachSlot, "offers_group">, choice: LessonKind): LessonKind {
  return choice === "group" && slot.offers_group ? "group" : "private";
}

/** Player places still free in a group class, given everyone in it (coach included). */
export function groupSpotsLeft(peopleInClass: number): number {
  return Math.max(0, GROUP_CLASS_PLAYERS + 1 - peopleInClass);
}

export type LessonPlace = "club" | "travel" | "both";

export const offersClub = (p: LessonPlace) => p !== "travel";
export const offersTravel = (p: LessonPlace) => p !== "club";

/** Mirrors request_coach_slot: fixed places decide themselves, "both" needs the player's pick. */
export function requestPlace(place: LessonPlace, choice: "club" | "travel" | null): "club" | "travel" | null {
  if (place === "club" || place === "travel") return place;
  return choice;
}

/**
 * Stored place fields for new lesson times, or null when a needed field is blank.
 * Travel-only times repeat the area in club_name so every alert has a place to show.
 */
export function placeFields(place: LessonPlace, club: string, area: string): { club_name: string; travel_area: string | null } | null {
  const c = club.trim();
  const a = area.trim();
  if (offersClub(place) && !c) return null;
  if (offersTravel(place) && !a) return null;
  if (place === "club") return { club_name: c, travel_area: null };
  if (place === "travel") return { club_name: a, travel_area: a };
  return { club_name: c, travel_area: a };
}

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

export type CoachDayGroup = {
  key: string; coachId: string; club: string; place: LessonPlace; area: string | null;
  duration: number; price: string | null; slots: CoachSlot[];
};

/** One card per coach, place and lesson length on a given day, earliest first. */
export function groupDay(slots: CoachSlot[], day: string, now = new Date()): CoachDayGroup[] {
  const groups = new Map<string, CoachDayGroup>();
  const sorted = slots
    .filter((s) => bookable(s, now) && dayKey(new Date(s.starts_at)) === day)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const s of sorted) {
    const place = s.lesson_place ?? "club";
    const key = `${s.coach_profile_id}|${place}|${s.club_name}|${s.travel_area ?? ""}|${s.duration_minutes}`;
    const g = groups.get(key) ?? {
      key, coachId: s.coach_profile_id, club: s.club_name, place, area: s.travel_area ?? null,
      duration: s.duration_minutes, price: s.price_note, slots: [],
    };
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
