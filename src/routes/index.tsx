import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { useTr } from "@/lib/i18n";
import { AuthScreen } from "@/components/AuthScreen";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resumeNativeEntry } from "@/lib/native-entry";
import { Button } from "@/components/ui/button";

import shareBanner from "@/assets/padel-share-luxury.jpg.asset.json";

const SHARE_IMAGE = `https://padelsetmatch.com${shareBanner.url}`;
const SHARE_DESC = "Connect with Padel players nearby you, join games, discover courts, and build your community.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PadelSetMatch · Find Padel Players Near You" },
      { name: "description", content: SHARE_DESC },
      { property: "og:title", content: "PadelSetMatch · Find Padel Players Near You" },
      { property: "og:description", content: SHARE_DESC },
      { property: "og:url", content: "https://padelsetmatch.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: SHARE_IMAGE },
      { property: "og:image:secure_url", content: SHARE_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PadelSetMatch · Find Padel Players Near You" },
      { name: "twitter:description", content: SHARE_DESC },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://padelsetmatch.com/" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [entryPending, setEntryPending] = useState(true);
  const [entryFailed, setEntryFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const watchdog = window.setTimeout(() => {
      if (!cancelled && document.documentElement.classList.contains("native-app")) {
        setEntryFailed(true);
        setEntryPending(false);
      }
    }, 12_000);
    void import("@/lib/native").then(async ({ isNative }) => {
      const native = isNative();
      if (native) document.documentElement.classList.add("native-app");
      else {
        // Home-screen shortcuts and the website: a saved account opens the app.
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session && !cancelled) { await navigate({ to: "/app", replace: true }); return; }
        } catch { /* keep credentials, show the page */ }
      }
      const result = await resumeNativeEntry(
        native,
        () => supabase.auth.getSession(),
        () => {
          if (!cancelled) return navigate({ to: "/app", replace: true });
        },
        12_000,
        // The welcome page is for the website only: in the app, signed-out
        // visitors go straight to sign-up.
        () => {
          if (!cancelled) return navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
        },
      );
      if (result === "stalled" && !cancelled) {
        window.clearTimeout(watchdog);
        setEntryFailed(true);
        setEntryPending(false);
        return;
      }
      if (!cancelled) {
        window.clearTimeout(watchdog);
        setEntryPending(false);
      }
    }).catch(() => {
      if (!cancelled) {
        window.clearTimeout(watchdog);
        setEntryFailed(document.documentElement.classList.contains("native-app"));
        setEntryPending(false);
      }
    });
    return () => { cancelled = true; window.clearTimeout(watchdog); };
  }, [navigate]);
  const tr = useTr();

  if (entryFailed) return (
    <main data-native-entry="ready" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-paper text-ink px-6 text-center">
      <BrandMark />
      <p>{tr("Taking longer to open. Please try again.", "Está tardando en abrirse. Vuelve a intentarlo.", "L’ouverture prend plus de temps. Réessaie.")}</p>
      <Button onClick={() => window.location.reload()}>{tr("Try again", "Reintentar", "Réessayer")}</Button>
    </main>
  );

  // The website opens straight on sign-in. In the app, signed-out visitors
  // are sent to sign-up and members to /app, so keep it hidden until then.
  return (
    <div data-native-entry={entryPending ? "pending" : "ready"}>
      <AuthScreen />
    </div>
  );
}
