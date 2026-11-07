import { describe, expect, it } from "vitest";
import { DEFAULT_GENDER_RULE, genderRuleAllows, matchPreviewMeta, matchShareText } from "../src/lib/match-rules";

const es = (_en: string, es: string) => es;

describe("match gender rule", () => {
  it("new matches default to open, not mixed", () => {
    expect(DEFAULT_GENDER_RULE).toBe("open");
  });

  it("open matches accept every player", () => {
    expect(genderRuleAllows("open", "man")).toBe(true);
    expect(genderRuleAllows("open", "woman")).toBe(true);
    expect(genderRuleAllows("open", "non-binary")).toBe(true);
  });

  it("men-only matches block women", () => {
    expect(genderRuleAllows("men_only", "woman")).toBe(false);
    expect(genderRuleAllows("men_only", "man")).toBe(true);
  });

  it("women-only matches block men", () => {
    expect(genderRuleAllows("women_only", "man")).toBe(false);
    expect(genderRuleAllows("women_only", "woman")).toBe(true);
  });
});

describe("free court share text", () => {
  it("says the court is free when the host turned Free court on", () => {
    expect(matchShareText({ clubName: "La Moraleja", when: "sáb 09:30", freeCourt: true }, es)).toBe(
      "🎾 ¡Pista gratis! Únete a mi partido de pádel en PadelSetMatch — La Moraleja · sáb 09:30",
    );
  });

  it("does not mention free when Free court is off", () => {
    const text = matchShareText({ clubName: "Club X", when: "sáb 20:00", freeCourt: false }, es);
    expect(text).toBe("Únete a mi partido de pádel en PadelSetMatch — Club X · sáb 20:00");
    expect(text.toLowerCase()).not.toContain("gratis");
  });

  it("link preview only promises free for free-court matches", () => {
    expect(matchPreviewMeta(true).title).toContain("Pista gratis");
    expect(matchPreviewMeta(false).title.toLowerCase()).not.toContain("gratis");
  });
});
