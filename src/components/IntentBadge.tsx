// (i18n import removed — component is now a no-op)

export function deriveIntentsFromProfile(p: {
  intents?: string[] | null;
  looking_for?: string | null;
}): string[] {
  if (p.intents && p.intents.length > 0) return p.intents;
  switch (p.looking_for) {
    case "partner":
      return ["relationship", "padel"];
    case "friend":
      return ["friend", "padel"];
    case "both":
      return ["relationship", "friend", "padel"];
    default:
      return ["padel"];
  }
}

export function IntentBadges(_props: {
  intents?: string[] | null;
  looking_for?: string | null;
  compact?: boolean;
}) {
  // Intent badges hidden — the app treats everyone as a padel player.
  return null;
}
