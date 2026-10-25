/** A neutral screen while a saved account is restored; never shows sign-in controls. */
export function SessionLoading() {
  return (
    <div role="status" aria-label="Loading PadelSetMatch" className="min-h-screen flex items-center justify-center bg-paper text-ink">
      <span aria-hidden className="h-7 w-7 rounded-full border-2 border-ink/20 border-t-ink motion-safe:animate-spin" />
    </div>
  );
}