import { courtViewFor } from "@/lib/court-view";

type Props = {
  /** Stable player id, so each player keeps the same drawing. */
  seed: string | null | undefined;
  name: string | null | undefined;
  className?: string;
  letterClassName?: string;
  role?: "img";
};

// Card artwork shown when a player has no photo: a fine court-view drawing
// tinted to the card paper, with the player's initial set over it.
export function CourtViewCard({ seed, name, className = "", letterClassName = "text-6xl", role }: Props) {
  return (
    <div
      role={role}
      aria-label={role ? name ?? undefined : undefined}
      className={`${className} ${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} overflow-hidden bg-[var(--paper-2)]`}
    >
      <img
        src={courtViewFor(seed)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={480}
        height={640}
        className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-80"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center text-serif ${letterClassName} text-[var(--ink)]/45 [text-shadow:0_0_18px_var(--paper-2),0_0_6px_var(--paper-2)]`}
      >
        {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
