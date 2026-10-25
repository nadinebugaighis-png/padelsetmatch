import { describe, expect, it, vi } from "vitest";
import { resumeNativeEntry } from "../src/lib/native-entry";

describe("native app reopening", () => {
  it("enters the protected app when a saved session is restored", async () => {
    const enter = vi.fn();
    expect(await resumeNativeEntry(true, async () => ({ data: { session: { user: { id: "returning-player" } } } }), enter)).toBe(true);
    expect(enter).toHaveBeenCalledTimes(1);
  });
  it("leaves signed-out native users on the welcome page", async () => {
    const enter = vi.fn();
    expect(await resumeNativeEntry(true, async () => ({ data: { session: null } }), enter)).toBe(false);
    expect(enter).not.toHaveBeenCalled();
  });
  it("preserves the public website without checking its session", async () => {
    const getSession = vi.fn();
    const enter = vi.fn();
    await resumeNativeEntry(false, getSession, enter);
    expect(getSession).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
  });
  it("does not navigate on a failed session read", async () => {
    const enter = vi.fn();
    await resumeNativeEntry(true, async () => { throw new Error("offline"); }, enter);
    expect(enter).not.toHaveBeenCalled();
  });
  it("keeps restoration pending until protected navigation completes", async () => {
    let finishNavigation: () => void = () => {};
    const navigation = new Promise<void>((resolve) => { finishNavigation = resolve; });
    let settled = false;
    const result = resumeNativeEntry(true, async () => ({ data: { session: {} } }), () => navigation)
      .then((entered) => { settled = true; return entered; });
    await Promise.resolve();
    expect(settled).toBe(false);
    finishNavigation();
    expect(await result).toBe(true);
  });
});