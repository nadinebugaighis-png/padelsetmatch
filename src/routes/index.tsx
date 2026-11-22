import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { GooglePlayBadge } from "@/components/GooglePlayBadge";
import { useT, useTr, LangSwitch } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resumeNativeEntry } from "@/lib/native-entry";
import { Button } from "@/components/ui/button";
import { AuthPanel } from "@/components/AuthPanel";
import { EntranceBackdrop } from "@/components/EntranceBackdrop";

function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const check = () =>
      setStandalone(
        window.matchMedia?.("(display-mode: standalone)").matches ||
          nav.standalone === true,
      );
    check();
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);
  return standalone;
}

import shareBanner from "@/assets/padel-share-luxury.jpg.asset.json";
import landing1 from "@/assets/landing1.jpg.asset.json";
import landing2 from "@/assets/landing2.jpg.asset.json";
import landing3 from "@/assets/landing3.jpg.asset.json";
import landing4 from "@/assets/landing4.jpg.asset.json";
const LANDING_TILES = [landing1.url, landing2.url, landing3.url, landing4.url];

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

function StoreBadges() {
  const tr = useTr();
  return (
    <div className="max-w-[400px] mx-auto lg:mx-0">
      <div className="flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[var(--ink)]/65">
        <span>{tr("Or get the app", "O descarga la app", "Ou télécharge l’app")}</span>
        <span className="h-px flex-1 bg-[var(--ink)]/15" aria-hidden />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <AppStoreBadge className="[&_img]:!h-10" />
        <GooglePlayBadge className="[&_img]:!h-10" />
      </div>
    </div>
  );
}

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
      await resumeNativeEntry(native, () => supabase.auth.getSession(), () => {
        if (!cancelled) return navigate({ to: "/app", replace: true });
      });
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
  const t = useT();
  const tr = useTr();

  if (entryFailed) return (
    <main data-native-entry="ready" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-paper text-ink px-6 text-center">
      <BrandMark />
      <p>{tr("Taking longer to open. Please try again.", "Está tardando en abrirse. Vuelve a intentarlo.", "L’ouverture prend plus de temps. Réessaie.")}</p>
      <Button onClick={() => window.location.reload()}>{tr("Try again", "Reintentar", "Réessayer")}</Button>
    </main>
  );

  return (
    <main data-native-entry={entryPending ? "pending" : "ready"} className="programme-page min-h-screen flex flex-col relative overflow-hidden">
      <EntranceBackdrop />

      {/* Header */}
      <header className="relative z-30 px-5 sm:px-8 lg:px-16 pt-3 lg:pt-4 pb-2 lg:pb-3 flex items-center justify-between">
        <BrandMark />
        <LangSwitch />
      </header>

      {/* One entrance: headline and sign-in on the same screen */}
      <section className="relative z-10 min-h-[calc(100dvh-56px)] px-5 sm:px-8 lg:px-16 pt-6 sm:pt-10 lg:pt-0 pb-10 grid content-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:content-center lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <h1 className="text-serif uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.4rem] sm:text-[3rem] md:text-[3.75rem] lg:text-[4.5rem] xl:text-[5rem]">
            <span className="block">{t("land.h1.a")}</span>
            <span className="block">{t("land.h1.a2")}</span>
            <span className="block text-[var(--plum)]">{t("land.h1.b")}</span>
          </h1>

          <p className="mt-3 text-[14.5px] sm:text-base text-[var(--ink)]/75 max-w-[22rem] sm:max-w-md leading-[1.55]">
            {t("land.lede")}
          </p>

          <div className="mt-8 hidden lg:block max-w-md">
            <StoreBadges />
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <AuthPanel initialMode="signup" showEnterWhenSignedIn />
        </div>

        <div className="lg:hidden">
          <StoreBadges />
        </div>
      </section>

      {/* Preview strip (kept, restyled subtly) */}
      <section className="relative z-10 px-5 sm:px-8 lg:px-16 pt-10 pb-14 border-t border-[var(--ink)]/16 bg-[var(--paper)]/85 backdrop-blur">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div className="max-w-lg">
            <p className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--plum)_14%,var(--paper))] border border-[color-mix(in_oklab,var(--plum)_22%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--plum)]">
              {t("land.preview.chip")}
            </p>
            <h2 className="text-serif mt-4 text-4xl md:text-5xl uppercase tracking-[-0.01em] text-[var(--ink)]">
              {t("land.preview.title")}
            </h2>
            <p className="mt-3 text-[var(--ink)]/65 leading-relaxed">{t("land.preview.sub")}</p>
          </div>
          <a
            href="#join"
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.16em] text-[12px] px-5 py-2.5 hover:brightness-110 transition"
          >
            {t("land.preview.cta")}
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { src: LANDING_TILES[0], name: "Lucía", city: "Madrid", score: 92 },
            { src: LANDING_TILES[1], name: "Marc", city: "Barcelona", score: 88 },
            { src: LANDING_TILES[2], name: "Aisha", city: "Dubai", score: 85 },
            { src: LANDING_TILES[3], name: "Kenji", city: "Tokyo", score: 81 },
          ].map((p, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--ink)]/16 group">
              <img src={p.src} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) saturate(1.1)" }} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/20 to-transparent" />
              <span className="absolute top-3 right-3 text-[11px] font-semibold bg-[var(--paper)] text-[var(--ink)] border border-[var(--ink)]/16 rounded-full px-2.5 py-1">{p.score}</span>
              <div className="absolute bottom-3 left-3 right-3 text-[var(--paper)]">
                <div className="text-serif text-xl leading-tight">{p.name}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-75">{p.city}</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-[var(--ink)]/50 backdrop-blur-sm">
                <a href="#join" className="rounded-full bg-[var(--paper)] text-[var(--ink)] font-semibold px-5 py-2 text-sm tracking-wide">{t("land.preview.unlock")}</a>
              </div>
            </div>
          ))}
        </div>
        
      </section>

      {/* Dark green footer bar */}
      <footer className="relative z-10 bg-[var(--ink)] text-[var(--paper)]">
        <div className="h-1.5 bg-[var(--plum)]" aria-hidden />
        <div className="px-5 sm:px-8 lg:px-16 py-8 flex items-center justify-between gap-x-6 gap-y-4 flex-wrap text-xs tracking-wide text-[var(--paper)]/70">
          <span>© PadelSetMatch</span>
          <nav className="flex items-center gap-3">
            <Link to="/how-it-works" className="hover:text-[var(--paper)] transition">How it works</Link>
            <span aria-hidden>·</span>
            <Link to="/terms" className="hover:text-[var(--paper)] transition">Terms</Link>
            <span aria-hidden>·</span>
            <Link to="/privacy" className="hover:text-[var(--paper)] transition">Privacy</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
