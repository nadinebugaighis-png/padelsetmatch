import type { SVGProps } from "react";

/**
 * Padel "Play" tab icon — filled silhouette of a padel racket with
 * perforated dots on the head plus a small ball resting beside the
 * handle, echoing the classic padel logo look.
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
      {/* Racket silhouette (head + neck + handle) */}
      <path
        d="M9.2 1.6c-3.4 0-6.2 2.9-6.2 6.6 0 3.3 2.2 6 5.1 6.5l-.35 1.55a1.2 1.2 0 0 0 .3 1.1l1.6 1.6a1.2 1.2 0 0 0 1.7 0l.9-.9a1.2 1.2 0 0 0 0-1.7l-1.1-1.1.35-.55c3-.4 5.4-3.15 5.4-6.5 0-3.7-2.8-6.6-6.2-6.6Z"
      />
      {/* Perforation dots on the racket head (knocked out) */}
      <g fill="var(--surface, #111)">
        <circle cx="7" cy="5.6" r="0.55" />
        <circle cx="9.2" cy="5" r="0.55" />
        <circle cx="11.4" cy="5.6" r="0.55" />
        <circle cx="6.2" cy="7.8" r="0.55" />
        <circle cx="8.4" cy="7.4" r="0.55" />
        <circle cx="10.6" cy="7.4" r="0.55" />
        <circle cx="12.4" cy="7.8" r="0.55" />
        <circle cx="7" cy="9.8" r="0.55" />
        <circle cx="9.2" cy="9.6" r="0.55" />
        <circle cx="11.4" cy="9.8" r="0.55" />
        <circle cx="8.2" cy="11.6" r="0.55" />
        <circle cx="10.4" cy="11.6" r="0.55" />
      </g>
      {/* Padel ball beside the handle */}
      <circle cx="17.6" cy="18.4" r="3.2" />
      <path
        d="M15.1 17.1a3.2 3.2 0 0 1 5 0M15.1 19.7a3.2 3.2 0 0 0 5 0"
        fill="none"
        stroke="var(--surface, #111)"
        strokeWidth={0.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default PlayMenuIcon;
