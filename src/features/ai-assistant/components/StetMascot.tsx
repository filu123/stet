interface StetMascotProps {
  className?: string;
}

/**
 * Squibble — Stet's AI pal: a round paper-headed character in cool sunglasses,
 * with a dog-eared page corner tucked at the top-left. The face is
 * `currentColor` (white on the accent button); glasses and smile use the accent
 * so they read as dark features on the light face.
 */
export function StetMascot({ className }: StetMascotProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Folded-paper flap, then the head on top so they share one silhouette */}
      <path d="M4.8 9 V4.8 L6.9 2.7 H11.6 V9 Z" fill="currentColor" />
      <circle cx="12" cy="13.6" r="7.3" fill="currentColor" />

      {/* Dog-ear fold */}
      <path
        d="M4.8 4.8 H6.9 V2.7"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Rounded aviator sunglasses */}
      <g fill="var(--accent)">
        <rect x="7.1" y="11.2" width="4" height="3.4" rx="1.7" />
        <rect x="12.9" y="11.2" width="4" height="3.4" rx="1.7" />
        <rect x="10.9" y="11.9" width="2.2" height="0.8" rx="0.4" />
      </g>
      <path
        d="M7.1 12 L5.6 11.5 M16.9 12 L18.4 11.5"
        stroke="var(--accent)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />

      {/* Smile */}
      <path
        d="M9.5 17 Q 12 19, 14.5 17"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
