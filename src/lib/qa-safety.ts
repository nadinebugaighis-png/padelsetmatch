export function parseAdultAge(raw: string, year = new Date().getFullYear()): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  const age = n > 1900 ? year - n : n;
  return Number.isInteger(age) && age >= 18 && age <= 99 ? age : null;
}

export function isOrderedAgeRange(min: number, max: number): boolean {
  return min <= max;
}

export function draftAfterSuccessfulSend(current: string, submitted: string): string {
  return current.trim() === submitted ? "" : current;
}

const SHARE_HOSTS = new Set([
  "padelsetmatch.com", "www.padelsetmatch.com", "padelmatchdoce.com", "www.padelmatchdoce.com",
  "padelsetmatch.lovable.app", "id-preview--cc494ba4-9302-4ef0-9a3b-7f1a472b1b7c.lovable.app",
]);
export function isAllowedShortLinkTarget(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && SHARE_HOSTS.has(u.hostname) &&
      /^\/(app\/|m\/|g\/|play(?:\/|$))/.test(u.pathname);
  } catch { return false; }
}

export async function completeAccountDeletion(steps: {
  removePhotos: () => Promise<void>;
  removeProfile: () => Promise<void>;
  removeIdentity: () => Promise<void>;
}): Promise<{ ok: true }> {
  await steps.removePhotos();
  await steps.removeProfile();
  await steps.removeIdentity();
  return { ok: true };
}