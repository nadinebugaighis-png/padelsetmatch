import court from "@/assets/landing-court.jpg.asset.json";

/** The court photo that bleeds in from the right on the entrance screens. */
export function EntranceBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%] sm:w-[52%] lg:w-[46%] z-0" aria-hidden>
      <img src={court.url} alt="" className="w-full h-full object-cover object-left" />
      <div className="absolute inset-0 mix-blend-multiply" style={{ background: "rgba(87, 118, 90, 0.55)" }} />
      <div className="absolute inset-0 mix-blend-overlay" style={{ background: "rgba(60, 90, 65, 0.25)" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, var(--paper) 0%, color-mix(in oklab, var(--paper) 85%, transparent) 12%, transparent 40%)",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_80%,var(--paper)_95%)] sm:bg-[linear-gradient(to_right,transparent_60%,var(--paper)_75%)] lg:bg-[linear-gradient(to_right,transparent_38%,var(--paper)_50%)]" />
    </div>
  );
}
