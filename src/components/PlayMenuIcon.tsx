import type { SVGProps } from "react";

/**
 * Padel "Play" tab icon — tilted teardrop racket with a wrapped grip
 * handle at the bottom-left and a seamed tennis ball at the bottom-right,
 * mirroring the classic padel logo composition.
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
      <g transform="rotate(-22 12 12)">
        {/* Racket head + neck + handle silhouette */}
        <path d="M12 1.5c-3.7 0-6.7 3-6.7 7 0 3.35 2.2 6.2 5.2 6.85l-.35 1.5c-.1.4.05.8.4 1l.7.4-1.1 3.5c-.15.5.15 1 .65 1.1l1.6.35c.5.1 1-.2 1.1-.7l.85-3.6.75-.25c.35-.15.55-.55.45-.95l-.35-1.4c3-.65 5.2-3.5 5.2-6.85 0-4-3-7-6.7-7Z" />
        {/* Perforation dots on the head (subtractive) */}
        <g fill="var(--surface, #0f1a1a)">
          <circle cx="9.6" cy="5.2" r="0.55" />
          <circle cx="12" cy="4.7" r="0.55" />
          <circle cx="14.4" cy="5.2" r="0.55" />
          <circle cx="8.6" cy="7.3" r="0.55" />
          <circle cx="11" cy="7" r="0.55" />
          <circle cx="13.4" cy="7" r="0.55" />
          <circle cx="15.4" cy="7.3" r="0.55" />
          <circle cx="9.4" cy="9.3" r="0.55" />
          <circle cx="12" cy="9.1" r="0.55" />
          <circle cx="14.6" cy="9.3" r="0.55" />
          <circle cx="10.6" cy="11.3" r="0.55" />
          <circle cx="13.4" cy="11.3" r="0.55" />
        </g>
        {/* Grip wrap stripes on the handle */}
        <g stroke="var(--surface, #0f1a1a)" strokeWidth={0.45} strokeLinecap="round" fill="none">
          <path d="M11.15 18.7 12.9 19.1" />
          <path d="M10.95 19.6 12.7 20" />
          <path d="M10.75 20.5 12.5 20.9" />
        </g>
      </g>
      {/* Tennis ball at bottom-right with equator seam */}
      <circle cx="18.5" cy="18.5" r="3.3" />
      <path
        d="M15.3 18.5c1.9-1.15 4.5-1.15 6.4 0"
        fill="none"
        stroke="var(--surface, #0f1a1a)"
        strokeWidth={0.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default PlayMenuIcon;
