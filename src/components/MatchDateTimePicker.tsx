import { useState } from "react";
import { format } from "date-fns";
import { enGB, es, fr } from "date-fns/locale";
import { CalendarIcon, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTr } from "@/lib/i18n";

export function MatchDateTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const tr = useTr();
  const [date, setDate] = useState<Date | undefined>(() => value ? new Date(value) : undefined);
  const [hour, setHour] = useState(value.slice(11, 13));
  const [minute, setMinute] = useState(value.slice(14, 16));
  const [open, setOpen] = useState(false);
  const locale = tr("en", "es", "fr") === "es" ? es : tr("en", "es", "fr") === "fr" ? fr : enGB;
  const update = (nextDate: Date | undefined, nextHour: string, nextMinute: string) => {
    onChange(nextDate && nextHour && nextMinute ? `${format(nextDate, "yyyy-MM-dd")}T${nextHour}:${nextMinute}` : "");
  };
  const fieldClass = "h-12 w-full rounded-lg border-club-border bg-club-soft px-3 text-base font-medium text-ink shadow-none hover:bg-club-hover focus:ring-ink";

  return (
    <section className="match-date-time grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0">
        <label htmlFor="match-date" className="mb-2 block text-sm font-medium text-ink">{tr("Date", "Fecha", "Date")}</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button id="match-date" type="button" variant="outline" className={`${fieldClass} justify-start`}>
              <CalendarIcon className="shrink-0" />
              {date ? format(date, "EEE, d MMM yyyy", { locale }) : tr("Choose date", "Elegir fecha", "Choisir une date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" collisionPadding={12} className="match-date-time w-auto max-w-[calc(100vw-24px)] border-club-border bg-club-surface p-0 text-ink">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              locale={locale}
              weekStartsOn={1}
              required
              autoFocus
              onSelect={(next) => { setDate(next); update(next, hour, minute); setOpen(false); }}
              className="pointer-events-auto rounded-lg bg-club-surface p-3 text-ink [--cell-size:2.5rem]"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
          <Clock3 className="size-4" /> {tr("Time", "Hora", "Heure")} <span className="ml-auto text-xs font-normal text-ink/70">24 h</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Select value={hour} onValueChange={(next) => { setHour(next); update(date, next, minute); }}>
            <SelectTrigger aria-label={tr("Hour", "Hora", "Heure")} className={fieldClass}><SelectValue placeholder={tr("Hour", "Hora", "Heure")} /></SelectTrigger>
            <SelectContent className="match-date-time max-h-64 border-club-border bg-club-surface text-ink">
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <SelectItem key={h} value={h} className="min-h-11 text-base">{h}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-lg font-medium text-ink" aria-hidden="true">:</span>
          <Select value={minute} onValueChange={(next) => { setMinute(next); update(date, hour, next); }}>
            <SelectTrigger aria-label={tr("Minutes", "Minutos", "Minutes")} className={fieldClass}><SelectValue placeholder={tr("Min", "Min", "Min")} /></SelectTrigger>
            <SelectContent className="match-date-time max-h-64 border-club-border bg-club-surface text-ink">
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => <SelectItem key={m} value={m} className="min-h-11 text-base">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}