/** Resume native launches through the existing protected app gate.
 * This is navigation only: /app remains responsible for validating access.
 */
export async function resumeNativeEntry(
  native: boolean,
  getSession: () => Promise<{ data: { session: unknown | null }; error?: unknown }>,
  enterApp: () => void | Promise<unknown>,
): Promise<void> {
  if (!native) return;
  try {
    const { data, error } = await getSession();
    if (!error && data.session) await enterApp();
  } catch {
    // Do not erase saved credentials on a failed connection or navigation.
  }
}