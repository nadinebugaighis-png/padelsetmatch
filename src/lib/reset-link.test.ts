import { describe, expect, it } from "vitest";
import { readResetLink } from "./reset-link";

describe("readResetLink", () => {
  it("treats an already-used link as expired", () => {
    expect(readResetLink("", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"))
      .toEqual({ kind: "error", reason: "expired" });
  });
  it("reads a code from the query string", () => {
    expect(readResetLink("?code=abc123", "")).toEqual({ kind: "code", code: "abc123" });
  });
  it("reads a recovery token hash", () => {
    expect(readResetLink("?token_hash=xyz&type=recovery", "")).toEqual({ kind: "token_hash", tokenHash: "xyz" });
  });
  it("returns none for a bare visit", () => {
    expect(readResetLink("", "")).toEqual({ kind: "none" });
  });
});
