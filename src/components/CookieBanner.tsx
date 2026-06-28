import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const KEY = "pm-cookie-ack-v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const accept = () => {
    window.localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 max-w-xl mx-auto rounded-2xl border border-[var(--cream)]/15 bg-[var(--court-deep)]/95 backdrop-blur p-4 shadow-2xl">
      <p className="text-xs text-[var(--cream)]/85">
        We use essential cookies to keep you signed in and remember your language. No tracking, no ads.{" "}
        <Link to="/privacy" className="underline">Privacy</Link> · <Link to="/terms" className="underline">Terms</Link>
      </p>
      <div className="mt-2 flex justify-end">
        <button onClick={accept} className="chip chip-ball">Got it</button>
      </div>
    </div>
  );
}
