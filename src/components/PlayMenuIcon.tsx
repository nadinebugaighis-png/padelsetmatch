import type { SVGProps } from "react";

/**
 * Padel "Play" tab icon — tilted teardrop racket with a long handle,
 * perforated head, and a seamed tennis ball at the bottom-right.
 * Composed from geometric primitives inside a mask so the perforations
 * and grip lines always align with the head/handle.
 */
export function PlayMenuIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  const bg = "var(--surface, #0f1a1a)";
  // Perforation dot grid (in the racket's un-rotated local frame,
  // head centered around cx=12, cy=8, rx=5.2, ry=6).
  const dots: [number, number][] = [
    [10, 4], [12, 3.6], [14, 4],
    [9, 5.8], [11, 5.4], [13, 5.4], [15, 5.8],
    [9, 7.6], [11, 7.4], [13, 7.4], [15, 7.6],
    [10, 9.4], [12, 9.4], [14, 9.4],
    [11, 11.2], [13, 11.2],
  ];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <defs>
        <mask id="racket-mask" maskUnits="userSpaceOnUse">
          {/* Everything white = visible */}
          <rect width="24" height="24" fill="white" />
          {/* Punch out perforation dots */}
          <g transform="rotate(18 12 8)">
            {dots.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={0.55} fill="black" />
            ))}
          </g>
          {/* Punch out grip stripes on the handle */}
          <g
            transform="rotate(18 12 8)"
            stroke="black"
            strokeWidth={0.45}
            strokeLinecap="round"
          >
            <line x1="10.8" y1="17.8" x2="13.2" y2="17.8" />
            <line x1="10.8" y1="18.8" x2="13.2" y2="18.8" />
            <line x1="10.8" y1="19.8" x2="13.2" y2="19.8" />
            <line x1="10.8" y1="20.8" x2="13.2" y2="20.8" />
          </g>
        </mask>
      </defs>

      <g mask="url(#racket-mask)">
        {/* Racket head + handle, tilted +18° so handle runs to bottom-left. */}
        <g transform="rotate(18 12 8)">
          <ellipse cx="12" cy="7.5" rx="5.2" ry="6" />
          {/* Neck bridging head bottom to handle */}
          <path d="M9.6 12.4 L14.4 12.4 L13.2 15 L10.8 15 Z" />
          {/* Handle */}
          <rect x="10.8" y="14.5" width="2.4" height="7" rx="0.6" />
        </g>
      </g>

      {/* Tennis ball with single equator seam */}
      <circle cx="18.6" cy="19" r="3" />
      <path
        d="M15.7 19c1.7-1 4.1-1 5.8 0"
        fill="none"
        stroke={bg}
        strokeWidth={0.65}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default PlayMenuIcon;
