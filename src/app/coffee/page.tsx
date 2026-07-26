import type { Metadata } from "next"
import "./coffee.css"
import CoffeeCup from "@/components/coffee/CoffeeCup"
import HeartGraph from "@/components/coffee/HeartGraph"
import ProblemSection from "./ProblemSection"
import SupportSection from "./SupportSection"
import ShareButton from "./ShareButton"
import { TexBlock } from "@/components/coffee/Tex"
import { getTodayDrop, arabicDate, todayAlgiers } from "@/lib/coffee/db"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "☕ قهوة الدكتوراه — DocMath DZ",
  description:
    "مسألةٌ واحدة، وفكرةٌ واحدة، ومقولةٌ واحدة — خمسَ عشرةَ دقيقة كلَّ صباح مع قهوتك.",
}

/** 🌙 Greeting that follows the clock of Algiers. */
function algiersGreeting(): { text: string; color: string } {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Algiers",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  )
  if (hour >= 5 && hour < 12) return { text: "☀️ صباحُ البراهين", color: "var(--dm-gold)" }
  if (hour >= 12 && hour < 18) return { text: "🌤️ مساءُ المتتاليات", color: "var(--dm-blue)" }
  return { text: "🌙 ليلُ النظريات", color: "var(--dm-lilac)" }
}

/** Decorative row of coloured math glyphs — pure ornament. */
function Ornament() {
  return (
    <div className="dm-ornament" aria-hidden="true">
      <span style={{ color: "var(--dm-gold)" }}>∑</span>
      <span style={{ color: "var(--dm-blue)" }}>∫</span>
      <span style={{ color: "var(--dm-mint)" }}>π</span>
      <span style={{ color: "var(--dm-rose)" }}>∞</span>
      <span style={{ color: "var(--dm-lilac)" }}>√</span>
    </div>
  )
}

export default async function CoffeePage() {
  const drop = await getTodayDrop().catch((err) => {
    console.error("[coffee] page failed to load today's drop:", err)
    return null
  })
  const greet = algiersGreeting()

  return (
    <main className="dm-coffee" dir="rtl">
      <div className="dm-wrap">
        {/* ───── HERO ───── */}
        <header className="dm-hero">
          <HeartGraph side="left" from="#F08A9B" to="#B79BE8" caption="x = 16 sin³t" width={92} />
          <HeartGraph side="right" from="#6BA6EE" to="#77C9A0" caption="y = 13cos t − …" width={92} />

          {/* ∂ small site logo — links back to the homepage */}
          <a href="/" className="dm-logo" aria-label="DocMath DZ — الرئيسية">
            <span className="dm-logo__mark">∂</span>
            <span className="dm-logo__name">
              DocMath <b>DZ</b>
            </span>
          </a>

          <div className="dm-cupholder">
            <CoffeeCup size="lg" />
          </div>

          <p className="dm-greet" style={{ ["--dm-accent" as any]: greet.color }}>
            {greet.text}
          </p>

          <h1 className="dm-title">
            <span className="dm-g">قهوةُ</span> <span className="dm-b">الدكتوراه</span>
            <br />
            <span className="dm-m">خمسَ</span> <span className="dm-r">عشرةَ</span>{" "}
            <span className="dm-v">دقيقة</span> <span className="dm-g">فقط</span>
          </h1>

          <span className="dm-tagline">
            فنجانٌ واحد، ومسألةٌ واحدة، وخُطوةٌ <b>أقربُ إلى الدكتوراه</b>.
          </span>

          <Ornament />
        </header>

        {!drop ? (
          <section className="dm-sec">
            <div className="dm-lbl" style={{ ["--dm-accent" as any]: "var(--dm-gold)" }}>
              <h2>لم تُنشَر قهوةُ اليوم بعد</h2>
            </div>
            <p className="dm-empty">عُد بعد قليل — الماء لا يزال يغلي ☕</p>
          </section>
        ) : (
          <>
            <ProblemSection problem={drop.problem} dateLabel={arabicDate(drop.date)} />

            {/* ───── فكرة اليوم ───── */}
            <section className="dm-sec">
              <div className="dm-lbl" style={{ ["--dm-accent" as any]: "var(--dm-mint)" }}>
                <h2>فكرةُ اليوم</h2>
                <span className="dm-lbl__en">Idea</span>
              </div>
              <div className="dm-idea">
                <TexBlock source={drop.idea.text} dir="rtl" />
              </div>
            </section>

            {/* ───── مقولة اليوم ───── */}
            <section className="dm-sec">
              <div className="dm-lbl" style={{ ["--dm-accent" as any]: "var(--dm-lilac)" }}>
                <h2>مقولةُ اليوم</h2>
                <span className="dm-lbl__en">Quote</span>
              </div>
              <blockquote className="dm-quote">
                <p>«{drop.quote.text}»</p>
                {drop.quote.author && <cite>— {drop.quote.author}</cite>}
              </blockquote>
            </section>

            {/* ───── مشاركة ───── */}
            <div className="dm-sharewrap">
              <ShareButton />
            </div>
          </>
        )}

        <SupportSection />

        <p className="dm-foot">صُنع بالقهوة والصبر في الجزائر · {arabicDate(todayAlgiers())}</p>
      </div>
    </main>
  )
}
