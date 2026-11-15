import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-redirect";

describe("safeInternalPath", () => {
  it("keeps app paths with their query", () => {
    expect(safeInternalPath("/app/events/abc?tab=chat")).toBe("/app/events/abc?tab=chat");
  });
  it("refuses a slash followed by a backslash", () => {
    expect(safeInternalPath("/\\evil.com")).toBeUndefined();
  });
  it("refuses protocol-relative addresses", () => {
    expect(safeInternalPath("//evil.com/app")).toBeUndefined();
  });
  it("refuses full addresses", () => {
    expect(safeInternalPath("https://evil.com")).toBeUndefined();
  });
  it("refuses hidden tab or newline tricks", () => {
    expect(safeInternalPath("/\t/evil.com")).toBeUndefined();
  });
});
