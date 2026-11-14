// Reads what the password-reset email link put in the address bar.
// A link already used (for example the older of two reset emails, or one an
// email app opened in advance) comes back with an error instead of a session.
export type ResetLinkState =
  | { kind: "error"; reason: "expired" | "other" }
  | { kind: "code"; code: string }
  | { kind: "token_hash"; tokenHash: string }
  | { kind: "none" };

export function readResetLink(search: string, hash: string): ResetLinkState {
  const q = new URLSearchParams(search.replace(/^\?/, ""));
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const errorCode = h.get("error_code") || q.get("error_code");
  const error = h.get("error") || q.get("error");
  if (errorCode || error) {
    const expired = errorCode === "otp_expired" || error === "access_denied";
    return { kind: "error", reason: expired ? "expired" : "other" };
  }
  const code = q.get("code");
  if (code) return { kind: "code", code };
  const tokenHash = q.get("token_hash");
  if (tokenHash && (q.get("type") ?? "recovery") === "recovery") return { kind: "token_hash", tokenHash };
  return { kind: "none" };
}
