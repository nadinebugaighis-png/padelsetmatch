import * as SliderPrimitive from "@radix-ui/react-slider";
import { RATING_MAX, RATING_MIN, RATING_STEP, clampRating, fmtRating, ratingWord } from "@/lib/level-label";

type Tr = (en: string, es: string, fr?: string) => string;

/**
 * One-thumb padel level scale (Playtomic 0 to 7). The player slides to their
 * exact number; the band word updates live beside it. `value` null means not
 * chosen yet: the thumb rests at `fallback`, faded, until the first touch.
 */
export function LevelScale({
  value,
  fallback = 3,
  onChange,
  tr,
  label,
  tone = "light",
  plainLabel = false,
}: {
  value: number | null;
  fallback?: number;
  onChange: (n: number) => void;
  tr: Tr;
  label: string;
  tone?: "light" | "dark";
  plainLabel?: boolean;
}) {
  const shown = value ?? fallback;
  const dark = tone === "dark";
  const ink = dark ? "var(--cream)" : "var(--ink)";
  const pick = (v: number[]) => onChange(clampRating(v[0] ?? shown));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={plainLabel ? "text-[12px]" : "text-[10px] uppercase tracking-[0.25em]"} style={{ color: `color-mix(in oklab, ${ink} 78%, transparent)` }}>{label}</span>
        {value == null ? (
          <span className="text-[13px] italic" style={{ color: `color-mix(in oklab, ${ink} 70%, transparent)` }}>
            {tr("Slide to your level", "Desliza hasta tu nivel", "Glisse jusqu'à ton niveau")}
          </span>
        ) : (
          <span className="text-[14px]" style={{ color: ink }}>
            {ratingWord(value, tr)} <span className="font-serif text-[18px] tabular-nums ml-1">{fmtRating(value)}</span>
          </span>
        )}
      </div>
      <SliderPrimitive.Root
        className="relative mt-3 flex h-8 w-full touch-none select-none items-center"
        min={RATING_MIN}
        max={RATING_MAX}
        step={RATING_STEP}
        value={[shown]}
        onValueChange={pick}
        onValueCommit={pick}
        aria-label={label}
      >
        <SliderPrimitive.Track className="relative h-px w-full grow" style={{ background: `color-mix(in oklab, ${ink} 20%, transparent)` }}>
          <SliderPrimitive.Range className="absolute h-full" style={{ background: value == null ? "transparent" : ink }} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          aria-valuetext={value == null ? undefined : `${ratingWord(value, tr)} ${fmtRating(value)}`}
          className={`block h-6 w-6 rounded-full border bg-[var(--card)] shadow transition-opacity focus-visible:outline-none focus-visible:ring-2 ${value == null ? "opacity-60" : ""}`}
          style={{ borderColor: `color-mix(in oklab, ${ink} 30%, transparent)` }}
        />
      </SliderPrimitive.Root>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums" style={{ color: `color-mix(in oklab, ${ink} 60%, transparent)` }}>
        <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
      </div>
    </div>
  );
}
