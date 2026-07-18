import { createFileRoute, Link } from "@tanstack/react-router";
import { InstallModal, useInstallModal } from "@/components/InstallPrompt";
import { BrandMark } from "@/components/BrandMark";
import { ShareQR } from "@/components/ShareQR";
import { Smartphone, ArrowRight } from "lucide-react";
import { useT, LangSwitch } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlayerCount } from "@/lib/stats.functions";
import { useEffect, useState } from "react";

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

import shareBanner from "@/assets/padel-share-logo.jpg.asset.json";
import court from "@/assets/landing-court.jpg.asset.json";
import landing1 from "@/assets/landing1.jpg.asset.json";
import landing2 from "@/assets/landing2.jpg.asset.json";
import landing3 from "@/assets/landing3.jpg.asset.json";
import landing4 from "@/assets/landing4.jpg.asset.json";
const LANDING_TILES = [landing1.url, landing2.url, landing3.url, landing4.url];

const SHARE_IMAGE = `https://padelmatchapp.lovable.app${shareBanner.url}`;
const SHARE_DESC = "Connect with Padel players nearby you, join games, discover courts, and build your community.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Padel Match App — More Friends, Better Games" },
      { name: "description", content: SHARE_DESC },
      { property: "og:title", content: "Padel Match App — More Friends, Better Games" },
      { property: "og:description", content: SHARE_DESC },
      { property: "og:url", content: "https://padelmatchapp.lovable.app/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: SHARE_IMAGE },
      { property: "og:image:secure_url", content: SHARE_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Padel Match App — More Friends, Better Games" },
      { name: "twitter:description", content: SHARE_DESC },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://padelmatchapp.lovable.app/" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const t = useT();
  const fetchCount = useServerFn(getPlayerCount);
  const countQ = useQuery({
    queryKey: ["player-count"],
    queryFn: async () => {
      try { return await fetchCount(); } catch { return { count: 0 }; }
    },
    retry: false,
  });
  const count = countQ.data?.count ?? 0;
  const install = useInstallModal();
  const isStandalone = useIsStandalone();

  return (
    <main className="programme-page min-h-screen flex flex-col relative overflow-hidden">
      {/* Court image bleeds from right, softly fading into paper */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%] sm:w-[52%] lg:w-[46%] z-0">
        <img
          src={court.url}
          alt=""
          className="w-full h-full object-cover object-left"
        />
        {/* Padel-court green tint on the wall */}
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{ background: "rgba(87, 118, 90, 0.55)" }}
        />
        <div
          className="absolute inset-0 mix-blend-overlay"
          style={{ background: "rgba(60, 90, 65, 0.25)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, var(--paper) 0%, color-mix(in oklab, var(--paper) 85%, transparent) 12%, transparent 40%)",
          }}
        />
        {/* Right side fades to paper white so the green court area becomes clean white */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,transparent_80%,var(--paper)_95%)] sm:bg-[linear-gradient(to_right,transparent_60%,var(--paper)_75%)] lg:bg-[linear-gradient(to_right,transparent_38%,var(--paper)_50%)]"
        />
      </div>

      {/* Header */}
      <header className="relative z-30 px-5 sm:px-8 lg:px-16 pt-3 lg:pt-4 pb-2 lg:pb-3 flex items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2.5 leading-none">
          <LangSwitch />
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signin" }}
            className="inline-flex items-center justify-center text-center rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.18em] leading-[1.05] min-h-8 px-3 sm:px-4 py-1.5 hover:brightness-110 transition [word-spacing:100vw] sm:[word-spacing:normal]"
          >
            {t("land.signin")}
          </Link>
        </div>
      </header>

      {/* Hero — full viewport on mobile, compact viewport-fit on desktop */}
      <section className="relative z-10 min-h-[100dvh] flex flex-col justify-start sm:justify-center px-5 sm:px-8 lg:px-16 pt-12 sm:pt-10 lg:pt-0 pb-6 lg:min-h-[calc(100dvh-64px)]">
        <div className="max-w-xl">
          <h1 className="text-serif mt-6 sm:mt-2 lg:mt-1 uppercase text-[var(--ink)] leading-[0.95] tracking-[-0.015em] text-[2.5rem] sm:text-[3rem] md:text-[3.75rem] lg:text-[4.5rem] xl:text-[5rem]">
            <span className="block">{t("land.h1.a")}</span>
            <span className="block">{t("land.h1.a2")}</span>
            <span className="block text-[var(--plum)]">{t("land.h1.b")}</span>
          </h1>

          <p className="mt-3 lg:mt-2 text-[15px] sm:text-base text-[var(--ink)]/75 max-w-md leading-[1.55]">
            {t("land.lede")}
          </p>

          <div className="mt-4 lg:mt-3 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ redirect: undefined, join: undefined, mode: "signup" }}
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.18em] text-[13px] pl-6 pr-3 py-3 hover:brightness-110 shadow-[0_18px_40px_-20px_rgba(15,62,46,0.55)] transition"
            >
              {t("land.cta")}
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--paper)]/15 group-hover:translate-x-0.5 transition">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <ShareQR url="https://padelsetmatch.com" label="Join me on PadelMatch" />
          </div>

          <p aria-hidden="true" className="mt-3 lg:mt-2 text-[15px] sm:text-base leading-[1.55] max-w-md invisible">
            &nbsp;
          </p>

          <Link
            to="/demo"
            className="mt-3 lg:mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--plum)] underline underline-offset-[6px] decoration-2 decoration-[var(--plum)]/60 hover:decoration-[var(--plum)]"
          >
            Peek inside <ArrowRight className="w-4 h-4" />
          </Link>

          <p aria-hidden="true" className="mt-3 lg:mt-2 text-[15px] sm:text-base leading-[1.55] max-w-md invisible">
            &nbsp;
          </p>




        </div>

        {/* Stats row */}
        <div className={`mt-5 lg:mt-4 max-w-xl grid ${isStandalone ? "grid-cols-1" : "grid-cols-[auto_1px_1fr]"} items-center gap-5 sm:gap-6`}>
          <div>
            <div className="text-serif text-3xl lg:text-4xl leading-none text-[var(--ink)]">{count.toLocaleString()}</div>
            <div className="mt-1 text-xs text-[var(--ink)]/60">{t("land.statUsers")}</div>
          </div>
          {!isStandalone && (
            <>
              <div className="h-12 w-px bg-[var(--ink)]/15" />
              <button
                onClick={install.openModal}
                className="flex items-center gap-3 text-left group"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--ink)]/25 text-[var(--ink)] group-hover:bg-[var(--ink)] group-hover:text-[var(--paper)] transition">
                  <Smartphone className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-[var(--ink)] leading-tight">
                  Add to your<br />home screen
                </span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* Preview strip (kept, restyled subtly) */}
      <section className="relative z-10 px-5 sm:px-8 lg:px-16 pt-10 pb-14 border-t border-[var(--ink)]/10 bg-[var(--paper)]/85 backdrop-blur">
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
          <Link
            to="/auth"
            search={{ redirect: undefined, join: undefined, mode: "signup" }}
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold uppercase tracking-[0.16em] text-[12px] px-5 py-2.5 hover:brightness-110 transition"
          >
            {t("land.preview.cta")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { src: LANDING_TILES[0], name: "Lucía", city: "Madrid", score: 92 },
            { src: LANDING_TILES[1], name: "Marc", city: "Barcelona", score: 88 },
            { src: LANDING_TILES[2], name: "Aisha", city: "Dubai", score: 85 },
            { src: LANDING_TILES[3], name: "Kenji", city: "Tokyo", score: 81 },
          ].map((p, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--ink)]/10 group">
              <img src={p.src} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) saturate(1.1)" }} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/20 to-transparent" />
              <span className="absolute top-3 right-3 text-[11px] font-semibold bg-[var(--paper)] text-[var(--ink)] border border-[var(--ink)]/10 rounded-full px-2.5 py-1">{p.score}</span>
              <div className="absolute bottom-3 left-3 right-3 text-[var(--paper)]">
                <div className="text-serif text-xl leading-tight">{p.name}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] opacity-75">{p.city}</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-[var(--ink)]/50 backdrop-blur-sm">
                <Link to="/auth" search={{ redirect: undefined, join: undefined, mode: "signup" }} className="rounded-full bg-[var(--paper)] text-[var(--ink)] font-semibold px-5 py-2 text-sm tracking-wide">{t("land.preview.unlock")}</Link>
              </div>
            </div>
          ))}
        </div>
        
      </section>

      {/* Dark green footer bar */}
      <footer className="relative z-10 bg-[var(--ink)] text-[var(--paper)]">
        <div className="h-1.5 bg-[var(--plum)]" aria-hidden />
        <div className="px-5 sm:px-8 lg:px-16 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm tracking-wide">padelsetmatch.com</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-[var(--paper)]/70">
            <Link to="/terms" className="hover:text-[var(--paper)]">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--paper)]">Privacy</Link>
            <span>v0.1</span>
          </div>
        </div>
      </footer>
      <InstallModal open={install.open} onClose={install.closeModal} />
    </main>
  );
}
