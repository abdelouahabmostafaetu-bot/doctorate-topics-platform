import type { Metadata } from "next"
import "./problems.css"
import { allProblems, getProblem } from "@/lib/coffee/problems"
import ProblemCard from "./ProblemCard"
import Comments, { type CurrentUser } from "./Comments"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
	title: "مسائل ممتعة — DocMath DZ",
	description:
		"مسألة واحدة مختارة بعناية، مع تلميحات وبرهان كامل ونقاش مفتوح — كتابة بصيغة Markdown و LaTeX.",
}

async function currentUser(): Promise<CurrentUser> {
	try {
		const { auth } = await import("@/auth")
		const session: any = await (auth as any)()
		if (!session?.user) return null
		return {
			id: String(session.user.id ?? session.user.email ?? ""),
			name: session.user.name || "مستخدم",
			image: session.user.image ?? null,
			isAdmin: session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN",
		}
	} catch {
		return null
	}
}

export default async function CoffeePage({
	searchParams,
}: {
	searchParams: Promise<{ p?: string }>
}) {
	const sp = await searchParams
	const problem = getProblem(sp?.p)
	const user = await currentUser()
	const list = allProblems()

	if (!problem) {
		return (
			<div className="ip-root" dir="rtl">
				<div className="ip-wrap">
					<p className="ip-empty">لا توجد مسائل منشورة بعد.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="ip-root" dir="rtl">
			<div className="ip-wrap">
				<header className="ip-mast">
					<span className="ip-mast__kicker">✦ مسائل ممتعة</span>
					<h1>مسألةٌ واحدة، وبرهانٌ يستحقّ التأمّل</h1>
					<p>
						نتيجة صغيرة كلَّ مرّة: النصّ أولًا، ثم تلميح إن احتجت، ثم البرهان كاملًا.
						وفي الأسفل نقاشٌ مفتوح تكتب فيه حلّك بصيغة Markdown و LaTeX.
					</p>
				</header>

				<div className="ip-rule" aria-hidden="true">
					∑ ∫ π ∞ √
				</div>

				<ProblemCard problem={problem} />

				{list.length > 1 && (
					<nav className="ip-archive">
						<div className="ip-archive__lbl">أرشيف المسائل</div>
						<div className="ip-archive__list">
							{list.map((p) => (
								<a
									key={p.slug}
									href={`/coffee?p=${p.slug}`}
									className="ip-archive__item"
									aria-current={p.slug === problem.slug}
								>
									{p.title}
								</a>
							))}
						</div>
					</nav>
				)}

				<Comments slug={problem.slug} user={user} />

				<p className="ip-foot">DocMath DZ · صُنع بالقهوة والصبر في الجزائر</p>
			</div>
		</div>
	)
}
