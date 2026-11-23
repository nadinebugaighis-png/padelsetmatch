import { describe, expect, it } from "vitest";
import { tidyHeadline } from "./clean-headline";

describe("tidyHeadline", () => {
  it("repairs a line that was cut mid-word by stepping back to the last clause", () => {
    const cut = "Similar solid intermediate levels and shared languages make this an easy court pairing, though Susie keeps her profile cards close to her ch";
    expect(tidyHeadline(cut)).toBe("Similar solid intermediate levels and shared languages make this an easy court pairing.");
  });

  it("keeps a complete sentence untouched", () => {
    const ok = "Early courts suit you both, and you both stay for a coffee after.";
    expect(tidyHeadline(ok)).toBe(ok);
  });

  it("never returns a line longer than the limit", () => {
    const long = "You both like early courts. ".repeat(12);
    const out = tidyHeadline(long, 220);
    expect(out.length).toBeLessThanOrEqual(220);
    expect(out.endsWith(".")).toBe(true);
  });

  it("never shows a long dash, swapping it for a comma", () => {
    expect(tidyHeadline("Both love the left side \u2014 a natural pairing.")).toBe("Both love the left side, a natural pairing.");
  });
});
