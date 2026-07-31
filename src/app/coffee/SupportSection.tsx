import CcpCopy from "./CcpCopy"

/**
 * ☕ ادعم المنصة — no price buttons.
 * 1) شكر دافئ (Amiri) + رقم CCP مع زر نسخ.
 * 2) كلمة مني عني وعن الموقع + رابط الموقع.
 * 3) بطاقة شكر خاصة للصديق علي بن الشيخ.
 */
export default function SupportSection() {
  return (
    <>
      <section className="dm-sec dm-support">
        <div
          className="dm-lbl"
          style={{ ["--dm-accent" as any]: "var(--dm-rose)", justifyContent: "center" }}
        >
          <h2>اشترِ لي فنجانَ قهوة</h2>
        </div>

        <p className="dm-thanks">
          <span className="dm-th-g">شكرًا من القلب</span> لكلِّ من ساندَ هذه المنصة —
          كلُّ دينارٍ تُرسله يصل مباشرةً إلى حسابي البريدي،
          ويُبقي هذا الموقعَ <span className="dm-th-m">حيًّا ومجانيًّا للجميع</span>.
        </p>

        <CcpCopy />

        <p className="dm-pay">☕ فنجانُ قهوةٍ واحد يكفي — ودعاءُك يكفيني أكثر 🤍</p>
      </section>

      {/* ───── كلمة منّي ───── */}
      <section className="dm-sec dm-word">
        <div
          className="dm-lbl"
          style={{ ["--dm-accent" as any]: "var(--dm-gold)", justifyContent: "center" }}
        >
          <h2>كلمةٌ منّي</h2>
          <span className="dm-lbl__en">A word from me</span>
        </div>

        <p className="dm-word__body">
          أنا <span className="dm-th-g">مصطفى عبد الوهاب</span>، طالبُ ماستر في الرياضيات
          بالمركز الجامعي عبد الحفيظ بوالصوف — ميلة.
          <br />
          أنشأتُ <span className="dm-th-m">DocMath DZ</span> لأنّ مواضيعَ مسابقات
          الدكتوراه في الجزائر كانت مبعثرةً بين المجموعات والأوراق،
          فجمعتُها في مكانٍ واحد، مرتّبةً وواضحةً ومجانيّةً للجميع.
          <br />
          لا إعلانات، ولا اشتراكات، ولا أبوابٌ مغلقة —
          فقط رياضياتٌ وطالبٌ يحلم مثلك بالدكتوراه.
        </p>

        <div className="dm-sitewrap">
          <a className="dm-sitelink" href="https://www.docmathdz.dev">
            <span className="dm-sitelink__mark">∂</span>
            <span className="dm-sitelink__txt">
              زُر الموقع كاملاً <b>www.docmathdz.dev</b>
            </span>
          </a>
          <a className="dm-sitelink dm-sitelink--soft" href="/topics">
            كلُّ مواضيعِ مسابقاتِ الدكتوراه
          </a>
        </div>
      </section>

      {/* ───── شكرٌ خاص ───── */}
      <section className="dm-sec dm-friend">
        <div
          className="dm-lbl"
          style={{ ["--dm-accent" as any]: "var(--dm-lilac)", justifyContent: "center" }}
        >
          <h2>شكرٌ خاصٌ جدًّا</h2>
          <span className="dm-lbl__en">Special thanks</span>
        </div>

        <div className="dm-friend__card">
          <div className="dm-friend__orn">❀</div>
          <p className="dm-friend__name">علي بن الشيخ</p>
          <p className="dm-friend__en">Ali Ben Chick</p>
          <p className="dm-friend__msg">
            إلى صديقي الغالي، الذي وقف معي حين كانت الفكرةُ مجرّدَ حلم،
            وشجّعني حين أثقلَ التعبُ الطريقَ؛
            <br />
            شكرًا لك على وقتك، ورأيك، وصدقِ محبتك —
            فلولاك لما كان لهذا الموقعِ أن يُولد.
            <br />
            جزاك الله كلَّ خير، وبارك لك في علمك وعمرك 🤍
          </p>
          <div className="dm-friend__orn">❀</div>
        </div>

        <p className="dm-about">
          وشكرًا لكلِّ أستاذٍ وطالبٍ أرسلَ موضوعًا أو تصحيحًا أو كلمةَ تشجيع—
          كلُّ شيءٍ هنا مجانيٌّ للجميع، طوالَ العام، وكلَّ عام 🤍
        </p>
      </section>
    </>
  )
}
