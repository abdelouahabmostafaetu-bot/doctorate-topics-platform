"use client"

import { useState } from "react"
import Markdown from "@/components/coffee/Markdown"
import { DIFFICULTY_LABEL, type InterestingProblem } from "@/lib/coffee/problems"

const STARS: Record<1 | 2 | 3, string> = {
	1: "★☆☆",
	2: "★★☆",
	3: "★★★",
}

/**
 * ✦ One interesting problem, built for reading:
 * statement first, hints revealed one by one, proof only on demand.
 */
export default function ProblemCard({ problem }: { problem: InterestingProblem }) {
	const [openHints, setOpenHints] = useState(0)
	const [showSolution, setShowSolution] = useState(false)

	return (
		<article className="ip-card">
			<div className="ip-card__top">
				<span className="ip-badge" dir="ltr">
					{problem.label}
				</span>
				<span className="ip-meta" dir="ltr">
					{problem.subject}
				</span>
				{problem.source && (
					<>
						<span className="ip-dot">•</span>
						<span className="ip-meta" dir="ltr">
							{problem.source}
						</span>
					</>
				)}
				<span className="ip-stars">
					{STARS[problem.difficulty]} {DIFFICULTY_LABEL[problem.difficulty]}
				</span>
			</div>

			<div className="ip-card__body">
				<div className="ip-statement">
					<Markdown dir="ltr">{problem.statement}</Markdown>
				</div>

				{problem.why && (
					<p className="ip-why">
						<span aria-hidden="true">✦</span>
						<span>{problem.why}</span>
					</p>
				)}

				{problem.tags.length > 0 && (
					<div className="ip-tags">
						{problem.tags.map((t) => (
							<span className="ip-tag" key={t}>
								{t}
							</span>
						))}
					</div>
				)}
			</div>

			<div className="ip-actions">
				{problem.hints.length > 0 && (
					<button
						className="ip-btn"
						disabled={openHints >= problem.hints.length}
						onClick={() => setOpenHints((n) => Math.min(n + 1, problem.hints.length))}
					>
						{openHints === 0
							? "تلميح"
							: openHints >= problem.hints.length
								? "لا مزيد من التلميحات"
								: "تلميح آخر"}
					</button>
				)}
				{openHints > 0 && (
					<button className="ip-btn" onClick={() => setOpenHints(0)}>
						إخفاء التلميحات
					</button>
				)}
				{problem.solution && (
					<button
						className="ip-btn ip-btn--primary"
						onClick={() => setShowSolution((s) => !s)}
					>
						{showSolution ? "إخفاء البرهان" : "إظهار البرهان"}
					</button>
				)}
			</div>

			{problem.hints.slice(0, openHints).map((h, i) => (
				<div className="ip-reveal" key={i}>
					<div className="ip-reveal__lbl">تلميح {i + 1}</div>
					<Markdown dir="rtl">{h}</Markdown>
				</div>
			))}

			{showSolution && problem.solution && (
				<div className="ip-solution">
					<div className="ip-reveal__lbl">Démonstration — البرهان</div>
					<Markdown dir="ltr">{problem.solution}</Markdown>
				</div>
			)}
		</article>
	)
}
