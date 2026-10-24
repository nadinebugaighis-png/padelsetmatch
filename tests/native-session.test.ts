import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Exercise the actual document-start script used by the iOS bridge, not a copy.
const swift = readFileSync("ios/App/App/SceneDelegate.swift", "utf8");
const script = swift.split('let script = """')[1]?.split('"""')[0];
function start(saved: string | null, existing: string | null = null) {
  if (!script) throw new Error("Native session script missing");
  const writes: unknown[] = [];
  class Storage {
    values = new Map<string, string>();
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
    removeItem(key: string) { this.values.delete(key); }
    clear() { this.values.clear(); }
  }
  const localStorage = new Storage();
  if (existing) localStorage.setItem("test-auth", existing);
  const window: Record<string, unknown> = { webkit: { messageHandlers: { nativeAuthStorage: { postMessage: (value: unknown) => writes.push(value) } } } };
  window.top = window;
  runInNewContext(script.replace('\\(args)', JSON.stringify(["test-auth", saved])), { window, location: { origin: "https://padelsetmatch.com" }, Storage, localStorage });
  return { localStorage, writes };
}
describe("iPhone saved sign-in", () => {
  it("restores the saved account before the website loads", () => {
    expect(start("test-session").localStorage.getItem("test-auth")).toBe("test-session");
  });
  it("clears the native copy on explicit sign-out", () => {
    const { localStorage, writes } = start("test-session");
    localStorage.removeItem("test-auth");
    expect(writes).toEqual([{ key: "test-auth", value: null }]);
  });
  it("migrates an existing login and persists refreshes", () => {
    const { localStorage, writes } = start(null, "existing-session");
    localStorage.setItem("test-auth", "refreshed-session");
    expect(writes).toEqual([{ key: "test-auth", value: "existing-session" }, { key: "test-auth", value: "refreshed-session" }]);
  });
});