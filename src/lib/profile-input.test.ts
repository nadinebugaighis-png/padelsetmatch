import { describe, expect, it } from "vitest";
import { ProfileInput } from "./app.functions";

// The "Open to mixed doubles" toggle was removed from the profile form. The
// save payload must never carry the column, otherwise every edit would rewrite
// it to false and quietly change the playing-style score of pairs who both had
// it on before it left the app.
const base = {
  first_name: "Sandra",
  age: 40,
  gender: "woman",
  age_min: 30,
  age_max: 50,
  zone: "La Moraleja",
  level: "intermediate",
  looking_for: "friend",
};

describe("ProfileInput", () => {
  it("does not write mixed_doubles when a profile is saved", () => {
    const parsed = ProfileInput.parse(base);
    expect("mixed_doubles" in parsed).toBe(false);
  });

  it("ignores mixed_doubles sent by an older installed build", () => {
    const parsed = ProfileInput.parse({ ...base, mixed_doubles: true });
    expect("mixed_doubles" in parsed).toBe(false);
  });

  it("still writes the level number the player picked", () => {
    const parsed = ProfileInput.parse({ ...base, level_rating: 3.5 });
    expect(parsed.level_rating).toBe(3.5);
  });
});
