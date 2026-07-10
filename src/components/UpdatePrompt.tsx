import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

/**
 * Polls the app shell (`/`) periodically and compares a fingerprint of the
 * returned HTML (hashed asset URLs change on every deploy). When a new build
 * is detected, shows a persistent toast with a Reload action so users on
 * installed PWAs / long-open tabs can jump to the latest version.
 */
async function fetchBuildId(): Promise<string | null> {
  try {
    const res = await fetch("/", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const html = await res.text();
    // Hashed asset URLs (e.g. /_build/assets/index-ABC123.js) change per build.
    const matches = html.match(/["'\(](?:\/[^"'\)\s]*?)-[A-Za-z0-9_]{6,}\.(?:js|css)["'\)]/g);
    if (matches && matches.length) return matches.sort().join("|");
    // Fallback: raw length + first 200 chars.
    return `${html.length}:${html.slice(0, 200)}`;
  } catch {
    return null;
  }
}

export function UpdatePrompt() {
  const { t } = useI18n();
  const baselineRef = useRef<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = location.hostname;
    const isPreview =
      /^(?:id-preview|preview)--/.test(host) ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovableproject-dev.com") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (isPreview) return;

    let cancelled = false;

    const check = async () => {
      if (cancelled || notifiedRef.current || document.hidden) return;
      const id = await fetchBuildId();
      if (!id) return;
      if (baselineRef.current === null) {
        baselineRef.current = id;
        return;
      }
      if (id !== baselineRef.current) {
        notifiedRef.current = true;
        toast.message(t("update.available.title", "New version available"), {
          description: t("update.available.desc", "Reload to get the latest updates."),
          duration: Infinity,
          action: {
            label: t("update.available.reload", "Reload"),
            onClick: () => {
              // Bust caches then hard reload.
              if ("caches" in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).finally(() => location.reload());
              } else {
                location.reload();
              }
            },
          },
        });
      }
    };

    // Establish baseline soon after mount, then poll.
    const boot = setTimeout(check, 3000);
    const interval = setInterval(check, 60_000);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);

    return () => {
      cancelled = true;
      clearTimeout(boot);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [t]);

  return null;
}
