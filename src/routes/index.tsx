import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Padel Match Madrid — your padel partner & maybe more" },
      { name: "description", content: "Discover players who match your level, personality and lifestyle. Whether you're looking for great games, new friends or meaningful connections, we'll help you find people you genuinely click with." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[var(--ball)] ball-glow" />
          <span className="text-display text-2xl tracking-wider">PADEL · MATCH</span>
        </div>
        <Link to="/auth" className="chip chip-ball">Sign in</Link>
      </header>

      <section className="flex-1 grid lg:grid-cols-2 gap-10 items-center px-6 lg:px-16 py-10">
        <div className="max-w-xl">
          <p className="chip chip-clay mb-6">Madrid · pilot</p>
          <h1 className="text-display text-6xl md:text-7xl lg:text-8xl leading-[0.9]">
            find your best,<br />
            <span style={{ color: "var(--ball)" }}>Match.</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--cream)]/80 max-w-md">
            Discover players who match your level, personality and lifestyle. &nbsp;Whether you're looking for great games, new friends or meaningful connections, well help you find people you genuinely click with.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="inline-flex items-center rounded-full bg-[var(--ball)] text-[var(--court-deep)] font-semibold px-6 py-3 hover:opacity-90">
              Start matching
            </Link>
            <a href="https://playtomic.io" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-[var(--cream)]/30 px-6 py-3 hover:bg-[var(--cream)]/10">
              What's Playtomic?
            </a>
          </div>
          <div className="mt-10 flex gap-6 text-sm text-[var(--cream)]/60">
            <div><span className="text-display text-3xl text-[var(--cream)]">12</span><br />Madrid players seeded</div>
            <div><span className="text-display text-3xl text-[var(--cream)]">10</span><br />neighborhoods</div>
            <div><span className="text-display text-3xl text-[var(--cream)]">∞</span><br />post-match vermut</div>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="surface-card p-8 rotate-2">
            <div className="grid grid-cols-2 gap-3">
              {[1, 4, 6, 9].map((n) => (
                <div key={n} className="aspect-[3/4] rounded-xl overflow-hidden border border-[var(--cream)]/10">
                  <img src={`/__l5e/assets-v1/${["45c8ffba-91c1-4969-b999-c88aea455226","819355c1-075e-4a76-9a7d-593d6ecb1091","12a844fb-b963-4d8b-8e20-6e57e5bae1fe","67665327-2c78-4307-bc56-0d32937195a0"][[1,4,6,9].indexOf(n)]}/p${n}.jpg`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-[var(--cream)]/60">Tap. Tap-back. Play.</p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 text-xs text-[var(--cream)]/50 flex justify-between">
        <span>Made for Madrid. Worst case: new padel friend.</span>
        <span>v0.1</span>
      </footer>
    </main>
  );
}
