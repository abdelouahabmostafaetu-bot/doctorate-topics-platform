import CcpCopy from "./CcpCopy"

/**
 * ☕ ادعم المنصة — no price buttons anymore.
 * Just a warm Arabic thank-you (Amiri font), the CCP number with a copy
 * button (each copy counts in /admin/coffee-support), and a small honest
 * note about who built this site and why it is free forever.
 */
export default function SupportSection() {
  return (
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

      <p className="dm-about">
        أنا طالبُ ماستر في الرياضيات. أنشأتُ هذا الموقع لأن مواضيعَ مسابقات
        الدكتوراه في الجزائر كانت مبعثرةً وغيرَ منظَّمة، فجمعتُها في مكانٍ واحد
        لأساعدَ كلَّ طالبٍ يحلم بالدكتوراه.
        كلُّ شيءٍ هنا مجانيٌّ للجميع — طوالَ العام، وكلَّ عام 🤍
      </p>
    </section>
  )
}
