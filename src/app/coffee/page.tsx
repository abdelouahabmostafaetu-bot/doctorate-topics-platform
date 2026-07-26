import type { Metadata } from "next"
import "./coffee.css"
import CoffeeCup from "@/components/coffee/CoffeeCup"
import HeartGraph from "@/components/coffee/HeartGraph"
import ProblemCard from "./ProblemCard"
import SupportCard from "./SupportCard"
import { TexBlock } from "@/components/coffee/Tex"
import { getTodayDrop, arabicDate, todayAlgiers } from "@/lib/coffee/db"
import { DIFFICULTY_LABEL } from "@/lib/coffee/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "☕ قهوة الدكتوراه — DocMath DZ",
  description:
    "مسألةٌ واحدة، وفكرةٌ واحدة، ومقولةٌ واحدة — خمسَ عشرةَ دقيقة كلَّ صباح مع قهوتك.",
}

export default async function CoffeePage() {
  // getTodayDrop never throws, but keep a belt-and-braces catch so this page
  // can NEVER show the 500 error screen — worst case it renders the fallback card.
  const drop = await getTodayDrop().catch((err) => {
    console.error("[coffee] page failed to load today's drop:", err)
    return null
  })

  return (
    <main className="dm-coffee" dir="rtl">
      <div className="dm-wrap">
        {/* ═════ HERO ═════ */}
        <header className="dm-hero">
          <HeartGraph side="left" from="#F08A9B" to="#B79BE8" caption="x = 16 sin³t" />
          <HeartGraph side="right" from="#6BA6EE" to="#77C9A0" caption="y = 13cos t − 5cos 2t" />

          <div className="dm-cupholder">
            <CoffeeCup size="lg" />
          </div>

          <p className="dm-kicker">DocMath DZ · Daily</p>

          <h1 className="dm-title">
            <span className="dm-g">قهوةُ</span> <span className="dm-b">الدكتوراه</span>
            <br />
            <span className="dm-m">خمسَ</span> <span className="dm-r">عشرةَ</span>{" "}
            <span className="dm-v">دقيقة</span> <span className="dm-g">فقط</span>
          </h1>

          <span className="dm-tagline">
            فنجانٌ واحد، ومسألةٌ واحدة، وخُطوةٌ <b>أقربُ إلى الدكتوراه</b>.
          </span>

          <div className="dm-rule" />
        </header>

        {!drop ? (
          <section className="dm-card">
            <div className="dm-chead">
              <span className="dm-dot" style={{ background: "var(--dm-gold)" }} />
              <h2>لم تُنشَر قهوةُ اليوم بعد</h2>
            </div>
            <p className="dm-sub">عُد بعد قليل — الماء لا يزال يغلي ☕</p>
          </section>
        ) : (
          <>
            {/* ═════ 1. مسألة اليوم ═════ */}
            <ProblemCard
              problem={drop.problem}
              dateLabel={arabicDate(drop.date)}
              difficultyLabel={DIFFICULTY_LABEL[drop.problem.difficulty]}
            />

            {/* ═════ 2. فكرة اليوم ═════ */}
            <section className="dm-card">
              <div className="dm-chead">
                <span className="dm-dot" style={{ background: "var(--dm-mint)" }} />
                <h2>فكرةُ اليوم</h2>
                <span className="dm-meta">Idea of the day</span>
              </div>
              <div className="dm-idea">
                <TexBlock source={drop.idea.text} dir="rtl" />
              </div>
            </section>

            {/* ═════ 3. مقولة اليوم ═════ */}
            <section className="dm-card">
              <div className="dm-chead">
                <span className="dm-dot" style={{ background: "var(--dm-lilac)" }} />
                <h2>مقولةُ اليوم</h2>
                <span className="dm-meta">Quote of the day</span>
              </div>
              <blockquote className="dm-quote">
                <div className="dm-quote__mark">”</div>
                <p>{drop.quote.text}</p>
                {drop.quote.author && <cite>— {drop.quote.author}</cite>}
              </blockquote>
            </section>
          </>
        )}

        {/* ═════ 4. ادعم المنصة ═════ */}
        <SupportCard />

        <p className="dm-foot">
          صُنع بالقهوة والصبر في الجزائر · {arabicDate(todayAlgiers())}
        </p>
      </div>
    </main>
  )
}
