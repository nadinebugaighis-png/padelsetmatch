// Where to send someone after signing in. Only paths inside this app are
// allowed: "//evil.com", "/\evil.com", full addresses and control characters
// are all refused, because browsers treat some of them as other websites.
export function safeInternalPath(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  if (/[\\\u0000-\u001F\u007F]/.test(raw)) return undefined;
  try {
    const probe = "https://app.invalid";
    const url = new URL(raw, probe);
    if (url.origin !== probe) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
