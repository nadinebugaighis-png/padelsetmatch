import { useSyncExternalStore } from "react";

/**
 * Which community Home and Play are showing on this device: null means all of
 * my communities together; otherwise one saved location, which may be a
 * community I am only visiting (travel). Browsing never changes the profile.
 */
const KEY = "psm.community.view";
const EVENT = "psm-community-view";

function read(): string | null {
  try { return window.localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setCommunityView(location: string | null) {
  try {
    if (location) window.localStorage.setItem(KEY, location);
    else window.localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function useCommunityView(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
