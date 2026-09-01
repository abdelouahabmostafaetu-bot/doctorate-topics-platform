import type { Metadata } from "next"
import Link from "next/link"
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
	title: "تابعنا",
	description:
		"بوت تيليجرام لمواضيع الدكتوراه في الرياضيات، وصفحة الصديق علي على فيسبوك، وقصة هذا الموقع.",
}

const BOT = "https://t.me/doctorat_math_bot"
const FB_ALI = "https://web.facebook.com/ALI.MATHS.11"
const EMAIL = "epsilon@docmathdz.dev"

export default function CoffeePage() {
	return (
		<main className={`fw ${amiri.className}`} dir="rtl">
			{/* عدّاد زيارات الصفحة — يزيد +1 في لوحة الإدارة مع كل زيارة */}
			<StatPing />

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
								rفيقُ الدربِ في جمعِ المواضيع — تابِعوها كذلك
							</span>
						</span>
						<span className="fw__go" aria-hidden="true">
							←
						</span>
					</a>

					<a className="fw__link" href={`mailto:${EMAIL}`}>
						<span className="fw__ico" aria-hidden="true">
							✉
						</span>
						<span className="fw__body">
							<span className="fw__name" dir="ltr">
								{EMAIL}
							</span>
							<span className="fw__note">
								للتواصل المباشر — ملاحظةٌ أو اقتراحٌ أو الإبلاغُ عن خلل
							</span>
						</span>
						<span className="fw__go" aria-hidden="true">
							←
						</span>
					</a>
				</nav>

				<div className="fw__orn fw__orn--sm">✴</div>

				<section className="fw__section">
					<h2 className="fw__h2">عن هذا الموقع</h2>
					<p className="fw__p">
						أنا طالبُ ماستر، وبنيتُ هذا الموقعَ بدافعِ الفضولِ أوّلًا،
						ثمّ لأنّي رأيتُ طلبةً كثيرين يتعبون في البحثِ عن مراجعَ
						وأطروحاتٍ ومواضيعِ بحثٍ متفرّقةٍ هنا وهناك. فجمعتُ ما
						استطعتُ في مكانٍ واحد. وحين أُعينُ غيري أجدُني أُعينُ
						نفسي أيضًا: أتعلّم، وأُجرّب، وأفهمُ أكثرَ ممّا كنتُ أفهم.
					</p>
					<p className="fw__p">
						عمرُ هذا الموقعِ سبعةُ أشهرٍ فقط. وقد أُغلق قبلَ ذلك مرّةً،
						لأنّ استضافتَه واسمَ نطاقِه يكلّفان نحوَ مئةِ دولارٍ — وهو
						مبلغٌ ثقيلٌ على طالب. فإن أردتَ لهذا العملِ أن يبقى
						ويطولَ عمرُه، فمساهمتُك — ولو صغيرة — هي ما يُبقيه واقفًا.
					</p>
					<p className="fw__p">
						وأمّا الموقعُ نفسُه فهو <strong>مجّانيٌ إلى الأبد</strong>. لا تجارةَ
						فيه ولا إعلاناتٍ ولا مقابل. صُنع ليُعين، لا ليَربح.
					</p>
					<p className="fw__p">
						وإن أردتَ مساعدةَ هذا الموقعِ على الاستمرار،
						فحسابي البريديُّ الجارٍ (CCP) هو: <strong dir="ltr">0079 9999 0027 8103 3371</strong>.
						كلُّ مساهمةٍ — ولو كانت دينارًا واحدًا — تذهبُ مباشرةً
						إلى تكلفةِ الاستضافةِ والنطاق، لا إلى جيبي.
						ومن لم يستطع فدعوةٌ طيّبةٌ تكفيني وتُسعدني.
					</p>

					<CcpBox />

					<p className="fw__hint">
						للمساهمةِ في تكلفةِ الاستضافةِ والنطاقِ وحدها — ولا أطلبُ
						ذلك من أحد، ولا يتغيرُ شيءٌ في الموقعِ إن لم تفعل.
					</p>
				</section>

				<section className="fw__section">
					<h2 className="fw__h2">من أنا</h2>
					<p className="fw__p">
						اسمي؟ لا يهمّ. أنا طالبٌ يحبُّ الرياضياتَ والذكاءَ
						الاصطناعيَّ والبرمجة، ويعملُ هذا في وقتِ فراغِه للمتعةِ
						لا للمقابل.
					</p>
					<p className="fw__p">
						وإن وجدتَ خللًا أو نقصًا في الموقعِ فأخبِرني ولا تتحرّج —
						لن أنزعج، بل أشكرُك، فبالملاحظاتِ يتحسّنُ العمل.
						raslني على بريدي الرسمي:{" "}
						<a href={`mailto:${EMAIL}`} dir="ltr">
							{EMAIL}
						</a>
					</p>
					<p className="fw__p">
						وتريدُ المختصرَ المفيد؟ خمسةُ أسطرٍ عني وعن الموقعِ هنا:{" "}
						<Link href="/me">من أنا وما هذا الموقع ←</Link>
					</p>
				</section>

				<div className="fw__orn fw__orn--sm">✴</div>
				<p className="fw__quote">«العِلمُ لا يَنقُصُ بالبَذل، بل يَزكو ويَزيد.»</p>
				<p className="fw__thanks">
					شكرًا لكلِّ من زار هذا الموقعَ، ولعليٍّ على مساعدتِه،
					ولكلِّ من أعانني بكلمةٍ أو نصيحةٍ أو دعوةٍ طيّبة.
				</p>
				<p className="fw__coffee">ولا تنسَ قهوتَك اليوم ☕</p>
			</div>
		</main>
	)
}
