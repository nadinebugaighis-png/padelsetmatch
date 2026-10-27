/** Deduplicate automatic acknowledgements; failed saves remain retryable. */
export function createViewedNotificationTracker(
  markRead: (ids: string[]) => Promise<unknown>,
  onRead: (id: string) => void,
) {
  const acknowledged = new Set<string>();
  return async (id: string) => {
    if (acknowledged.has(id)) return;
    acknowledged.add(id);
    try {
      await markRead([id]);
      onRead(id);
    } catch {
      acknowledged.delete(id);
    }
  };
}