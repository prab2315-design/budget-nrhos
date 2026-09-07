/**
 * Simplified rendition of the Ministry of Public Health (กระทรวงสาธารณสุข)
 * emblem — a gold circular seal with the caduceus at its center.
 * Drawn inline so it inherits the app's Prompt font and stays crisp at any size.
 */
export function MophEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="ตราสัญลักษณ์กระทรวงสาธารณสุข"
      className={className}
    >
      <defs>
        <radialGradient id="mophGold" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#f7dc8f" />
          <stop offset="55%" stopColor="#e0b054" />
          <stop offset="100%" stopColor="#c1902f" />
        </radialGradient>
        <linearGradient id="mophSilver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aab2ba" />
          <stop offset="100%" stopColor="#5d666f" />
        </linearGradient>
        <linearGradient id="mophFlame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <path id="mophArcTop" d="M 20,100 A 80,80 0 0 1 180,100" fill="none" />
        <path
          id="mophArcBottom"
          d="M 24,100 A 76,76 0 0 0 176,100"
          fill="none"
        />
      </defs>

      {/* Gold seal */}
      <circle cx="100" cy="100" r="98" fill="url(#mophGold)" />
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="none"
        stroke="#8a6a25"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle
        cx="100"
        cy="100"
        r="64"
        fill="none"
        stroke="#8a6a25"
        strokeOpacity="0.3"
        strokeWidth="1.2"
      />

      {/* Ring text */}
      <text fontSize="13" fontWeight="600" fill="#4a3a12" letterSpacing="0.5">
        <textPath href="#mophArcTop" startOffset="50%" textAnchor="middle">
          กระทรวงสาธารณสุข
        </textPath>
      </text>
      <text fontSize="8" fontWeight="500" fill="#4a3a12" letterSpacing="1.8">
        <textPath href="#mophArcBottom" startOffset="50%" textAnchor="middle">
          MINISTRY OF PUBLIC HEALTH
        </textPath>
      </text>

      {/* Caduceus — wings */}
      <g fill="url(#mophSilver)">
        <path d="M97 76 C84 62 62 57 42 63 C55 67 61 71 64 77 C52 77 41 81 34 88 C47 88 57 90 65 94 C76 92 89 87 97 82 Z" />
        <path
          d="M97 84 C86 76 72 74 58 78 C68 81 73 84 76 89 C68 90 62 93 58 98 C68 96 76 97 82 100 C89 98 95 93 97 90 Z"
          fillOpacity="0.72"
        />
      </g>
      <g
        fill="url(#mophSilver)"
        transform="translate(200 0) scale(-1 1)"
      >
        <path d="M97 76 C84 62 62 57 42 63 C55 67 61 71 64 77 C52 77 41 81 34 88 C47 88 57 90 65 94 C76 92 89 87 97 82 Z" />
        <path
          d="M97 84 C86 76 72 74 58 78 C68 81 73 84 76 89 C68 90 62 93 58 98 C68 96 76 97 82 100 C89 98 95 93 97 90 Z"
          fillOpacity="0.72"
        />
      </g>

      {/* Caduceus — snakes wrapping the staff */}
      <path
        d="M100 82 C87 90 87 98 100 104 C113 110 113 118 100 126 C91 131 89 136 95 141"
        stroke="url(#mophSilver)"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M100 82 C113 90 113 98 100 104 C87 110 87 118 100 126 C109 131 111 136 105 141"
        stroke="url(#mophSilver)"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Staff */}
      <rect
        x="96.5"
        y="60"
        width="7"
        height="84"
        rx="3.5"
        fill="url(#mophSilver)"
      />

      {/* Flame */}
      <path
        d="M100 30 C106 39 110 45 108 53 C106.8 59 103.5 62 100 62 C96.5 62 93.2 59 92 53 C90 45 94 39 100 30 Z"
        fill="url(#mophFlame)"
      />
      <path
        d="M100 40 C103 45 104.5 48 103.5 52 C102.8 55 101.5 56.5 100 56.5 C98.5 56.5 97.2 55 96.5 52 C95.5 48 97 45 100 40 Z"
        fill="#fde68a"
        fillOpacity="0.9"
      />
    </svg>
  );
}
