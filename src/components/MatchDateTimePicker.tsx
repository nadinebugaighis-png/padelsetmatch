import { useState } from "react";
import { format } from "date-fns";
import { enGB, es, fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTr } from "@/lib/i18n";

const fieldClass = "h-11 rounded-lg border border-[var(--ink)]/15 bg-white px-3 text-sm font-medium text-[var(--ink)] shadow-none hover:border-[var(--ink)]/35 focus:ring-[var(--ink)]";
const sheetClass = "match-date-time border border-[var(--ink)]/15 bg-white text-[var(--ink)]";

export function MatchDateTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const tr = useTr();
  const [date, setDate] = useState<Date | undefined>(() => value ? new Date(value) : undefined);
  const [hour, setHour] = useState(value.slice(11, 13));
  const [minute, setMinute] = useState(value.slice(14, 16));
  const [open, setOpen] = useState(false);
  const lang = tr("en", "es", "fr");
  const locale = lang === "es" ? es : lang === "fr" ? fr : enGB;
  const update = (nextDate: Date | undefined, nextHour: string, nextMinute: string) => {
    onChange(nextDate && nextHour && nextMinute ? `${format(nextDate, "yyyy-MM-dd")}T${nextHour}:${nextMinute}` : "");
  };

  return (
    <section className="match-date-time">
      <label htmlFor="match-date" className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-[var(--ink)]/60">
        {tr("Date & time", "Fecha y hora", "Date et heure")}
      </label>
      <div className="flex items-stretch gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button id="match-date" type="button" variant="outline" className={`${fieldClass} min-w-0 flex-[1.7] justify-start gap-2`}>
              <CalendarIcon className="size-4 shrink-0 text-[var(--ink)]/60" />
              <span className="truncate">
                {date ? format(date, "EEE d MMM", { locale }) : tr("Choose date", "Elegir fecha", "Choisir une date")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" collisionPadding={12} className={`${sheetClass} w-auto max-w-[calc(100vw-24px)] p-0`}>
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              locale={locale}
              weekStartsOn={1}
              required
              autoFocus
              onSelect={(next) => { setDate(next); update(next, hour, minute); setOpen(false); }}
              className="pointer-events-auto rounded-lg bg-white p-3 text-[var(--ink)] [--cell-size:2.5rem]"
            />
          </PopoverContent>
        </Popover>
        <Select value={hour} onValueChange={(next) => { setHour(next); update(date, next, minute); }}>
          <SelectTrigger aria-label={tr("Hour", "Hora", "Heure")} className={`${fieldClass} w-[4rem] shrink-0`}>
            <SelectValue placeholder={tr("Hour", "Hora", "Heure")} />
          </SelectTrigger>
          <SelectContent className={`${sheetClass} max-h-64`}>
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <SelectItem key={h} value={h} className="min-h-10 text-sm">{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="self-center text-sm font-medium text-[var(--ink)]/50" aria-hidden="true">:</span>
        <Select value={minute} onValueChange={(next) => { setMinute(next); update(date, hour, next); }}>
          <SelectTrigger aria-label={tr("Minutes", "Minutos", "Minutes")} className={`${fieldClass} w-[3.5rem] shrink-0`}>
            <SelectValue placeholder={tr("Min", "Min", "Min")} />
          </SelectTrigger>
          <SelectContent className={`${sheetClass} max-h-64`}>
            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => <SelectItem key={m} value={m} className="min-h-10 text-sm">{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
