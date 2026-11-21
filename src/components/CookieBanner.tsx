import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTr } from "@/lib/i18n";

const KEY = "pm-cookie-ack-v1";

// Bottom-anchored bars (the tab bar, the questionnaire's save bar, the quick-actions
// button) live below this notice. Lifting the notice above them keeps every control
// tappable instead of swallowing taps behind "Got it".
const BOTTOM_UI = "[data-bottom-ui]";

function measureLift(): number {
  const vh = window.innerHeight;
  let top = vh;
  for (const el of document.querySelectorAll(BOTTOM_UI)) {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) continue;
    // Ignore elements parked off-screen or docked far above the bottom edge.
    if (r.bottom < vh - 260) continue;
    top = Math.min(top, r.top);
  }
  return Math.max(0, vh - top + 12);
}

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [lift, setLift] = useState(0);
  const tr = useTr();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) setShow(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const measure = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLift(measureLift()));
    };
    measure();
    // Bars mount after data arrives, so re-measure whenever the tree changes.
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", measure);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [show]);

  if (!show) return null;

  const accept = () => {
    window.localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div
      className="fixed left-3 right-3 z-[60] max-w-xl mx-auto rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)]/95 backdrop-blur p-4 shadow-2xl"
      style={{ bottom: lift ? `${lift}px` : "12px" }}
    >
      <p className="text-xs text-[var(--ink)]/85">
        {tr(
          "We use essential cookies to keep you signed in and remember your language. No tracking, no ads.",
          "Usamos cookies esenciales para mantener tu sesión y recordar tu idioma. Sin rastreo ni anuncios.",
        )}{" "}
        <Link to="/privacy" className="underline text-[var(--plum)]">{tr("Privacy", "Privacidad", "Confidentialité")}</Link> · <Link to="/terms" className="underline text-[var(--plum)]">{tr("Terms", "Términos", "Conditions")}</Link>
      </p>
      <div className="mt-2 flex justify-end">
        <button onClick={accept} className="chip-ink bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]">{tr("Got it", "Entendido", "Compris")}</button>
      </div>
    </div>
  );
}
