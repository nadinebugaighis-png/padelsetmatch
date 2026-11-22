import { UserCheck } from "lucide-react";

/**
 * A place already taken by a friend who isn't on the app (the host's
 * "extra confirmed" players). Solid and calm, so it never reads like the
 * dashed "+" of a place that still needs a player.
 */
export function FriendSlot({ size = "sm", label }: { size?: "sm" | "md" | "lg" | "xl"; label: string }) {
  const box = size === "xl" ? "w-[46px] h-[46px]" : size === "lg" ? "w-11 h-11" : size === "md" ? "w-9 h-9" : "w-7 h-7";
  const icon = size === "xl" ? "w-[18px] h-[18px]" : size === "lg" ? "w-[18px] h-[18px]" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div
      title={label}
      aria-label={label}
      role="img"
      className={`${box} shrink-0 rounded-full border border-[var(--ink)]/10 bg-[var(--paper-2)] text-[var(--ink)]/55 grid place-items-center`}
    >
      <UserCheck className={icon} strokeWidth={1.5} />
    </div>
  );
}
