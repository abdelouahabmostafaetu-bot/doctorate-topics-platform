/**
 * ☕ ادعم المنصة — informational only.
 * The amounts are NOT clickable anymore (no /coffee/pay). They simply show
 * what a cup costs; people pay via CCP / BaridiMob shown on the site.
 */
const TIERS = [
  { amount: 300, label: "فنجان", color: "var(--dm-gold)" },
  { amount: 600, label: "فنجانان", color: "var(--dm-mint)" },
  { amount: 1200, label: "إبريق كامل", color: "var(--dm-lilac)" },
]

export default function SupportSection() {
  return (
    <section className="dm-sec dm-support">
      <div
        className="dm-lbl"
        style={{ ["--dm-accent" as any]: "var(--dm-rose)", justifyContent: "center" }}
      >
        <h2>اشترِ لي فنجانَ قهوة</h2>
      </div>

      <p>
        كلُّ ما في هذه المنصة مجانٌ، وسيبقى مجانًّا. فنجانُك يُبقي السيرفرَ مستيقظًا حتى الفجر.
      </p>

      <div className="dm-prices">
        {TIERS.map((t) => (
          <div key={t.amount} className="dm-price" style={{ ["--dm-pc" as any]: t.color }}>
            <div className="dm-price__n">{t.amount} DA</div>
            <div className="dm-price__t">{t.label}</div>
          </div>
        ))}
      </div>

      <p className="dm-pay">CCP · BaridiMob · CIB — أو ساهم بموضوعٍ جديد بدلَ المال 🤍</p>
    </section>
  )
}
