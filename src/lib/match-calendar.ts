import { matchEndsAt } from "@/lib/match-rules";

/** The public match details a calendar entry needs (same fields as the shared match page). */
export type CalendarMatch = {
  id: string;
  starts_at: string;
  duration_minutes?: number | null;
  club_name?: string | null;
  club_address?: string | null;
  city?: string | null;
  is_class?: boolean | null;
};

/** Minutes before the game that the calendar reminds the player. */
export const CALENDAR_REMINDER_MINUTES = 60;

/** Only real, timed, still-on matches can go into a calendar. */
export function canAddToCalendar(e: { time_tbd?: boolean | null; status?: string | null; joins_on_playtomic?: boolean | null }): boolean {
  return !e.time_tbd && !e.joins_on_playtomic && (e.status === "open" || e.status === "full");
}

export function matchCalendarPath(id: string): string {
  return `/api/public/calendar/${encodeURIComponent(id)}`;
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

// Calendar files want lines of at most 75 characters; longer ones continue on
// the next line after a space.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

/** A calendar file (.ics) for one match: Apple, Google, Outlook and Samsung all read it. */
export function matchIcs(m: CalendarMatch, link: string, now: Date = new Date()): string {
  const start = new Date(m.starts_at);
  const end = matchEndsAt(start, m.duration_minutes);
  const club = (m.club_name ?? "").trim();
  const title = `${m.is_class ? "Padel class" : "Padel"}${club ? ` · ${club}` : ""}`;
  const place = [club, m.club_address && m.club_address !== club ? m.club_address : m.city].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PadelSetMatch//Matches//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${m.id}@padelsetmatch.com`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(title)}`,
    ...(place ? [`LOCATION:${esc(place)}`] : []),
    `DESCRIPTION:${esc(`Your PadelSetMatch game. Details and chat: ${link}`)}`,
    `URL:${link}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    `TRIGGER:-PT${CALENDAR_REMINDER_MINUTES}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
