"use client"

import { useState } from "react"
import { TexBlock } from "@/components/coffee/Tex"
import type { DailyDrop } from "@/lib/coffee/types"

/**
 * ☕ مسألة اليوم — the statement is English + LaTeX (LTR),
 * the hints are Arabic (RTL). Hints unlock progressively.
 */
export default function ProblemCard({
  problem,
  dateLabel,
  difficultyLabel,
}: {
  problem: DailyDrop["problem"]
  dateLabel: string
  difficultyLabel: string
}) {
  const [h1, setH1] = useState(false)
  const [h2, setH2] = useState(false)
  const [sol, setSol] = useState(false)

  return (
    <section className="dm-card">
      <div className="dm-chead">
        <span className="dm-dot" style={{ background: "var(--dm-gold)" }} />
        <h2>مسألةُ اليوم</h2>
        <span className="dm-meta">
          {problem.source} · {problem.subject}
        </span>
      </div>

      <p className="dm-sub">{dateLabel} — التمرين بالإنجليزية، والتلاميح بالعربية.</p>

      <div className="dm-mathbox">
        <div className="dm-mathbox__lbl">Exercise of the day</div>
        <TexBlock source={problem.statement} dir="ltr" />
      </div>

      <div className="dm-actions">
        {problem.hint1 && (
          <button className="dm-btn" aria-pressed={h1} onClick={() => setH1(true)}>
            💡 تلميح أول
          </button>
        )}
        {problem.hint2 && (
          <button
            className="dm-btn"
            aria-pressed={h2}
            disabled={!h1}
            title={!h1 ? "افتح التلميح الأول أولاً" : undefined}
            onClick={() => setH2(true)}
          >
            💡 فكرة البرهان
          </button>
        )}
        {problem.solution && (
          <button className="dm-btn dm-btn--pri" onClick={() => setSol((s) => !s)}>
            {sol ? "✖ أخفِ الحل" : "✅ أظهر الحل"}
          </button>
        )}
        <span className="dm-chip" style={{ marginInlineStart: "auto" }}>
          {difficultyLabel}
        </span>
      </div>

      {h1 && problem.hint1 && (
        <div className="dm-reveal">
          <TexBlock source={problem.hint1} dir="rtl" />
        </div>
      )}
      {h2 && problem.hint2 && (
        <div className="dm-reveal">
          <TexBlock source={problem.hint2} dir="rtl" />
        </div>
      )}
      {sol && problem.solution && (
        <div className="dm-mathbox" style={{ marginTop: 14 }}>
          <div className="dm-mathbox__lbl">Solution</div>
          <TexBlock source={problem.solution} dir="ltr" />
        </div>
      )}
    </section>
  )
}
