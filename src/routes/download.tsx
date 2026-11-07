import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppStoreBadge, APP_STORE_URL } from "@/components/AppStoreBadge";
import { GooglePlayBadge, GOOGLE_PLAY_URL } from "@/components/GooglePlayBadge";
import { useTr } from "@/lib/i18n";
import { isNative } from "@/lib/native";
import { DOWNLOAD_URL, pickStore } from "@/lib/store-link";

const SHARE_IMAGE = "https://padelsetmatch.com/download-share.jpg";
const TITLE = "PadelSetMatch — Tu pista. Tu gente. Tu partido.";
const DESC =
  "Encuentra jugadores y organiza partidos de pádel en La Moraleja y Madrid. Descárgala gratis para iPhone y Android.";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: DOWNLOAD_URL },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PadelSetMatch" },
      { property: "og:locale", content: "es_ES" },
      { property: "og:image", content: SHARE_IMAGE },
      { property: "og:image:secure_url", content: SHARE_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "PadelSetMatch — Tu pista. Tu gente. Tu partido." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: SHARE_IMAGE },
      { name: "apple-itunes-app", content: "app-id=6798219696" },
    ],
    links: [{ rel: "canonical", href: DOWNLOAD_URL }],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const tr = useTr();
  const [sending, setSending] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    // Inside the app there is nothing to download.
    if (isNative()) {
      window.location.replace("/app");
      return;
    }
    const store = pickStore(navigator.userAgent, navigator.maxTouchPoints ?? 0);
    if (!store) return;
    setSending(store);
    window.location.replace(store === "ios" ? APP_STORE_URL : GOOGLE_PLAY_URL);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-[var(--gold)]/50 bg-[var(--ink)] p-2 shadow-2xl">
        <div className="rounded-[1.25rem] border border-[var(--gold)]/30 px-6 py-10 text-center">
          <img
            src="/padel-icon.png"
            alt=""
            width={72}
            height={72}
            className="mx-auto h-[72px] w-[72px] rounded-2xl shadow-lg"
          />
          <h1 className="mt-6 text-serif text-3xl tracking-wide text-[var(--paper)]">
            PADEL SET MATCH
          </h1>
          <div className="mx-auto mt-3 h-px w-24 bg-[var(--gold)]" />
          <p className="mt-3 text-serif italic text-lg text-[var(--gold)]">
            {tr("Your court. Your people. Your match.", "Tu pista. Tu gente. Tu partido.", "Ton terrain. Tes partenaires. Ton match.")}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--paper)]/75">
            {tr(
              "Find padel players and organise matches in La Moraleja and Madrid. Free on iPhone and Android.",
              "Encuentra jugadores y organiza partidos de pádel en La Moraleja y Madrid. Gratis en iPhone y Android.",
              "Trouve des joueurs et organise des matchs de padel à La Moraleja et Madrid. Gratuit sur iPhone et Android.",
            )}
          </p>

          {sending && (
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grass)]" role="status">
              {sending === "ios"
                ? tr("Opening the App Store…", "Abriendo el App Store…", "Ouverture de l’App Store…")
                : tr("Opening Google Play…", "Abriendo Google Play…", "Ouverture de Google Play…")}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <AppStoreBadge />
            <GooglePlayBadge />
          </div>

          <Link
            to="/"
            className="mt-8 inline-block text-xs uppercase tracking-[0.2em] text-[var(--paper)]/60 underline-offset-4 hover:text-[var(--paper)] hover:underline"
          >
            {tr("Visit the website", "Ver la web", "Voir le site")}
          </Link>
        </div>
      </div>
    </main>
  );
}
