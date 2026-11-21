import { describe, expect, it } from "vitest";
import { levelRangeLabel } from "./level-label";

const en = (e: string) => e;
const es = (_e: string, s: string) => s;

describe("levelRangeLabel", () => {
  it("shows the daily open games (beginner to advanced) as All levels", () => {
    expect(levelRangeLabel("just starting", "advanced", en)).toBe("All levels");
    expect(levelRangeLabel("just starting", "advanced", es)).toBe("Todos los niveles");
  });
  it("shows casual to competitive as All levels", () => {
    expect(levelRangeLabel("casual", "competitive", en)).toBe("All levels");
  });
  it("keeps a narrower range readable without a dash", () => {
    expect(levelRangeLabel("intermediate", "advanced", en)).toBe("Intermediate to Advanced");
    expect(levelRangeLabel("just starting", "intermediate", es)).toBe("Iniciación a Intermedio");
  });
  it("shows a single level as just that level", () => {
    expect(levelRangeLabel("intermediate", "intermediate", en)).toBe("Intermediate");
  });
});
