import { UserCheck } from "lucide-react";

/**
 * A place already taken by a friend who isn't on the app (the host's
 * "extra confirmed" players). Solid and calm, so it never reads like the
 * dashed "+" of a place that still needs a player.
 */
export function FriendSlot({ size = "sm", label }: { size?: "sm" | "md"; label: string }) {
  const box = size === "md" ? "w-9 h-9" : "w-7 h-7";
  const icon = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div
      title={label}
      aria-label={label}
      role="img"
      className={`${box} shrink-0 rounded-full border-2 border-white shadow bg-[var(--grass)]/45 text-[var(--ink)] grid place-items-center`}
    >
      <UserCheck className={icon} strokeWidth={2} />
    </div>
  );
}
