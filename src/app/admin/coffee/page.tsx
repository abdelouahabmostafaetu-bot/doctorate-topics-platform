"use client"

/**
 * ☕ /admin/coffee — daily content + social image studio.
 */

import { useEffect, useState } from "react"
import "./admin.css"
import { EMPTY_DROP, type DailyDropInput } from "@/lib/coffee/types"

type Row = DailyDropInput & { _id: string }
type ImageKind = "quote" | "problem"

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers" }).format(new Date())
}

export default function CoffeeAdminPage() {
  const [form, setForm] = useState<DailyDropInput>({ ...EMPTY_DROP, date: today() })
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [socialBusy, setSocialBusy] = useState<ImageKind | "both" | null>(null)
  const [msg, setMsg] = useState("")

  async function load() {
    try {
      const r = await fetch("/api/admin/coffee")
      const j = await r.json()
      setRows(j.items ?? [])
    } catch {
      setMsg("تعذَّر تحميل القائمة")
    }
  }
  useEffect(() => {
    load()
  }, [])

  function setP(k: keyof DailyDropInput["problem"], v: unknown) {
    setForm((f) => ({ ...f, problem: { ...f.problem, [k]: v } }))
  }

  async function save() {
    setBusy(true)
    setMsg("")
    try {
      const r = await fetch("/api/admin/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error ?? "فشل الحفظ")
      setMsg("✓ تم الحفظ")
      load()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function socialPayload(kind: ImageKind) {
    return {
      kind,
      date: form.date,
      quote: form.quote,
      problem: {
        subject: form.problem.subject,
        source: form.problem.source,
        difficulty: form.problem.difficulty,
        statement: form.problem.statement,
      },
    }
  }

  async function downloadImage(kind: ImageKind, quiet = false) {
    if (kind === "quote" && !form.quote.text.trim()) {
      throw new Error("اكتب مقولة اليوم أولًا")
    }
    if (kind === "problem" && !form.problem.statement.trim()) {
      throw new Error("اكتب نص المسألة أولًا")
    }

    const response = await fetch("/api/admin/social-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(socialPayload(kind)),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error ?? "تعذّر إنشاء الصورة")
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `docmath-${kind}-${form.date}.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    if (!quiet) setMsg(`✓ تم تحميل صورة ${kind === "quote" ? "المقولة" : "المسألة"}`)
  }

  async function handleDownload(kind: ImageKind) {
    setSocialBusy(kind)
    setMsg("")
    try {
      await downloadImage(kind)
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "تعذّر إنشاء الصورة")
    } finally {
      setSocialBusy(null)
    }
  }

  async function downloadBoth() {
    setSocialBusy("both")
    setMsg("")
    try {
      await downloadImage("quote", true)
      await downloadImage("problem", true)
      setMsg("✓ تم تحميل صورتي المقولة والمسألة")
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "تعذّر إنشاء الصور")
    } finally {
      setSocialBusy(null)
    }
  }

  function buildPost(kind: ImageKind) {
    if (kind === "quote") {
      const author = form.quote.author?.trim() ? `\n— ${form.quote.author.trim()}` : ""
      return `✨ مقولة اليوم\n\n“${form.quote.text.trim()}”${author}\n\nشاركونا آراءكم في التعليقات 💬\n\n🌐 www.docmathdz.dev\n\n#DocMathDZ #مقولة_اليوم #رياضيات #دكتوراه_الرياضيات`
    }
    const difficulty = "★".repeat(form.problem.difficulty) + "☆".repeat(3 - form.problem.difficulty)
    const source = form.problem.source.trim() ? `\n📚 المصدر: ${form.problem.source.trim()}` : ""
    return `🧮 مسألة اليوم | ${form.problem.subject || "رياضيات"}\n${difficulty}${source}\n\n${form.problem.statement.trim()}\n\n✍️ اكتبوا حلولكم في التعليقات، وسيُنشر الحل لاحقًا.\n\n🌐 المزيد من المسائل على www.docmathdz.dev\n\n#DocMathDZ #مسألة_اليوم #رياضيات #مسابقة_الدكتوراه #الجزائر`
  }

  async function copyPost(kind: ImageKind) {
    const required = kind === "quote" ? form.quote.text : form.problem.statement
    if (!required.trim()) {
      setMsg(kind === "quote" ? "اكتب المقولة أولًا" : "اكتب المسألة أولًا")
      return
    }
    try {
      await navigator.clipboard.writeText(buildPost(kind))
      setMsg(`✓ تم نسخ منشور ${kind === "quote" ? "المقولة" : "المسألة"}`)
    } catch {
      setMsg("تعذّر النسخ التلقائي. انسخ النص من المعاينة.")
    }
  }

  function edit(row: Row) {
    setForm({
      date: row.date,
      published: row.published,
      problem: { ...row.problem },
      idea: { ...row.idea },
      quote: { ...row.quote },
    })
    setMsg(`تحرّر يوم ${row.date}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function fresh() {
    setForm({ ...EMPTY_DROP, date: today() })
    setMsg("")
  }

  async function togglePub(row: Row) {
    await fetch(`/api/admin/coffee/${row._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !row.published }),
    }).catch(() => {})
    load()
  }

  async function del(row: Row) {
    if (!confirm(`حذف يوم ${row.date}؟`)) return
    await fetch(`/api/admin/coffee/${row._id}`, { method: "DELETE" }).catch(() => {})
    load()
  }

  return (
    <main className="sa" dir="rtl">
      <header className="sa-top">
        <h1>☕ قهوة اليوم</h1>
        <div className="sa-topbtns">
          <button type="button" onClick={fresh}>+ جديد</button>
          <a href="/coffee" target="_blank" rel="noreferrer">معاينة ↗</a>
        </div>
      </header>

      <div className="sa-row2">
        <label>
          التاريخ *
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label className="sa-check">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          منشور
        </label>
      </div>

      <h2>1) المسألة</h2>
      <div className="sa-row2">
        <label>Subject<input dir="ltr" value={form.problem.subject} onChange={(e) => setP("subject", e.target.value)} /></label>
        <label>Source<input dir="ltr" value={form.problem.source} onChange={(e) => setP("source", e.target.value)} /></label>
      </div>
      <label>
        الصعوبة
        <select value={form.problem.difficulty} onChange={(e) => setP("difficulty", Number(e.target.value) as 1 | 2 | 3)}>
          <option value={1}>★☆☆ سهلة</option><option value={2}>★★☆ متوسطة</option><option value={3}>★★★ صعبة</option>
        </select>
      </label>
      <label>Statement (English + LaTeX) *<textarea dir="ltr" rows={6} value={form.problem.statement} onChange={(e) => setP("statement", e.target.value)} /></label>
      <label>تلميح 1<textarea rows={2} value={form.problem.hint1 ?? ""} onChange={(e) => setP("hint1", e.target.value)} /></label>
      <label>تلميح 2<textarea rows={2} value={form.problem.hint2 ?? ""} onChange={(e) => setP("hint2", e.target.value)} /></label>
      <label>Solution<textarea dir="ltr" rows={6} value={form.problem.solution ?? ""} onChange={(e) => setP("solution", e.target.value)} /></label>

      <h2>2) فكرة اليوم *</h2>
      <label>النص (عربي + LaTeX)<textarea rows={4} value={form.idea.text} onChange={(e) => setForm({ ...form, idea: { text: e.target.value } })} /></label>

      <h2>3) مقولة اليوم *</h2>
      <label>النص<input value={form.quote.text} onChange={(e) => setForm({ ...form, quote: { ...form.quote, text: e.target.value } })} /></label>
      <label>القائل (اختياري)<input value={form.quote.author ?? ""} onChange={(e) => setForm({ ...form, quote: { ...form.quote, author: e.target.value } })} /></label>

      <button className="sa-save" onClick={save} disabled={busy}>{busy ? "جارٍ الحفظ…" : "💾 حفظ في الموقع"}</button>

      <section className="sa-social" aria-labelledby="social-studio-title">
        <div className="sa-social-head">
          <div><h2 id="social-studio-title">🎨 استوديو منشورات فيسبوك</h2><p>أنشئ صورتين مربعتين 1080×1080 تحملان شعار ∂ والموقع الرسمي.</p></div>
          <a href="https://web.facebook.com/profile.php?id=61592661001175" target="_blank" rel="noreferrer">فتح الصفحة ↗</a>
        </div>
        <div className="sa-social-grid">
          <button type="button" onClick={() => handleDownload("quote")} disabled={socialBusy !== null}>⬇️ صورة المقولة</button>
          <button type="button" onClick={() => copyPost("quote")}>📋 نسخ منشور المقولة</button>
          <button type="button" onClick={() => handleDownload("problem")} disabled={socialBusy !== null}>⬇️ صورة المسألة</button>
          <button type="button" onClick={() => copyPost("problem")}>📋 نسخ منشور المسألة</button>
        </div>
        <button type="button" className="sa-download-both" onClick={downloadBoth} disabled={socialBusy !== null}>
          {socialBusy === "both" ? "جارٍ إنشاء الصورتين…" : "⬇️ تحميل الصورتين"}
        </button>
        <details className="sa-post-preview">
          <summary>معاينة نصوص المنشورات</summary>
          <h3>منشور المقولة</h3><pre>{buildPost("quote")}</pre>
          <h3>منشور المسألة</h3><pre dir="auto">{buildPost("problem")}</pre>
        </details>
      </section>

      {msg && <p className="sa-msg">{msg}</p>}

      <h2 className="sa-listtitle">الأيام ({rows.length})</h2>
      <div className="sa-list">
        {rows.map((r) => (
          <div key={r._id} className="sa-item">
            <span className="sa-date" dir="ltr">{r.date}</span>
            <span className="sa-sub">{r.problem.subject || "—"}</span>
            <span className={r.published ? "sa-on" : "sa-off"}>{r.published ? "منشور" : "مسودة"}</span>
            <span className="sa-acts">
              <button onClick={() => edit(r)}>تعديل</button>
              <button onClick={() => togglePub(r)}>{r.published ? "إخفاء" : "نشر"}</button>
              <button className="sa-del" onClick={() => del(r)}>حذف</button>
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="sa-empty">لا أيام بعد — املأ النموذج واضغط حفظ.</p>}
      </div>
    </main>
  )
}
