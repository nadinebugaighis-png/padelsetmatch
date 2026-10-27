type BackgroundRequest = Request & {
  waitUntil?: (task: Promise<unknown>) => void;
};

const scheduledRequests = new WeakSet<Request>();

/** Keep delivery alive after the response in Workers; deduplicate explicit drains. */
export function schedulePushDelivery(
  request: BackgroundRequest,
  deliver = async () => {
    const { deliverPendingPushes } = await import("./push-delivery.server");
    return deliverPendingPushes();
  },
) {
  if (scheduledRequests.has(request)) return;
  scheduledRequests.add(request);
  const task = Promise.resolve().then(deliver).catch(() => {
    // Claimed rows remain in the durable outbox and become eligible for retry.
  });
  if (request.waitUntil) request.waitUntil(task);
  else void task; // Vite's local Node server has no Worker execution lifetime.
}