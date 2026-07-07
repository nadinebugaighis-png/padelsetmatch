import type { SVGProps } from "react";

/**
 * Padel "Play" tab icon — teardrop padel racket silhouette with
 * perforation dots on the head and a tennis ball resting at its base.
 */
export function PlayMenuIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Racket: teardrop head + neck + handle as one silhouette */}
      <path
        d="M10 1.2c-3.6 0-6.5 3-6.5 6.9 0 3.3 2.1 6.1 5 6.75l-.55 1.9c-.15.5.05 1.05.5 1.35l1.3.85c.55.35 1.3.2 1.65-.35l.9-1.4c.3-.45.25-1.05-.1-1.45l-1.05-1.2.4-1.7c2.9-.65 4.95-3.45 4.95-6.75 0-3.9-2.9-6.9-6.5-6.9Z"
      />
      {/* Perforation dots (subtractive) */}
      <g fill="var(--surface, #0f1a1a)">
        <circle cx="7.6" cy="5.4" r="0.6" />
        <circle cx="10" cy="4.9" r="0.6" />
        <circle cx="12.4" cy="5.4" r="0.6" />
        <circle cx="6.6" cy="7.6" r="0.6" />
        <circle cx="9" cy="7.3" r="0.6" />
        <circle cx="11.4" cy="7.3" r="0.6" />
        <circle cx="13.2" cy="7.6" r="0.6" />
        <circle cx="7.4" cy="9.7" r="0.6" />
        <circle cx="10" cy="9.5" r="0.6" />
        <circle cx="12.6" cy="9.7" r="0.6" />
        <circle cx="8.6" cy="11.7" r="0.6" />
        <circle cx="11.4" cy="11.7" r="0.6" />
      </g>
      {/* Tennis ball beside the racket base */}
      <circle cx="18.5" cy="18" r="3.4" />
      <path
        d="M15.6 16.4c1.7 1.05 4.1 1.05 5.8 0M15.6 19.6c1.7-1.05 4.1-1.05 5.8 0"
        fill="none"
        stroke="var(--surface, #0f1a1a)"
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default PlayMenuIcon;
