"use client"

const TIERS = [
  { amount: 300, label: "فنجان" },
  { amount: 600, label: "فنجانان" },
  { amount: 1200, label: "إبريق كامل" },
]

export default function SupportSection() {
  function pick(amount: number) {
    // 🔌 plug your payment flow here (SATIM / CIB / Edahabia / BaridiMob)
    window.location.href = `/coffee/pay?amount=${amount}`
  }

  return (
    <section className="dm-sec dm-support">
      <div className="dm-lbl" style={{ ["--dm-accent" as any]: "var(--dm-rose)", justifyContent: "center" }}>
        <h2>اشترِ لي فنجانَ قهوة</h2>
      </div>

      <p>
        كلُّ ما في هذه المنصة مجانٌ، وسيبقى مجانًّا. فنجانُك يُبقي السيرفرَ مستيقظًا حتى الفجر.
      </p>

      <div className="dm-prices">
        {TIERS.map((t) => (
          <button key={t.amount} className="dm-price" onClick={() => pick(t.amount)}>
            <div className="dm-price__n">{t.amount} DA</div>
            <div className="dm-price__t">{t.label}</div>
          </button>
        ))}
      </div>

      <p className="dm-pay">CIB · Edahabia · BaridiMob — أو ساهم بموضوعٍ جديد بدلَ المال 🤍</p>
    </section>
  )
}
