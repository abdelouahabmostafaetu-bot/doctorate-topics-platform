"use client"

/**
 * ☕ CoffeeCup — animated SVG logo (no images, no libraries)
 * - size="sm"  → for the navbar / top of page
 * - size="lg"  → hero
 * - mono       → elegant black & white version
 * Respects prefers-reduced-motion.
 */
export default function CoffeeCup({
  size = "lg",
  mono = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg"
  mono?: boolean
  className?: string
}) {
  const w = size === "sm" ? 34 : size === "md" ? 60 : 96
  const uid = mono ? "m" : "c"

  return (
    <svg
      className={`dm-cup ${className}`}
      style={{ width: w }}
      viewBox="0 0 120 132"
      role="img"
      aria-label="فنجان قهوة"
    >
      <defs>
        <linearGradient id={`porc-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFDF8" />
          <stop offset="1" stopColor={mono ? "#BFBFBF" : "#D8D3C8"} />
        </linearGradient>
        <linearGradient id={`brew-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mono ? "#4A4A4A" : "#8A5A2B"} />
          <stop offset="1" stopColor={mono ? "#141414" : "#4A2C14"} />
        </linearGradient>
        <radialGradient id={`halo-${uid}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={mono ? "#FFFFFF" : "#E9B872"} />
          <stop offset="1" stopColor={mono ? "#FFFFFF" : "#E9B872"} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* warm halo */}
      <ellipse className="dm-glow" cx="60" cy="70" rx="56" ry="46" fill={`url(#halo-${uid})`} opacity=".34" />

      {/* steam — three offset curls */}
      <path className="dm-steam dm-s1" d="M46 40c-6-7 5-11-1-18 5 4 8 9 6 14" />
      <path className="dm-steam dm-s2" d="M60 34c-7-8 6-13-1-21 6 5 9 11 7 17" />
      <path className="dm-steam dm-s3" d="M74 40c-6-7 5-11-1-18 5 4 8 9 6 14" />

      {/* handle */}
      <path
        d="M94 62h6a13 13 0 0 1 0 26h-9"
        fill="none"
        stroke={`url(#porc-${uid})`}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* body */}
      <path
        d="M26 56h68l-6 40a16 16 0 0 1-15.8 13.4H47.8A16 16 0 0 1 32 96Z"
        fill={`url(#porc-${uid})`}
      />

      {/* rim + liquid */}
      <ellipse cx="60" cy="57" rx="34" ry="7.6" fill="#F3EFE6" />
      <ellipse className="dm-brew" cx="60" cy="57.6" rx="29" ry="5.8" fill={`url(#brew-${uid})`} />
      <ellipse cx="53" cy="56.6" rx="7" ry="1.7" fill={mono ? "#8C8C8C" : "#C08A50"} opacity=".55" />

      {/* saucer + shadow */}
      <rect x="32" y="116" width="56" height="5" rx="2.5" fill="#EDE8DE" opacity=".9" />
      <ellipse cx="60" cy="124" rx="38" ry="5" fill="#000" opacity=".22" />
    </svg>
  )
}
