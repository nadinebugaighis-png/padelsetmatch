import { createFileRoute, Link } from "@tanstack/react-router";
import { InstallModal, useInstallModal } from "@/components/InstallPrompt";
import { ShareQR } from "@/components/ShareQR";
import { Smartphone } from "lucide-react";
import { useT, LangSwitch } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlayerCount } from "@/lib/stats.functions";

import shareBanner from "@/assets/padel-share-banner.png.asset.json";
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
      { property: "og:image:width", content: "1456" },
      { property: "og:image:height", content: "530" },
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
  return (
    <main className="programme-page min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--ink)] ring-4 ring-[var(--grass)]/40" />
          <span className="text-display text-2xl tracking-tight">PADEL·MATCH</span>
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Link to="/how-it-works" className="text-xs uppercase tracking-widest text-[var(--ink)]/60 hover:text-[var(--ink)] hidden sm:inline">
            {t("land.howItWorks")}
          </Link>
          <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] text-[11px] font-semibold uppercase tracking-[0.15em] px-4 py-1.5 hover:brightness-110 transition">{t("land.signin")}</Link>
        </div>
      </header>

      <section className="flex-1 grid lg:grid-cols-2 gap-10 items-center px-6 lg:px-16 py-10">
        <div className="max-w-xl">
          <p className="chip chip-clay mb-6">{t("land.chip")}</p>
          <h1 className="text-display text-7xl md:text-8xl lg:text-9xl leading-[0.9]">
            {t("land.h1.a")}<br />
            {t("land.h1.a2")}<br />
            <span style={{ color: "var(--ink)" }}>{t("land.h1.b")}</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--ink)]/80 max-w-md">
            {t("land.lede")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold px-7 py-3.5 tracking-wide hover:brightness-110 shadow-[0_14px_40px_-12px_rgba(15,62,46,0.45)] transition">
              {t("land.cta")}
            </Link>
            <ShareQR url="https://padelmatchapp.lovable.app" label="Join me on PadelMatch" />
          </div>
          <Link
            to="/how-it-works"
            className="mt-4 inline-block text-base font-semibold text-[var(--ink)] hover:opacity-80 underline underline-offset-4 decoration-2 decoration-[var(--ink)]/40 hover:decoration-[var(--ink)]"
          >
            {t("land.howItWorks")} →
          </Link>

          <p className="mt-4 text-base font-medium text-[var(--ink)]/90 max-w-md tracking-wide">
            {t("land.cta.sub")}
          </p>

          <div className="mt-10 text-sm text-[var(--ink)]/60">
            <span className="text-display text-4xl text-[var(--ink)]">{count}</span>
            <br />{t("land.statUsers")}
          </div>

          <button
            onClick={install.openModal}
            className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[var(--ink)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] hover:bg-[var(--grass)] hover:text-[var(--ink)] hover:border-[var(--grass)] transition"
          >
            <Smartphone className="w-4 h-4" />
            Add to your home screen
          </button>
        </div>
        <div className="hidden lg:block">
          <div className="surface-card p-8 rotate-2">
            <div className="grid grid-cols-2 gap-3">
              {LANDING_TILES.map((src, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden border border-[var(--ink)]/10">
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-[var(--ink)]/60">{t("land.tap")}</p>
          </div>
        </div>
      </section>

      <section className="px-6 lg:px-16 py-12 border-t border-[var(--ink)]/10">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="chip chip-clay mb-3">{t("land.preview.chip")}</p>
            <h2 className="text-display text-4xl md:text-5xl">{t("land.preview.title")}</h2>
            <p className="mt-2 text-[var(--ink)]/70 max-w-lg">{t("land.preview.sub")}</p>
          </div>
          <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold px-6 py-2.5 tracking-wide hover:brightness-110 transition">
            {t("land.preview.cta")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { src: LANDING_TILES[0], name: "Lucía", city: "Madrid", score: 92 },
            { src: LANDING_TILES[1], name: "Marc", city: "Barcelona", score: 88 },
            { src: LANDING_TILES[2], name: "Aisha", city: "Dubai", score: 85 },
            { src: LANDING_TILES[3], name: "Kenji", city: "Tokyo", score: 81 },
          ].map((p, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--ink)]/10 group">
              <img src={p.src} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) saturate(1.1)" }} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute top-3 right-3 text-xs font-semibold bg-[var(--grass)] text-[var(--ink)] rounded-full px-2.5 py-1">{p.score}</span>
              <div className="absolute bottom-3 left-3 right-3 text-[var(--ink)]">
                <div className="text-display text-xl">{p.name}</div>
                <div className="text-xs opacity-80">{p.city}</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="rounded-full bg-[var(--ink)] text-[var(--paper)] font-semibold px-5 py-2 text-sm tracking-wide">{t("land.preview.unlock")}</Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--ink)]/50">{t("land.preview.foot")}</p>
      </section>


      <footer className="px-6 py-6 text-xs text-[var(--ink)]/50 flex flex-wrap items-center justify-between gap-3">
        <span>{t("land.foot")}</span>
        <span className="flex gap-4">
          <Link to="/terms" className="hover:text-[var(--ink)]">Terms</Link>
          <Link to="/privacy" className="hover:text-[var(--ink)]">Privacy</Link>
          <span>v0.1</span>
        </span>
      </footer>
      <InstallModal open={install.open} onClose={install.closeModal} />
    </main>
  );
}
