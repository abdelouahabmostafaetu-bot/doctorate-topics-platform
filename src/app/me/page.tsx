import type { Metadata } from "next"
import Link from "next/link"
import { Amiri } from "next/font/google"
import "../coffee/follow.css"

const amiri = Amiri({
	subsets: ["arabic", "latin"],
	weight: ["400", "700"],
	display: "swap",
})

export const metadata: Metadata = {
	title: "من أنا · ما هذا الموقع",
	description:
		"خمسةُ أسطرٍ تعرّفك بصاحبِ الموقعِ وبما يقدّمه — النسخة المختصرة من صفحة القهوة.",
}

const EMAIL = "epsilon@docmathdz.dev"

export default function MePage() {
	return (
		<main className={`fw ${amiri.className}`} dir="rtl">
			<div className="fw__wrap">
				<h1 className="fw__title">من أنا؟ وما هذا الموقع؟</h1>
				<div className="fw__orn">❦</div>
				<p className="fw__lead fw__lead--tight">خمسةُ أسطرٍ تكفي.</p>

				<section className="fw__section">
					<p className="fw__p">
						١ · أنا طالبُ ماستر، أحبُّ الرياضياتِ والبرمجةَ والذكاءَ
						الاصطناعي، وأعملُ على هذا الموقعِ في وقتِ فراغي — للمتعةِ لا
						للمقابل.
					</p>
					<p className="fw__p">
						٢ · هذا الموقعُ أرشيفٌ مجانيٌّ لمواضيعِ مسابقاتِ الدكتوراه في
						الرياضيات، مرتّبةً حسبَ الجامعةِ والسنةِ والتخصّص.
					</p>
					<p className="fw__p">
						٣ · فيه بحثٌ سريعٌ وتصفيةٌ بالتخصّصات، وتحميلُ المواضيعِ في
						ملفات PDF مرتّبة.
					</p>
					<p className="fw__p">
						٤ · الموقعُ مجانيٌّ إلى الأبد: لا اشتراكَ ولا إعلاناتِ ولا
						مقابل — صُنع ليُعين، لا ليَربح.
					</p>
					<p className="fw__p">
						٥ · للتواصلِ أو الإبلاغِ عن خلل:{" "}
						<a href={`mailto:${EMAIL}`} dir="ltr">
							{EMAIL}
						</a>
					</p>
				</section>

				<div className="fw__orn fw__orn--sm">✴</div>
				<p className="fw__thanks">
					<Link href="/coffee">صفحةُ القهوةِ الكاملة ←</Link>
				</p>
			</div>
		</main>
	)
}
