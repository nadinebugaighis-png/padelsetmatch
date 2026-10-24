import { describe, expect, it } from "vitest";
import { notificationPath } from "../src/lib/notification-path";

describe("native notification destinations", () => {
  it("opens the relevant match inside the app", () => {
    expect(notificationPath("/app/events/match-123")).toBe("/app/events/match-123");
  });
  it("rejects external destinations", () => {
    expect(notificationPath("https://example.com/app/events/123")).toBeNull();
    expect(notificationPath("//example.com/app/events/123")).toBeNull();
  });
  it("rejects unrelated paths", () => {
    expect(notificationPath("/application")).toBeNull();
  });
});