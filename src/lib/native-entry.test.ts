import { describe, expect, it, vi } from "vitest";
import { resumeNativeEntry } from "./native-entry";

describe("resumeNativeEntry", () => {
  it("keeps the welcome page on the website", async () => {
    const enter = vi.fn();
    const signup = vi.fn();
    await expect(resumeNativeEntry(false, async () => ({ data: { session: null } }), enter, 1000, signup)).resolves.toBe("web");
    expect(enter).not.toHaveBeenCalled();
    expect(signup).not.toHaveBeenCalled();
  });

  it("sends a signed-out app user straight to sign-up", async () => {
    const enter = vi.fn();
    const signup = vi.fn();
    await expect(resumeNativeEntry(true, async () => ({ data: { session: null } }), enter, 1000, signup)).resolves.toBe("signed_out");
    expect(signup).toHaveBeenCalledOnce();
    expect(enter).not.toHaveBeenCalled();
  });

  it("opens the app for a saved account", async () => {
    const enter = vi.fn();
    const signup = vi.fn();
    await expect(resumeNativeEntry(true, async () => ({ data: { session: { id: "x" } } }), enter, 1000, signup)).resolves.toBe("entered");
    expect(enter).toHaveBeenCalledOnce();
    expect(signup).not.toHaveBeenCalled();
  });

  it("does not open sign-up when the account check fails", async () => {
    const signup = vi.fn();
    await expect(resumeNativeEntry(true, async () => ({ data: { session: null }, error: new Error("offline") }), vi.fn(), 1000, signup)).resolves.toBe("stalled");
    expect(signup).not.toHaveBeenCalled();
  });

  it("does not navigate late after a stalled account check", async () => {
    vi.useFakeTimers();
    const signup = vi.fn();
    let finish: (v: { data: { session: null } }) => void = () => {};
    const p = resumeNativeEntry(true, () => new Promise((r) => { finish = r; }), vi.fn(), 50, signup);
    await vi.advanceTimersByTimeAsync(60);
    await expect(p).resolves.toBe("stalled");
    finish({ data: { session: null } });
    await vi.advanceTimersByTimeAsync(0);
    expect(signup).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
