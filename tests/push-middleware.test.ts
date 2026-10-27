import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handlers: [] as Array<(options: { next: () => Promise<unknown> }) => Promise<unknown>>,
  request: new Request("https://example.com"),
  schedule: vi.fn(() => new Promise<never>(() => {})),
}));

vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({ server: (handler: (options: { next: () => Promise<unknown> }) => Promise<unknown>) => {
    mocks.handlers.push(handler);
    return handler;
  } }),
  createStart: (configure: () => unknown) => configure(),
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => mocks.request }));
vi.mock("@/integrations/supabase/auth-attacher", () => ({ attachSupabaseAuth: {} }));
vi.mock("../src/lib/push-background.server", () => ({ schedulePushDelivery: mocks.schedule }));

import "../src/start";

describe("notification middleware response", () => {
  it("returns the action result without awaiting background delivery", async () => {
    const handler = mocks.handlers[1];
    if (!handler) throw new Error("Push middleware missing");
    const result = { ok: true };
    await expect(handler({ next: async () => result })).resolves.toBe(result);
    expect(mocks.schedule).toHaveBeenCalledExactlyOnceWith(mocks.request);
  });
});