"use client"

import { useMemo, useId } from "react"

/**
 * 💜 HeartGraph — a heart drawn as a real parametric curve on graph paper.
 *   x = 16 sin³t
 *   y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t
 * Used decoratively at the top-left and top-right of the coffee page.
 * The stroke animates as if being plotted (draw-on effect).
 */
export default function HeartGraph({
  side = "left",
  from = "#F08A9B",
  to = "#B79BE8",
  caption,
  width = 118,
}: {
  side?: "left" | "right"
  from?: string
  to?: string
  caption?: string
  width?: number
}) {
  const id = useId().replace(/:/g, "")

  const d = useMemo(() => {
    const pts: string[] = []
    const STEPS = 240
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * Math.PI * 2
      const x = 16 * Math.sin(t) ** 3
      const y =
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      pts.push(`${(60 + x * 2.05).toFixed(2)},${(48 - y * 2.05).toFixed(2)}`)
    }
    return `M${pts.join("L")}Z`
  }, [])

  return (
    <figure className={`dm-heart dm-heart--${side}`} style={{ width }} aria-hidden="true">
      <svg viewBox="0 0 120 100" width={width}>
        <defs>
          <pattern id={`grid-${id}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M12 0H0V12" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
          </pattern>
          <linearGradient id={`ink-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>

        <rect width="120" height="96" rx="8" fill={`url(#grid-${id})`} />
        <line x1="60" y1="6" x2="60" y2="90" stroke="rgba(255,255,255,.16)" />
        <line x1="8" y1="48" x2="112" y2="48" stroke="rgba(255,255,255,.16)" />

        <path
          className="dm-heart__path"
          d={d}
          fill="none"
          stroke={`url(#ink-${id})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
