import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · PadelSetMatch" },
      { name: "description", content: "Terms of Service for PadelSetMatch — the padel player directory." },
      { property: "og:title", content: "Terms of Service · PadelSetMatch" },
      { property: "og:description", content: "Terms of Service for PadelSetMatch — the padel player directory." },
      { property: "og:url", content: "https://padelsetmatch.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://padelsetmatch.com/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="bg-[var(--paper)] min-h-screen max-w-2xl mx-auto px-6 py-10 text-[var(--ink)]/90 space-y-4">
      <Link to="/" className="text-xs uppercase tracking-widest text-[var(--ink)]/60">← Home</Link>
      <h1 className="text-display text-4xl">Terms of Service</h1>
      <p className="text-sm text-[var(--ink)]/60">Last updated: {new Date().toLocaleDateString()}</p>

      <p>
        PadelMatch is a padel player directory and match-finding app operated by <b>Moorish Arches
        S.L.</b> (Madrid, Spain). By creating an account you agree to these terms.
      </p>

      <h2 className="text-display text-2xl mt-6">1. What PadelMatch is</h2>
      <p>
        PadelMatch helps padel players find other padel players of a similar level in their city or
        club, and organise casual matches. It is <b>not</b> a dating, romantic or friendship app, and
        it is <b>not</b> a court-booking service — you should book courts through Playtomic or your
        club as usual.
      </p>

      <h2 className="text-display text-2xl mt-6">2. Who can use PadelMatch</h2>
      <p>
        You must be <b>18 or older</b>. One account per person. You must provide accurate information
        about yourself, including a real first name and a recent photo of you (preferably playing
        padel). Impersonation, fake profiles and duplicate accounts are not allowed.
      </p>

      <h2 className="text-display text-2xl mt-6">3. How you behave on the app</h2>
      <p>
        No harassment, hate speech, threats, doxxing, scams, spam, sexual content, content involving
        minors, or impersonation. No commercial promotion, coaching sales, court rentals, prostitution
        or other paid services without our written permission. Treat every player the way you'd want
        to be treated on a court.
      </p>

      <h2 className="text-display text-2xl mt-6">4. Meeting in person</h2>
      <p>
        Matches should be played at public padel clubs, ideally booked through Playtomic or another
        legitimate court-booking service so the meeting is at a supervised venue. PadelMatch is a
        discovery and chat platform — <b>we are not responsible for what happens off-platform</b>.
        Meet in public, tell a friend, and trust your instincts. If a match is at a private or
        residential court, hosts must flag it as "Private" so other players know before joining.
      </p>

      <h2 className="text-display text-2xl mt-6">5. Reports, suspensions and bans</h2>
      <p>
        One credible report leads to an automatic suspension while our team reviews the case.
        Repeated no-shows on booked matches lead to automatic suspension. Confirmed bad-faith
        behaviour leads to a permanent ban. Because the app is free there is no refund.
      </p>

      <h2 className="text-display text-2xl mt-6">6. Your content and privacy</h2>
      <p>
        You keep ownership of your photos, bio and messages. You grant Moorish Arches S.L. a limited,
        non-exclusive licence to display them inside the app for the sole purpose of running the
        service. <b>We do not read your private messages or your personality Q&amp;A answers</b> — the
        only exception is when you or the other party report a specific conversation for abuse, or if
        we receive a lawful request from an authority. See our{" "}
        <Link to="/privacy" className="underline">Privacy Policy</Link> for the full detail.
      </p>

      <h2 className="text-display text-2xl mt-6">7. Account deletion</h2>
      <p>
        You can delete your account at any time from the Profile screen. Deletion is permanent and
        removes your profile, matches, messages and Q&amp;A answers within 30 days. Safety records
        (reports against you) may be kept for up to 12 months to prevent immediate re-registration
        after a ban.
      </p>

      <h2 className="text-display text-2xl mt-6">8. No guarantees</h2>
      <p>
        We don't guarantee that you'll find matches, that other players will show up, or that anyone
        you meet is who they say they are. The service is provided "as is" without warranties, to the
        extent allowed by Spanish and EU consumer law.
      </p>

      <h2 className="text-display text-2xl mt-6">9. Liability</h2>
      <p>
        To the maximum extent permitted by law, Moorish Arches S.L. is not liable for indirect or
        consequential losses arising from your use of the app or from meetings arranged through it.
        Nothing in these terms excludes liability that cannot be excluded under Spanish law
        (including gross negligence and wilful misconduct).
      </p>

      <h2 className="text-display text-2xl mt-6">10. Changes</h2>
      <p>
        We may update these terms. If we make material changes we'll notify you inside the app before
        the changes take effect.
      </p>

      <h2 className="text-display text-2xl mt-6">11. Governing law</h2>
      <p>
        These terms are governed by the laws of <b>Spain</b>. Any dispute will be submitted to the
        competent courts of <b>Madrid</b>, without prejudice to any mandatory consumer-protection
        rights you have in your country of residence.
      </p>

      <h2 className="text-display text-2xl mt-6">12. Contact</h2>
      <p>
        Moorish Arches S.L. — for questions or to exercise your privacy rights, contact us via the
        "Make this app better" box on your Profile screen.
      </p>

      <div className="pt-6 text-sm">
        <Link to="/privacy" className="underline">Privacy Policy →</Link>
      </div>
    </main>
  );
}
