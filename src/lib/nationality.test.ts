import { describe, expect, it } from "vitest";
import { bestCultureAffinity, formatNationalities, nationalityList } from "./affinity";

describe("second nationality", () => {
  it("shows two nationalities separated by a plain space", () => {
    expect(formatNationalities({ nationality: "Libyan", nationality_2: "British" })).toBe("Libyan British");
  });

  it("shows one nationality when there is no second", () => {
    expect(formatNationalities({ nationality: "Libyan", nationality_2: "" })).toBe("Libyan");
    expect(formatNationalities({ nationality: "Libyan" })).toBe("Libyan");
  });

  it("never repeats the same nationality twice", () => {
    expect(nationalityList({ nationality: "Spanish", nationality_2: "Spanish" })).toEqual(["Spanish"]);
  });

  it("matches on the second nationality too", () => {
    const r = bestCultureAffinity(["Libyan", "British"], ["British"]);
    expect(r.level).toBe(0);
    expect(r.a).toBe("British");
  });

  it("gives no culture match when either player has no nationality", () => {
    expect(bestCultureAffinity([], ["British"]).level).toBe(2);
  });
});
