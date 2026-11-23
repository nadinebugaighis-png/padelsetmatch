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

/** Live site address: phone calendars and the iPhone app must fetch from here, never a preview. */
export const CALENDAR_ORIGIN = "https://padelsetmatch.com";

export function matchCalendarUrl(id: string): string {
  return `${CALENDAR_ORIGIN}${matchCalendarPath(id)}`;
}

function matchTitle(m: CalendarMatch): string {
  const club = (m.club_name ?? "").trim();
  return `${m.is_class ? "Padel class" : "Padel"}${club ? ` · ${club}` : ""}`;
}

function matchPlace(m: CalendarMatch): string {
  const club = (m.club_name ?? "").trim();
  return [club, m.club_address && m.club_address !== club ? m.club_address : m.city].filter(Boolean).join(", ");
}

/** Opens Google Calendar with the match already filled in (works in the Google app and on the web). */
export function googleCalendarUrl(m: CalendarMatch): string {
  const start = new Date(m.starts_at);
  const end = matchEndsAt(start, m.duration_minutes);
  const link = `${CALENDAR_ORIGIN}/m/${m.id}`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: matchTitle(m),
    dates: `${icsDate(start)}/${icsDate(end)}`,
    details: `Your PadelSetMatch game. Details and chat: ${link}`,
    location: matchPlace(m),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Opens Outlook on the web with the match already filled in. */
export function outlookCalendarUrl(m: CalendarMatch): string {
  const start = new Date(m.starts_at);
  const end = matchEndsAt(start, m.duration_minutes);
  const link = `${CALENDAR_ORIGIN}/m/${m.id}`;
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: matchTitle(m),
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `Your PadelSetMatch game. Details and chat: ${link}`,
    location: matchPlace(m),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
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
  const title = matchTitle(m);
  const place = matchPlace(m);
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
