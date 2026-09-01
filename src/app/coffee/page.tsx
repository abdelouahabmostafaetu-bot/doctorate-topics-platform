import type { Metadata } from "next"
import { Amiri } from "next/font/google"
import { CcpBox } from "./CcpBox"
import StatPing from "./StatPing"
import "./follow.css"

const amiri = Amiri({
	subsets: ["arabic", "latin"],
	weight: ["400", "700"],
	display: "swap",
})

export const metadata: Metadata = {
	title: "قهوة الدكتوراه",
	description: "من أنا، وما هذا الموقع، وكيف تتواصل معي أو تدعمه — باختصار.",
}

const EMAIL = "epsilon@docmathdz.dev"

export default function CoffeePage() {
	return (
		<main className={`fw ${amiri.className}`} dir="rtl">
			{/* عدّاد زيارات الصفحة — يزيد +1 في لوحة الإدارة مع كل زيارة */}
			<StatPing />

			<div className="fw__wrap">
				<h1 className="fw__title">قهوة الدكتوراه ☕</h1>
				<div className="fw__orn">❦</div>

				<section className="fw__section">
					<h2 className="fw__h2">من أنا</h2>
					<p className="fw__p">
						طالبُ ماستر يحبُّ الرياضياتِ والبرمجةَ والذكاءَ الاصطناعي،
						ويعملُ على هذا الموقعِ في وقتِ فراغِه — للمتعةِ لا للمقابل.
					</p>
				</section>

				<section className="fw__section">
					<h2 className="fw__h2">ما هذا الموقع</h2>
					<p className="fw__p">
						أرشيفٌ مجانيٌّ لمواضيعِ مسابقاتِ الدكتوراه في الرياضيات،
						مرتّبةً حسبَ الجامعةِ والسنةِ والتخصّص، مع بحثٍ سريعٍ
						وتحميلٍ في ملفات PDF.
					</p>
					<p className="fw__p">
						الموقعُ <strong>مجانيٌّ إلى الأبد</strong> — لا اشتراكَ ولا
						إعلاناتِ ولا مقابل. صُنع ليُعين، لا ليَربح.
					</p>
				</section>

				<section className="fw__section">
					<h2 className="fw__h2">الدعم</h2>
					<p className="fw__p">
						استضافةُ الموقعِ ونطاقُه يكلّفان نحوَ مئةِ دولارٍ سنويًّا.
						فإن أردتَ أن يبقى واقفًا، فمساهمتُك — ولو دينارًا واحدًا —
						تذهبُ إلى تكلفةِ الاستضافةِ والنطاقِ مباشرة.
						ومن لم يستطع فدعوةٌ طيّبةٌ تكفيني.
					</p>

					<CcpBox />
				</section>

				<section className="fw__section">
					<h2 className="fw__h2">التواصل</h2>
					<p className="fw__p">
						وجدتَ خللًا أو عندك اقتراح؟ راسلني ولا تتحرّج:{" "}
						<a href={`mailto:${EMAIL}`} dir="ltr">
							{EMAIL}
						</a>
					</p>
				</section>

				<div className="fw__orn fw__orn--sm">✴</div>
				<p className="fw__coffee">ولا تنسَ قهوتَك اليوم ☕</p>
			</div>
		</main>
	)
}
