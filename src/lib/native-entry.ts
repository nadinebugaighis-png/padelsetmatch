/** Where a native launch at the public home should go.
 * "entered": a saved account was found and the app opened.
 * "signed_out": the session read finished with no account, so show sign-up.
 * "stalled": the read failed or timed out; never navigate late, keep credentials.
 * This is navigation only: /app remains responsible for validating access.
 */
export type NativeEntryResult = "web" | "entered" | "signed_out" | "stalled";

export async function resumeNativeEntry(
  native: boolean,
  getSession: () => Promise<{ data: { session: unknown | null }; error?: unknown }>,
  enterApp: () => void | Promise<unknown>,
  timeoutMs = 12_000,
  openSignup?: () => void | Promise<unknown>,
): Promise<NativeEntryResult> {
  if (!native) return "web";
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<NativeEntryResult>((resolve) => {
    timer = setTimeout(() => { expired = true; resolve("stalled"); }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async (): Promise<NativeEntryResult> => {
      const { data, error } = await getSession();
      if (expired || error) return "stalled";
      if (data.session) {
        await enterApp();
        return "entered";
      }
      await openSignup?.();
      return "signed_out";
    })()]);
  } catch {
    // Do not erase saved credentials on a failed connection or navigation.
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  return "stalled";
}
