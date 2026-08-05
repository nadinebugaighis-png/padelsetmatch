/**
 * Lightweight crash reporting + analytics for web and the iOS/Android
 * Capacitor build. Events are batched client-side and flushed to
 * `app_events` through the public `ingestAppEvents` server function.
 */
import { ingestAppEvents } from "./telemetry.functions";

export const APP_VERSION = "1.0.0";

type Kind = "crash" | "error" | "event" | "screen";

type Queued = {
  kind: Kind;
  name: string;
  message?: string | null;
  stack?: string | null;
  route?: string | null;
  sessionId?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  userAgent?: string | null;
  props?: Record<string, unknown>;
  at?: string;
};

const QUEUE_KEY = "psm_telemetry_queue_v1";
const SESSION_KEY = "psm_telemetry_session_v1";
const MAX_QUEUE = 25;
const FLUSH_MS = 8000;

let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;
let sessionId = "";
let platform = "web";
let lastSignature = "";
let lastSignatureAt = 0;

function uid() {
  try {
    return crypto.randomUUID().slice(0, 32);
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getSessionId() {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
  } catch { /* private mode */ }
  sessionId = uid();
  try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch { /* ignore */ }
  return sessionId;
}

function persist() {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); } catch { /* ignore */ }
}

function restore() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // Crashes that killed the app before a flush get sent on the next launch.
    if (Array.isArray(parsed)) queue = parsed.slice(-MAX_QUEUE);
    localStorage.removeItem(QUEUE_KEY);
  } catch { /* ignore */ }
}

function scheduleFlush(delay = FLUSH_MS) {
  if (timer) return;
  timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
}

export async function flush() {
  if (typeof window === "undefined" || queue.length === 0) return;
  const batch = queue.slice(0, MAX_QUEUE);
  queue = queue.slice(batch.length);
  persist();
  try {
    await ingestAppEvents({ data: { events: batch } });
  } catch {
    // Offline or server down — keep them for the next attempt.
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    persist();
  }
}

function enqueue(e: Queued) {
  if (typeof window === "undefined") return;
  queue.push({
    ...e,
    at: new Date().toISOString(),
    route: e.route ?? window.location.pathname,
    sessionId: getSessionId(),
    platform,
    appVersion: APP_VERSION,
    userAgent: navigator.userAgent.slice(0, 300),
  });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persist();
  if (e.kind === "crash" || e.kind === "error") void flush();
  else scheduleFlush();
}

/** Track a product analytics event, e.g. trackEvent("match_created", { zone }). */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  enqueue({ kind: "event", name, props });
}

/** Track a screen/page view. */
export function trackScreen(route: string) {
  enqueue({ kind: "screen", name: route, route });
}

/** Report a caught or uncaught error. */
export function reportError(
  error: unknown,
  opts?: { fatal?: boolean; name?: string; props?: Record<string, unknown> },
) {
  const err = error instanceof Error ? error : new Error(String(error));
  const signature = `${err.name}:${err.message}`;
  const now = Date.now();
  // Suppress identical errors firing in a loop.
  if (signature === lastSignature && now - lastSignatureAt < 5000) return;
  lastSignature = signature;
  lastSignatureAt = now;

  enqueue({
    kind: opts?.fatal ? "crash" : "error",
    name: opts?.name ?? err.name ?? "Error",
    message: err.message,
    stack: err.stack ?? null,
    props: opts?.props,
  });
}

/** Call once on app start (client only). */
export function initTelemetry() {
  if (started || typeof window === "undefined") return;
  // Guard across duplicate module instances (HMR / double-mount)
  const w = window as unknown as { __psmTelemetry?: boolean };
  if (w.__psmTelemetry) return;
  w.__psmTelemetry = true;
  started = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.getPlatform) platform = cap.getPlatform();
    else platform = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios-web" : "web";
  } catch { /* ignore */ }

  getSessionId();
  restore();

  window.addEventListener("error", (event) => {
    reportError((event as ErrorEvent).error ?? new Error((event as ErrorEvent).message), {
      fatal: true,
      props: { source: "window.onerror", file: (event as ErrorEvent).filename, line: (event as ErrorEvent).lineno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError((event as PromiseRejectionEvent).reason, {
      fatal: true,
      name: "UnhandledRejection",
      props: { source: "unhandledrejection" },
    });
  });

  // iOS suspends WebViews without firing unload — pagehide/visibilitychange are the reliable hooks.
  const drain = () => { void flush(); };
  window.addEventListener("pagehide", drain);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") drain();
  });

  trackEvent("app_open", { referrer: document.referrer || null });
  scheduleFlush(2000);
}
