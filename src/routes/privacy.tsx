import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · PadelMatch" },
      { name: "description", content: "How PadelMatch collects, stores and protects your data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 text-[var(--cream)]/90 space-y-4">
      <Link to="/" className="text-xs uppercase tracking-widest text-[var(--cream)]/60">← Home</Link>
      <h1 className="text-display text-4xl">Privacy Policy</h1>
      <p className="text-sm text-[var(--cream)]/60">Last updated: {new Date().toLocaleDateString()}</p>

      <p>This page is maintained by the PadelMatch team to answer the most common questions about your data. It is not a legal certification.</p>

      <h2 className="text-display text-2xl mt-6">What we collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Account info: email, hashed password (or Google sign-in identifier).</li>
        <li>Profile info you enter: first name, age, gender, locations, languages, padel level, photo, bio, ranked traits, availability windows, court side preference.</li>
        <li>Activity: who you liked, who you matched with, messages you send, reports and blocks, feedback you submit.</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">What we do NOT collect</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Your last name (unless you choose to include it).</li>
        <li>Payment data — the app is currently free.</li>
        <li>Precise GPS location. You type your cities/areas yourself.</li>
      </ul>

      <h2 className="text-display text-2xl mt-6">Who can see what</h2>
      <p>Your <b>first name, photo, age, gender, level, locations, languages, bio, ranked traits and availability</b> are visible to other signed-in players whose profile is compatible with yours. Your <b>"looking for" choice, audience preferences, age range, blocks, reports and feedback</b> are private and never shown to other users.</p>

      <h2 className="text-display text-2xl mt-6">Where data is stored</h2>
      <p>Data is stored on Lovable Cloud (built on Supabase) inside the EU. Access is protected by row-level security: only you can read or modify your private data; other users only see the public fields above.</p>

      <h2 className="text-display text-2xl mt-6">Cookies</h2>
      <p>We use a small number of essential cookies and localStorage entries to keep you signed in and remember your language. No third-party analytics or advertising trackers.</p>

      <h2 className="text-display text-2xl mt-6">Your rights (GDPR)</h2>
      <p>You can access, correct, export and delete your data at any time. Deletion is one tap on the Profile screen and is permanent.</p>

      <h2 className="text-display text-2xl mt-6">Contact</h2>
      <p>Privacy requests: use the "Make this app better" box on your Profile screen with the word "Privacy" in your message.</p>

      <div className="pt-6 text-sm">
        <Link to="/terms" className="underline">← Terms of Service</Link>
      </div>
    </main>
  );
}
