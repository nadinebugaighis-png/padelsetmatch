import { createFileRoute, Link } from "@tanstack/react-router";
import { InstallModal, useInstallModal } from "@/components/InstallPrompt";
import { ShareQR } from "@/components/ShareQR";
import { Smartphone } from "lucide-react";
import { useT, LangSwitch } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlayerCount } from "@/lib/stats.functions";

import shareBanner from "@/assets/padel-share-banner.png.asset.json";

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
    <main className="min-h-screen flex flex-col bg-[var(--cream)] text-[var(--court-deep)]">
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-[var(--court)]/10">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[var(--clay)] court-glow" />
          <span className="text-display text-2xl tracking-wider text-[var(--court-deep)]">PADEL · MATCH</span>
        </div>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Link to="/how-it-works" className="text-xs uppercase tracking-widest text-[var(--court)]/70 hover:text-[var(--court-deep)] hidden sm:inline">
            {t("land.howItWorks")}
          </Link>
          <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="chip chip-clay">{t("land.signin")}</Link>
        </div>
      </header>

      <section className="flex-1 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center px-6 lg:px-16 py-12 lg:py-20">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-[var(--clay)] text-[var(--clay)] text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
            <span className="w-1.5 h-1.5 bg-[var(--clay)] rounded-full" />
            {t("land.chip")}
          </div>
          <h1 className="text-display text-6xl md:text-7xl lg:text-8xl leading-[0.95] text-[var(--court-deep)]">
            {t("land.h1.a")}<br />
            {t("land.h1.a2")}<br />
            <span className="italic text-[var(--clay)]">{t("land.h1.b")}</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--court)]/80 max-w-md leading-relaxed font-light">
            {t("land.lede")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="inline-flex items-center bg-[var(--clay)] text-white font-semibold px-8 py-4 hover:bg-[var(--clay-deep)] transition-all shadow-lg">
              {t("land.cta")}
            </Link>
            <ShareQR url="https://padelmatchapp.lovable.app" label="Join me on PadelMatch" />
          </div>
          <Link
            to="/how-it-works"
            className="mt-4 inline-block text-base font-semibold text-[var(--court-deep)] hover:text-[var(--clay)] underline underline-offset-4 decoration-2 decoration-[var(--clay)]/40 hover:decoration-[var(--clay)]"
          >
            {t("land.howItWorks")} →
          </Link>

          <p className="mt-4 text-base font-medium text-[var(--court)]/90 max-w-md tracking-wide">
            {t("land.cta.sub")}
          </p>

          <div className="mt-10 text-sm text-[var(--court)]/60">
            <span className="text-display text-4xl text-[var(--clay)]">{count}</span>
            <br />{t("land.statUsers")}
          </div>

          <button
            onClick={install.openModal}
            className="mt-6 inline-flex items-center gap-2 border-2 border-[var(--court-deep)] px-5 py-2.5 text-sm font-bold text-[var(--court-deep)] hover:bg-[var(--ball)] hover:text-[var(--court-deep)] hover:border-[var(--ball)] transition"
          >
            <Smartphone className="w-4 h-4" />
            Add to your home screen
          </button>
        </div>
        <div className="hidden lg:block relative h-[600px]">
          <div className="absolute top-0 left-0 w-[65%] h-[90%] z-20 shadow-2xl overflow-hidden border-[12px] border-white transform -rotate-2 hover:rotate-0 transition-transform duration-700">
            <img src="/landing/grid1.jpg" alt="" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-[var(--clay)]/5 mix-blend-overlay" />
          </div>
          <div className="absolute top-12 right-0 w-[55%] h-[75%] z-10 shadow-xl overflow-hidden border-[12px] border-white transform rotate-1 hover:rotate-0 transition-transform duration-700">
            <img src="/landing/grid2.jpg" alt="" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-[var(--court)]/10 mix-blend-overlay" />
          </div>
          <div className="absolute bottom-0 right-1/4 w-[40%] h-[35%] z-30 shadow-lg overflow-hidden border-[8px] border-white transform rotate-3 hover:rotate-0 transition-transform duration-700">
            <img src="/landing/grid3.jpg" alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="absolute -bottom-6 -left-6 w-48 h-48 border-l border-b border-[var(--clay)]/20 z-0" />
        </div>
      </section>

      <section className="px-6 lg:px-16 py-16 border-t border-[var(--court)]/10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <p className="chip chip-clay mb-3">{t("land.preview.chip")}</p>
            <h2 className="text-display text-4xl md:text-5xl text-[var(--court-deep)]">{t("land.preview.title")}</h2>
            <p className="mt-2 text-[var(--court)]/70 max-w-lg">{t("land.preview.sub")}</p>
          </div>
          <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="inline-flex items-center bg-[var(--clay)] text-white font-semibold px-5 py-2.5 hover:bg-[var(--clay-deep)] transition-all">
            {t("land.preview.cta")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { src: "/landing/grid1.jpg", name: "Lucía", city: "Madrid", score: 92 },
            { src: "/landing/grid2.jpg", name: "Marc", city: "Barcelona", score: 88 },
            { src: "/landing/grid3.jpg", name: "Aisha", city: "Dubai", score: 85 },
            { src: "/landing/grid4.jpg", name: "Kenji", city: "Tokyo", score: 81 },
          ].map((p, i) => (
            <div key={i} className="relative aspect-[3/4] overflow-hidden border border-[var(--court)]/10 group">
              <img src={p.src} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) saturate(1.1)" }} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--court-deep)]/70 via-[var(--court-deep)]/10 to-transparent" />
              <span className="absolute top-3 right-3 text-xs font-semibold bg-[var(--ball)] text-[var(--court-deep)] px-2 py-1">{p.score}</span>
              <div className="absolute bottom-3 left-3 right-3 text-[var(--cream)]">
                <div className="text-display text-xl">{p.name}</div>
                <div className="text-xs opacity-80">{p.city}</div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-[var(--court-deep)]/40">
                <Link to="/auth" search={{ redirect: undefined, join: undefined }} className="bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-4 py-2 text-sm">{t("land.preview.unlock")}</Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--court)]/50">{t("land.preview.foot")}</p>
      </section>


      <footer className="px-6 py-6 text-xs text-[var(--court)]/50 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--court)]/10">
        <span>{t("land.foot")}</span>
        <span className="flex gap-4">
          <Link to="/terms" className="hover:text-[var(--court-deep)]">Terms</Link>
          <Link to="/privacy" className="hover:text-[var(--court-deep)]">Privacy</Link>
          <span>v0.1</span>
        </span>
      </footer>
      <InstallModal open={install.open} onClose={install.closeModal} />
    </main>
  );
}
