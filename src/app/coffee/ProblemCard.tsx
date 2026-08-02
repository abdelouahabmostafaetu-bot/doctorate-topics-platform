"use client"

import Markdown from "@/components/coffee/Markdown"
import type { InterestingProblem } from "@/lib/coffee/problems"

/**
 * The problem itself — nothing else.
 * No frame, no badges, no hints, no solution: just the statement,
 * typeset to be read.
 */
export default function ProblemCard({ problem }: { problem: InterestingProblem }) {
	return (
		<article className="ip-problem">
			<Markdown dir="ltr" className="ip-md--statement">
				{problem.statement}
			</Markdown>
		</article>
	)
}
