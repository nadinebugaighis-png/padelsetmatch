// Stores a tiny "try before signup" draft in localStorage so guests can
// answer a few compatibility questions before creating an account, and we
// can hydrate onboarding once they sign up.

export type GuestDraft = {
  priorities?: string[]; // ranked traits
  looking_for?: "partner" | "friend" | "both";
  level?: "beginner" | "intermediate" | "advanced" | "competitive";
  answeredAt?: number;
};

const KEY = "padelmatch:guest-draft:v1";

export function loadGuestDraft(): GuestDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestDraft) : null;
  } catch { return null; }
}

export function saveGuestDraft(d: GuestDraft) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify({ ...d, answeredAt: Date.now() })); } catch { /* ignore */ }
}

export function clearGuestDraft() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
