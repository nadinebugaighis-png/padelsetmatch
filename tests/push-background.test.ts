import { describe, expect, it, vi } from "vitest";
import { schedulePushDelivery } from "../src/lib/push-background.server";

describe("background push scheduling", () => {
  it("returns while delivery is pending and registers it with the Worker", async () => {
    let complete: ((value: { sent: number }) => void) | undefined;
    const pending = new Promise<{ sent: number }>((resolve) => { complete = resolve; });
    const deliver = vi.fn(() => pending);
    const tasks: Promise<unknown>[] = [];
    const request = Object.assign(new Request("https://example.com"), {
      waitUntil: (task: Promise<unknown>) => tasks.push(task),
    });
    expect(schedulePushDelivery(request, deliver)).toBeUndefined();
    expect(tasks).toHaveLength(1);
    await Promise.resolve();
    expect(deliver).toHaveBeenCalledTimes(1);
    let finished = false;
    void tasks[0].then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    complete?.({ sent: 1 });
    await tasks[0];
    expect(finished).toBe(true);
  });

  it("delivers only once for an explicit drain plus global middleware", async () => {
    const deliver = vi.fn(async () => ({ sent: 0 }));
    const tasks: Promise<unknown>[] = [];
    const request = Object.assign(new Request("https://example.com"), {
      waitUntil: (task: Promise<unknown>) => tasks.push(task),
    });
    schedulePushDelivery(request, deliver);
    schedulePushDelivery(request, deliver);
    await Promise.all(tasks);
    expect(tasks).toHaveLength(1);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("isolates delivery failures from responses", async () => {
    const tasks: Promise<unknown>[] = [];
    const request = Object.assign(new Request("https://example.com"), {
      waitUntil: (task: Promise<unknown>) => tasks.push(task),
    });
    schedulePushDelivery(request, async () => { throw new Error("Provider unavailable"); });
    await expect(tasks[0]).resolves.toBeUndefined();
  });

  it("also schedules delivery on the local server without waitUntil", async () => {
    const deliver = vi.fn(async () => ({ sent: 0 }));
    schedulePushDelivery(new Request("https://example.com"), deliver);
    await Promise.resolve();
    expect(deliver).toHaveBeenCalledTimes(1);
  });
});