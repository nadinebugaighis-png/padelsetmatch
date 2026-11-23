import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { isNative, openExternal } from "@/lib/native";
import { googleCalendarUrl, matchCalendarUrl, outlookCalendarUrl, type CalendarMatch } from "@/lib/match-calendar";
import { useTr } from "@/lib/i18n";

function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Leaves the app for a calendar. The iPhone app hands links to the in-app browser
 * (which shows Apple's "Add to Calendar" sheet for the file); a framed preview
 * must open a new tab because a calendar file can't open inside a frame.
 */
function go(url: string, sameTab: boolean) {
  if (typeof window === "undefined") return;
  if (isNative()) void openExternal(url);
  else if (sameTab && !inFrame()) window.location.href = url;
  else window.open(url, "_blank", "noopener");
}

type Props = {
  match: CalendarMatch;
  trigger: (open: () => void, label: string) => React.ReactNode;
};

/** "Add to calendar": a small sheet to pick Apple, Google or Outlook. */
export function AddToCalendar({ match, trigger }: Props) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const label = tr("Add to calendar", "Añadir al calendario", "Ajouter au calendrier");

  const options = [
    { key: "apple", label: "Apple Calendar", run: () => go(matchCalendarUrl(match.id), true) },
    { key: "google", label: "Google Calendar", run: () => go(googleCalendarUrl(match), false) },
    { key: "outlook", label: "Outlook", run: () => go(outlookCalendarUrl(match), false) },
  ];

  return (
    <>
      {trigger(() => setOpen(true), label)}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[var(--paper)] border-[var(--ink)]/16" onClick={(ev) => ev.stopPropagation()}>
          <div className="mx-auto w-full max-w-md px-6 pt-4 pb-8">
            <DrawerTitle asChild>
              <div className="text-serif text-[24px] leading-tight text-[var(--ink)] font-normal text-center">{label}</div>
            </DrawerTitle>
            <DrawerDescription className="mt-1.5 text-center text-[13px] leading-relaxed text-[var(--ink)]/80">
              {tr("Choose your calendar.", "Elige tu calendario.", "Choisis ton calendrier.")}
            </DrawerDescription>
            <div className="mt-5 border-y border-[var(--ink)]/16 divide-y divide-[var(--ink)]/16">
              {options.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => { o.run(); setOpen(false); }}
                  className="w-full flex items-center justify-between py-4 text-left text-[16px] text-[var(--ink)] active:bg-[var(--ink)]/5"
                >
                  {o.label}
                  <ChevronRight className="w-4 h-4 text-[var(--ink)]/60" />
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
