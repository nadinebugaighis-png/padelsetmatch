import { describe, expect, it, vi } from "vitest";
import { AuthTimeoutError, normalizeEmail, withAuthTimeout } from "./auth-input";

describe("normalizeEmail", () => {
  it("removes the trailing space a phone keyboard adds", () => {
    expect(normalizeEmail("laura@hotmail.com ")).toBe("laura@hotmail.com");
  });
  it("lowercases a capitalised first letter", () => {
    expect(normalizeEmail(" Laura@Hotmail.com")).toBe("laura@hotmail.com");
  });
  it("removes invisible zero-width characters", () => {
    expect(normalizeEmail("a\u200B@b.com")).toBe("a@b.com");
  });
});

describe("withAuthTimeout", () => {
  it("rejects a sign-in call that never answers", async () => {
    vi.useFakeTimers();
    const p = withAuthTimeout(new Promise(() => {}), 20_000);
    const check = expect(p).rejects.toBeInstanceOf(AuthTimeoutError);
    await vi.advanceTimersByTimeAsync(20_000);
    await check;
    vi.useRealTimers();
  });
  it("passes through a call that answers in time", async () => {
    await expect(withAuthTimeout(Promise.resolve(5), 1000)).resolves.toBe(5);
  });
});
