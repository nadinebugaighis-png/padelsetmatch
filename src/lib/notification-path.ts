/** Push payloads may navigate only within this app, never to an external site. */
export function notificationPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, "https://padelsetmatch.com");
    if (url.origin !== "https://padelsetmatch.com" || !url.pathname.startsWith("/app")) return null;
    if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) return null;
    return `${url.pathname}${url.search}`;
  } catch { return null; }
}