import { describe, expect, it } from "vitest";
import {
  AGE_BRACKETS,
  ageMatchesPreference,
  bracketForMidpoint,
  bracketLabel,
  bracketMidpoint,
  bracketSpan,
} from "../src/lib/age-bracket";

describe("age bracket matching", () => {
  it("covers every signup bracket with a unique midpoint and label", () => {
    const mids = AGE_BRACKETS.map(bracketMidpoint);
    expect(new Set(mids).size).toBe(AGE_BRACKETS.length);
    expect(bracketLabel([56, 99])).toBe("56+");
    expect(bracketLabel([46, 55])).toBe("46–55");
    expect(bracketForMidpoint(78)).toEqual([56, 99]);
    expect(bracketForMidpoint(21)).toEqual([18, 24]);
  });

  it("shows a 56+ player to someone whose preferred range stops at 70", () => {
    // Ivan case: 56+ saves age 78, which used to fail a 20–70 filter.
    const ivan = { age: 78, age_bracket_lo: 56, age_bracket_hi: 99 };
    expect(ageMatchesPreference({ age_min: 20, age_max: 70 }, ivan)).toBe(true);
    // ...but stays hidden when the preferred range stops before 56.
    expect(ageMatchesPreference({ age_min: 20, age_max: 55 }, ivan)).toBe(false);
  });

  it("treats each bracket the same whether bounds are stored or derived from the midpoint", () => {
    for (const b of AGE_BRACKETS) {
      const withBounds = { age: bracketMidpoint(b), age_bracket_lo: b[0], age_bracket_hi: b[1] };
      const derived = { age: bracketMidpoint(b) };
      expect(bracketSpan(withBounds)).toEqual(b);
      expect(bracketSpan(derived)).toEqual(b);
      expect(ageMatchesPreference({ age_min: 25, age_max: 50 }, withBounds))
        .toBe(ageMatchesPreference({ age_min: 25, age_max: 50 }, derived));
    }
  });

  it("keeps exact-age fallback for legacy rows outside any midpoint", () => {
    const legacy = { age: 34, age_bracket_lo: null, age_bracket_hi: null };
    expect(bracketSpan(legacy)).toEqual([34, 34]);
    expect(ageMatchesPreference({ age_min: 30, age_max: 40 }, legacy)).toBe(true);
    expect(ageMatchesPreference({ age_min: 35, age_max: 45 }, legacy)).toBe(false);
    expect(ageMatchesPreference({ age_min: 20, age_max: 60 }, { age: null })).toBe(false);
  });
});
