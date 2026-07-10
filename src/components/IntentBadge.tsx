import { useI18n } from "@/lib/i18n";

export function deriveIntentsFromProfile(p: {
  intents?: string[] | null;
  looking_for?: string | null;
}): string[] {
  // Drop legacy "relationship" values — the app no longer exposes that intent.
  if (p.intents && p.intents.length > 0) {
    const cleaned = p.intents.filter((i) => i !== "relationship");
    if (cleaned.length > 0) return cleaned;
  }
  switch (p.looking_for) {
    case "friend":
    case "both":
      return ["friend", "padel"];
    default:
      return ["padel"];
  }
}

export function IntentBadges({
  intents,
  looking_for,
  compact = false,
}: {
  intents?: string[] | null;
  looking_for?: string | null;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const derived = deriveIntentsFromProfile({ intents, looking_for });
  if (derived.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {derived.map((intent) => {
        const label =
          intent === "padel"
            ? t("disc.filter.padel")
            : intent === "friend"
              ? t("disc.filter.friend")
              : intent;
        return (
          <span
            key={intent}
            className={`inline-flex items-center rounded-full border border-[var(--cream)]/20 bg-[var(--cream)]/10 text-[var(--cream)] ${compact ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5"} font-medium`}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}
