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
	description: "صفحاتنا على فيسبوك وبوت تيليجرام.",
}

const FB_PAGE = "https://web.facebook.com/profile.php?id=61592661001175"
const BOT = "https://t.me/doctorat_math_bot"
const FB_ALI = "https://web.facebook.com/search/top?q=ali%20maths"

export default function CoffeePage() {
	return (
		<main className={`fw ${amiri.className}`} dir="rtl">
			<div className="fw__wrap">
				<h1 className="fw__title">تابعنا</h1>
				<div className="fw__orn">❦</div>
				<p className="fw__lead">قربٌ دائم، وجديدٌ أوّلًا بأوّل.</p>

				<nav className="fw__links">
					<a
						className="fw__link"
						href={FB_PAGE}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className="fw__ico" aria-hidden="true">
							f
						</span>
						<span className="fw__body">
							<span className="fw__name">صفحتنا على فيسبوك</span>
							<span className="fw__note">كلّ جديد أوّلًا</span>
						</span>
						<span className="fw__go" aria-hidden="true">
							←
						</span>
					</a>

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
							<span className="fw__note">المواضيع في تيليجرام</span>
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
							<span className="fw__note">تابعوها أيضًا</span>
						</span>
						<span className="fw__go" aria-hidden="true">
							←
						</span>
					</a>
				</nav>

				<div className="fw__orn fw__orn--sm">✴</div>
				<p className="fw__thanks">شكرًا لعلي على مساعدته.</p>
			</div>
		</main>
	)
}
