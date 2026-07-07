import { useI18n } from "@/lib/i18n";

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
              : intent === "relationship"
                ? t("disc.filter.relationship")
                : intent;
        return (
          <span
            key={intent}
            className={`inline-flex items-center rounded-full border border-foreground/20 bg-foreground/5 text-foreground ${compact ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5"} font-medium`}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}
