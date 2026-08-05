import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · PadelSetMatch" },
      { name: "description", content: "How PadelMatch collects, stores and protects your data." },
      { property: "og:title", content: "Privacy Policy · PadelSetMatch" },
      { property: "og:description", content: "How PadelMatch collects, stores and protects your data." },
      { property: "og:url", content: "https://padelsetmatch.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://padelsetmatch.com/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="bg-[var(--paper)] min-h-screen max-w-2xl mx-auto px-6 py-10 text-[var(--ink)]/90 space-y-4">
      <Link to="/" className="text-xs uppercase tracking-widest text-[var(--ink)]/60">← Home</Link>
      <h1 className="text-display text-4xl">Privacy Policy</h1>
      <p className="text-sm text-[var(--ink)]/60">Last updated: {new Date().toLocaleDateString()}</p>

      <p>
        PadelMatch is a padel player directory operated by <b>Moorish Arches S.L.</b> (Madrid, Spain).
        This page explains what data we collect, how we use it, and the rights you have under the EU
        General Data Protection Regulation (GDPR) and Spanish data protection law (LOPDGDD).
      </p>

      <h2 className="text-display text-2xl mt-6">1. Data controller</h2>
      <p>
        Moorish Arches S.L. is the data controller. For any privacy request you can contact us via
        the "Make this app better" box on your Profile screen with the word "Privacy" in your message.
      </p>

      <h2 className="text-display text-2xl mt-6">2. What we collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><b>Account:</b> email, hashed password (or Google sign-in identifier).</li>
        <li><b>Profile you enter:</b> first name, age bracket, gender, cities/clubs you play at, languages, padel level, photo, short bio, ranked traits and availability windows.</li>
        <li><b>Activity needed to run the service:</b> matches you host or join, invites, ratings, reports and blocks.</li>
        <li><b>Messages you send</b> to other players inside the app (stored so the chat works — see §5).</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">3. What we do NOT collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Your last name (unless you choose to type it).</li>
        <li>Payment data — the app is currently free.</li>
        <li>Precise GPS location. You type your cities/clubs yourself.</li>
        <li>Advertising identifiers or third-party analytics tracking.</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">4. Who can see what</h2>
      <p>
        Your <b>first name, photo, age bracket, gender, level, cities/clubs, languages, bio, ranked
        traits and availability</b> are visible to other signed-in padel players — this is what makes
        the directory work. Your <b>email, exact age, blocks, reports, personality Q&amp;A answers and
        feedback</b> are private and never shown to other users.
      </p>

      <h2 className="text-display text-2xl mt-6">5. Your messages and personality answers</h2>
      <p>
        <b>We do not read your private messages or your personality Q&amp;A answers.</b> We are not
        interested in the content of your conversations — it's yours.
      </p>
      <p>
        Messages are stored on our servers, encrypted at rest, for one reason: so the chat feature
        works across devices and so we can respond if <b>you</b> report abuse. The only situations in
        which a human at Moorish Arches S.L. would ever open a specific conversation are:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>You (or the other party) file a report about that specific chat.</li>
        <li>We receive a lawful order from a Spanish or EU authority.</li>
      </ul>
      <p>
        We never use your messages or Q&amp;A answers to train AI models, to build advertising
        profiles, or to share with third parties. This is the same model used by WhatsApp Business,
        Meetup and Playtomic chat.
      </p>

      <h2 className="text-display text-2xl mt-6">6. Legal bases (GDPR Art. 6)</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><b>Contract (Art. 6.1.b):</b> creating your account, storing your profile, running matches and chat.</li>
        <li><b>Legitimate interest (Art. 6.1.f):</b> preventing abuse, no-shows, spam and fraud.</li>
        <li><b>Consent (Art. 6.1.a):</b> optional push notifications; you can revoke any time.</li>
        <li><b>Legal obligation (Art. 6.1.c):</b> responding to lawful requests from authorities.</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">7. How long we keep data</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li><b>Profile &amp; messages:</b> as long as your account exists. When you delete your account they are permanently erased within 30 days (the delay covers backup rotation).</li>
        <li><b>Reports &amp; safety records:</b> up to 12 months after account deletion, so a banned user can't simply re-register.</li>
        <li><b>Server logs:</b> up to 30 days for security and debugging.</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">8. Where data is stored — subprocessors</h2>
      <p>Data is stored inside the European Union with the following subprocessors:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><b>Lovable Cloud</b> (built on Supabase) — hosting, database, authentication, storage (EU region).</li>
        <li><b>Google</b> — only if you choose "Sign in with Google" (verifies your Google identity).</li>
      </ul>
      <p>
        Access inside the database is protected by row-level security: only you can read or modify
        your private data; other players only see the public fields listed in §4.
      </p>

      <h2 className="text-display text-2xl mt-6">9. Cookies</h2>
      <p>
        We use a small number of <b>essential</b> cookies and localStorage entries to keep you signed
        in and to remember your language preference. We do not use advertising cookies, cross-site
        trackers or third-party analytics.
      </p>

      <h2 className="text-display text-2xl mt-6">10. Your rights (GDPR)</h2>
      <p>
        You have the right to access, rectify, export, restrict, object to and delete your data, and
        to withdraw consent at any time. Account deletion is one tap on the Profile screen and is
        permanent. You also have the right to lodge a complaint with the Spanish Data Protection
        Agency (AEPD, <a className="underline" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>

      <h2 className="text-display text-2xl mt-6">11. Age</h2>
      <p>
        PadelMatch is for players aged <b>18 or older</b>. We do not knowingly collect data from
        minors. If you believe a minor has created an account, please report the profile inside the
        app and we will remove it.
      </p>

      <h2 className="text-display text-2xl mt-6">12. Changes to this policy</h2>
      <p>
        If we make material changes we will notify you inside the app before the changes take effect.
      </p>

      <div className="pt-6 text-sm">
        <Link to="/terms" className="underline">← Terms of Service</Link>
      </div>
    </main>
  );
}
