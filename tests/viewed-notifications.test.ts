import { describe, expect, it, vi } from "vitest";
import { createViewedNotificationTracker } from "../src/lib/viewed-notifications";

describe("viewed notifications", () => {
  it("automatically marks only the viewed notification, once", async () => {
    const mark = vi.fn(async () => {});
    const onRead = vi.fn();
    const view = createViewedNotificationTracker(mark, onRead);
    expect(mark).not.toHaveBeenCalled();
    await view("viewed-1");
    await view("viewed-1");
    expect(mark).toHaveBeenCalledExactlyOnceWith(["viewed-1"]);
    expect(onRead).toHaveBeenCalledExactlyOnceWith("viewed-1");
  });
  it("does not clear a notification if saving fails and retries when viewed again", async () => {
    const mark = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(undefined);
    const onRead = vi.fn();
    const view = createViewedNotificationTracker(mark, onRead);
    await view("viewed-2");
    expect(onRead).not.toHaveBeenCalled();
    await view("viewed-2");
    expect(mark).toHaveBeenCalledTimes(2);
    expect(onRead).toHaveBeenCalledExactlyOnceWith("viewed-2");
  });
});