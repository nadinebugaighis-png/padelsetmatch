/** Resume native launches through the existing protected app gate.
 * This is navigation only: /app remains responsible for validating access.
 */
export async function resumeNativeEntry(
  native: boolean,
  getSession: () => Promise<{ data: { session: unknown | null }; error?: unknown }>,
  enterApp: () => void | Promise<unknown>,
  timeoutMs = 12_000,
): Promise<boolean> {
  if (!native) return false;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => { expired = true; resolve(false); }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const { data, error } = await getSession();
      if (!expired && !error && data.session) {
        await enterApp();
        return true;
      }
      return false;
    })()]);
  } catch {
    // Do not erase saved credentials on a failed connection or navigation.
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  return false;
}