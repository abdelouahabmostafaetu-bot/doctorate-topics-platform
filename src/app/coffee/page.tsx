import type { Metadata } from "next"
import { auth } from "@/auth"
import { allProblems, getProblem } from "@/lib/coffee/problems"
import ProblemCard from "./ProblemCard"
import Comments, { type CurrentUser } from "./Comments"
import "./problems.css"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
	title: "مسائل ممتعة",
	description: "مسألة رياضية مختارة، ونقاش مفتوح بصيغة Markdown و LaTeX.",
}

export default async function CoffeePage({
	searchParams,
}: {
	searchParams: Promise<{ p?: string }>
}) {
	const sp = await searchParams
	const problem = getProblem(sp?.p)
	const problems = allProblems()

	let user: CurrentUser = null
	try {
		const session: any = await auth()
		if (session?.user) {
			const role = session.user.role
			user = {
				id: String(session.user.id ?? session.user.email ?? ""),
				name: session.user.name ?? "مستخدم",
				image: session.user.image ?? null,
				isAdmin: role === "ADMIN" || role === "SUPER_ADMIN",
			}
		}
	} catch {
		user = null
	}

	return (
		<div className="ip-root">
			<div className="ip-wrap">
				<h1 className="ip-title">مسائل ممتعة</h1>

				<ProblemCard problem={problem} />

				<Comments slug={problem.slug} user={user} />

				{problems.length > 1 && (
					<nav className="ip-archive">
						{problems.map((p) => (
							<a
								key={p.slug}
								href={`/coffee?p=${p.slug}`}
								className="ip-archive__item"
								aria-current={p.slug === problem.slug}
							>
								{p.label}
							</a>
						))}
					</nav>
				)}
			</div>
		</div>
	)
}
