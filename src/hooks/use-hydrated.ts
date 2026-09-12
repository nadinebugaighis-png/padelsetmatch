import { useEffect, useState } from "react";

/** Returns true only after the component has mounted on the client.
 *  Useful for gating environment-dependent UI (native vs web) to avoid
 *  hydration mismatches on client-only routes. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
