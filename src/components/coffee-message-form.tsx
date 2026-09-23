"use client"

import { FormEvent, useState } from "react"

export default function CoffeeMessageForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [body, setBody] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === "sending") return
    setStatus("sending")
    setError("")
    try {
      const response = await fetch("/api/coffee/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, body, website: "" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || "تعذّر إرسال الرسالة")
      setName("")
      setEmail("")
      setBody("")
      setStatus("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
      setStatus("error")
    }
  }

  return (
    <div className="fw__message-card">
      <div className="fw__message-heading">
        <span className="fw__message-icon" aria-hidden="true">💬</span>
        <div>
          <h3>اترك لنا رسالة</h3>
          <p>كلمة منك تساعدنا على معرفة ما ينقص الموقع والاستمرار في تطويره.</p>
        </div>
      </div>

      <form onSubmit={submit} className="fw__message-form">
        <div className="fw__message-fields">
          <label>
            اسمك <span>(اختياري)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="مثال: محمد" />
          </label>
          <label>
            بريدك للرد عليك <span>(اختياري)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} dir="ltr" placeholder="you@example.com" />
          </label>
        </div>
        <label>
          رسالتك
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            required
            rows={4}
            placeholder="ما رأيك في الموقع؟ هل لديك اقتراح أو كلمة تشجيع؟"
          />
        </label>
        <div className="fw__message-foot">
          <span>تصل رسالتك إلى إدارة الموقع فقط 🔒</span>
          <button type="submit" disabled={status === "sending" || body.trim().length < 3}>
            {status === "sending" ? "جارٍ الإرسال…" : "إرسال الرسالة ✉️"}
          </button>
        </div>
        <p className="fw__message-status" role="status" aria-live="polite">
          {status === "success" ? "وصلت رسالتك، شكرًا لك! سنقرأها في لوحة الإدارة 🤍" : status === "error" ? error : ""}
        </p>
      </form>
    </div>
  )
}
