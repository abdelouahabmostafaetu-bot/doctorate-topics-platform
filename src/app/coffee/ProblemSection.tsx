"use client"

import { useState } from "react"
import { TexBlock } from "@/components/coffee/Tex"
import type { DailyDrop } from "@/lib/coffee/types"
import { DIFFICULTY_LABEL } from "@/lib/coffee/types"

/**
 * ☕ مسألة اليوم — editorial section (no card).
 * Statement: English + LaTeX, LTR, lightly framed so long formulas scroll inside.
 * Hints: Arabic, revealed progressively as hairline blocks.
 */
export default function ProblemSection({
  problem,
  dateLabel,
}: {
  problem: DailyDrop["problem"]
  dateLabel: string
}) {
  const [h1, setH1] = useState(false)
  const [h2, setH2] = useState(false)
  const [sol, setSol] = useState(false)

  return (
    <section className="dm-sec">
      <div className="dm-lbl" style={{ ["--dm-accent" as any]: "var(--dm-gold)" }}>
        <h2>مسألةُ اليوم</h2>
        <span className="dm-lbl__en">Problem</span>
      </div>

      <p className="dm-src">
        <b>{problem.source}</b> · {problem.subject} · <span dir="rtl">{dateLabel}</span>
      </p>

      <div className="dm-mathbox">
        <TexBlock source={problem.statement} dir="ltr" />
      </div>

      <div className="dm-actions">
        {problem.hint1 && (
          <button className="dm-btn" aria-pressed={h1} onClick={() => setH1(true)}>
            تلميح أول
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
            فكرة البرهان
          </button>
        )}
        {problem.solution && (
          <button className="dm-btn dm-btn--pri" onClick={() => setSol((s) => !s)}>
            {sol ? "أخفِ الحل" : "أظهر الحل"}
          </button>
        )}
        <span className="dm-diff">{DIFFICULTY_LABEL[problem.difficulty]}</span>
      </div>

      {h1 && problem.hint1 && (
        <div className="dm-hint">
          <TexBlock source={problem.hint1} dir="rtl" />
        </div>
      )}
      {h2 && problem.hint2 && (
        <div className="dm-hint">
          <TexBlock source={problem.hint2} dir="rtl" />
        </div>
      )}
      {sol && problem.solution && (
        <div className="dm-mathbox" style={{ marginTop: 16 }}>
          <div className="dm-mathbox__lbl">Solution</div>
          <TexBlock source={problem.solution} dir="ltr" />
        </div>
      )}
    </section>
  )
}
