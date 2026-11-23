import { isNative, openExternal } from "@/lib/native";
import { matchCalendarPath } from "@/lib/match-calendar";

/** Opens the match's calendar file: the phone hands it to Apple, Google or Samsung Calendar. */
export function openMatchCalendar(eventId: string) {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}${matchCalendarPath(eventId)}`;
  if (isNative()) void openExternal(url);
  else window.location.href = url;
}
