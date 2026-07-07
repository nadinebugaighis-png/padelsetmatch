import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTr } from "@/lib/i18n";

const KEY = "pm-cookie-ack-v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const tr = useTr();

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
    <div className="fixed bottom-3 left-3 right-3 z-50 max-w-xl mx-auto border border-[var(--court)]/10 bg-white/95 backdrop-blur p-4 shadow-2xl">
      <p className="text-xs text-[var(--court)]/85">
        {tr(
          "We use essential cookies to keep you signed in and remember your language. No tracking, no ads.",
          "Usamos cookies esenciales para mantener tu sesión y recordar tu idioma. Sin rastreo ni anuncios.",
          "Nous utilisons des cookies essentiels pour maintenir votre connexion et mémoriser votre langue. Pas de traçage, pas de publicités.",
        )}{" "}
        <Link to="/privacy" className="underline text-[var(--clay)]">{tr("Privacy", "Privacidad", "Confidentialité")}</Link> · <Link to="/terms" className="underline text-[var(--clay)]">{tr("Terms", "Términos", "Conditions")}</Link>
      </p>
      <div className="mt-2 flex justify-end">
        <button onClick={accept} className="chip chip-clay">{tr("Got it", "Entendido", "Compris")}</button>
      </div>
    </div>
  );
}
