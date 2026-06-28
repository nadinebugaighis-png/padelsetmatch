import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, LangSwitch } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PadelMatch — your padel partner & maybe more" },
      { name: "description", content: "Discover players who match your level, personality and lifestyle. Whether you're looking for great games, new friends or meaningful connections, we'll help you find people you genuinely click with." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const t = useT();
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[var(--ball)] ball-glow" />
          <span className="text-display text-2xl tracking-wider">PADEL · MATCH</span>
        </div>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Link to="/auth" className="chip chip-ball">{t("land.signin")}</Link>
        </div>
      </header>

      <section className="flex-1 grid lg:grid-cols-2 gap-10 items-center px-6 lg:px-16 py-10">
        <div className="max-w-xl">
          <p className="chip chip-clay mb-6">{t("land.chip")}</p>
          <h1 className="text-display text-7xl md:text-8xl lg:text-9xl leading-[0.9]">
            {t("land.h1.a")}<br />
            <span style={{ color: "var(--ball)" }}>{t("land.h1.b")}</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--cream)]/80 max-w-md">
            {t("land.lede")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">
              {t("land.cta")}
            </Link>
            <a href="https://playtomic.io" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-[var(--cream)]/30 px-6 py-3 hover:bg-[var(--cream)]/10">
              {t("land.what")}
            </a>
          </div>
          <div className="mt-10 flex gap-6 text-sm text-[var(--cream)]/60">
            <div><span className="text-display text-3xl text-[var(--cream)]">∞</span><br />{t("land.stat1")}</div>
            <div><span className="text-display text-3xl text-[var(--cream)]">1</span><br />{t("land.stat2")}</div>
            <div><span className="text-display text-3xl text-[var(--cream)]">∞</span><br />{t("land.stat3")}</div>
          </div>

        </div>
        <div className="hidden lg:block">
          <div className="surface-card p-8 rotate-2">
            <div className="grid grid-cols-2 gap-3">
              {["/landing/grid1.jpg", "/landing/grid2.jpg", "/landing/grid3.jpg", "/landing/grid4.jpg"].map((src, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden border border-[var(--cream)]/10">
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-[var(--cream)]/60">{t("land.tap")}</p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 text-xs text-[var(--cream)]/50 flex flex-wrap items-center justify-between gap-3">
        <span>{t("land.foot")}</span>
        <span className="flex gap-4">
          <Link to="/terms" className="hover:text-[var(--cream)]">Terms</Link>
          <Link to="/privacy" className="hover:text-[var(--cream)]">Privacy</Link>
          <span>v0.1</span>
        </span>
      </footer>
    </main>
  );
}
