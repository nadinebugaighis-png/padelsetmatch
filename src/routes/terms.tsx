import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · PadelMatch" },
      { name: "description", content: "Terms of Service for PadelMatch — the padel-first matching app." },
      { property: "og:title", content: "Terms of Service · PadelMatch" },
      { property: "og:description", content: "Terms of Service for PadelMatch — the padel-first matching app." },
      { property: "og:url", content: "https://padelmatchapp.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://padelmatchapp.lovable.app/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 text-[var(--cream)]/90 space-y-4">
      <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← Home</Link>
      <h1 className="text-display text-4xl">Terms of Service</h1>
      <p className="text-sm text-[var(--cream)]/60">Last updated: {new Date().toLocaleDateString()}</p>

      <p>This page is maintained by the PadelMatch team to explain the basic rules of using the app. By creating an account you agree to these terms.</p>

      <h2 className="text-display text-2xl mt-6">1. Who can use PadelMatch</h2>
      <p>You must be 18 or older. One account per person. You must provide accurate information about yourself, including a real first name and a recent photo of you (preferably playing padel).</p>

      <h2 className="text-display text-2xl mt-6">2. How you behave</h2>
      <p>No harassment, hate speech, sexual content involving minors, threats, scams, spam, or impersonation. No selling, prostitution, or commercial promotions. Treat every player the way you'd want to be treated on a court.</p>

      <h2 className="text-display text-2xl mt-6">3. Off-platform meetings</h2>
      <p>All padel matches should be booked through Playtomic or another legitimate court-booking service so the meeting is at a public, supervised venue. PadelMatch is a discovery and chat platform — we are not responsible for what happens off-platform. Meet in public, tell a friend, and trust your instincts.</p>

      <h2 className="text-display text-2xl mt-6">4. Reports, suspensions and bans</h2>
      <p>One credible report leads to instant auto-suspension while our team reviews. Repeated no-shows on booked matches lead to auto-suspension. Confirmed bad-faith behaviour leads to a permanent ban with no refund.</p>

      <h2 className="text-display text-2xl mt-6">5. Your content</h2>
      <p>You keep ownership of your photos, bio and messages. You grant PadelMatch a non-exclusive licence to display them inside the app for the purpose of running the service. You can delete your account at any time from the Profile screen.</p>

      <h2 className="text-display text-2xl mt-6">6. No guarantees</h2>
      <p>We don't guarantee matches, dates, friendships, or that anyone you meet is who they say they are. The service is provided "as is" without warranties to the extent allowed by law.</p>

      <h2 className="text-display text-2xl mt-6">7. Changes</h2>
      <p>We may update these terms. If we make material changes we'll notify you in the app.</p>

      <h2 className="text-display text-2xl mt-6">8. Contact</h2>
      <p>For questions or to exercise your privacy rights, contact us via the "Make this app better" box on your Profile screen.</p>

      <div className="pt-6 text-sm">
        <Link to="/privacy" className="underline">Privacy Policy →</Link>
      </div>
    </main>
  );
}
