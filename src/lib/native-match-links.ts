/** Only our exact production hosts and match destinations may enter the shell. */
export const MATCH_LINK_HOSTS = [
  "padelsetmatch.com",
  "www.padelsetmatch.com",
  "padelsetmatch.lovable.app",
  "padelmatchdoce.com",
  "www.padelmatchdoce.com",
] as const;

export function nativeMatchPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!MATCH_LINK_HOSTS.some((host) => host === url.hostname)) return null;
    if (!/^\/(?:s\/[A-Za-z0-9_-]+|[mg]\/[A-Za-z0-9_-]+|app\/events\/[A-Za-z0-9_-]+)\/?$/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Resolve short links without reloading the WebView or losing launch state. */
export async function resolveNativeMatchPath(
  value: unknown,
  request: typeof fetch = fetch,
): Promise<string | null> {
  const path = nativeMatchPath(value);
  if (!path) return null;
  if (!path.startsWith("/s/")) return path;
  const response = await request(path, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Match link is unavailable");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("url" in data)) return null;
  return nativeMatchPath(data.url);
}