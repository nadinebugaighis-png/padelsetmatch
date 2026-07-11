type Props = { className?: string; strokeWidth?: number };

/** Minimal padel-court line drawing (top-down view). */
export function CourtIcon({ className, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      viewBox="0 0 32 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {/* outer court */}
      <rect x="1" y="1" width="30" height="16" />
      {/* service side walls */}
      <line x1="6" y1="1" x2="6" y2="17" />
      <line x1="26" y1="1" x2="26" y2="17" />
      {/* net */}
      <line x1="16" y1="1" x2="16" y2="17" />
      {/* service line */}
      <line x1="6" y1="9" x2="26" y2="9" />
    </svg>
  );
}

export default CourtIcon;
