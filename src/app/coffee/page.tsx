import type { Metadata } from "next"
import { Amiri } from "next/font/google"
import "./follow.css"

const amiri = Amiri({
	subsets: ["arabic", "latin"],
	weight: ["400", "700"],
	display: "swap",
})

export const metadata: Metadata = {
	title: "تابعنا",
	description:
		"بوت تيليجرام لمواضيع الدكتوراه في الرياضيات، وصفحة الصديق علي على فيسبوك.",
}

const BOT = "https://t.me/doctorat_math_bot"
const FB_ALI = "https://web.facebook.com/ALI.MATHS.11"

export default function CoffeePage() {
	return (
		<main className={`fw ${amiri.className}`} dir="rtl">
			<div className="fw__wrap">
				<h1 className="fw__title">تابعونا</h1>
				<div className="fw__orn">❦</div>
				<p className="fw__lead fw__lead--tight">
					قربٌ دائم، وجديدٌ أوّلًا بأوّل.
				</p>
				<p className="fw__sub">
					مواضيعُ مسابقات الدكتوراه في الرياضيات، تُجمَعُ بعنايةٍ
					وتُنشَرُ مجّانًا لوجهِ العلم. اختر من البابينِ ما يُقرّبُكَ منّا.
				</p>

				<nav className="fw__links">
					<a
						className="fw__link"
						href={BOT}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className="fw__ico fw__ico--tg" aria-hidden="true">
							➤
						</span>
						<span className="fw__body">
							<span className="fw__name">@doctorat_math_bot</span>
							<span className="fw__note">
								بوتُ المواضيع في تيليجرام — بحثٌ سريعٌ وتحميلٌ فوري
							</span>
						</span>
						<span className="fw__go" aria-hidden="true">
							←
						</span>
					</a>

					<a
						className="fw__link"
						href={FB_ALI}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className="fw__ico" aria-hidden="true">
							f
						</span>
						<span className="fw__body">
							<span className="fw__name">صفحة الصديق علي</span>
							<span className="fw__note">
								رفيقُ الدربِ في جمعِ المواضيع — تابِعوها كذلك
							</span>
						</span>
						<span className="fw__go" aria-hidden="true">
							←
						</span>
					</a>
				</nav>

				<div className="fw__orn fw__orn--sm">✴</div>
				<p className="fw__quote">«العِلمُ لا يَنقُصُ بالبَذل، بل يَزكو ويَزيد.»</p>
				<p className="fw__thanks">
					شكرًا لعليٍّ على مساعدته، وشكرًا لكم على ثقتكم ودعائكم.
				</p>
			</div>
		</main>
	)
}
