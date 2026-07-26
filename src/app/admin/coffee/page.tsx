"use client"

/**
 * ☕ /admin/coffee — SIMPLE MODE.
 * One column. Every field visible. One save button. Nothing else.
 */

import { useEffect, useState } from "react"
import "./admin.css"
import { EMPTY_DROP, type DailyDropInput } from "@/lib/coffee/types"

type Row = DailyDropInput & { _id: string }

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers" }).format(new Date())
}

export default function CoffeeAdminPage() {
  const [form, setForm] = useState<DailyDropInput>({ ...EMPTY_DROP, date: today() })
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
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
    } catch (e: any) {
      setMsg(String(e.message ?? e))
    } finally {
      setBusy(false)
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
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label className="sa-check">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          منشور
        </label>
      </div>

      <h2>1) المسألة</h2>

      <div className="sa-row2">
        <label>
          Subject
          <input dir="ltr" value={form.problem.subject} onChange={(e) => setP("subject", e.target.value)} />
        </label>
        <label>
          Source
          <input dir="ltr" value={form.problem.source} onChange={(e) => setP("source", e.target.value)} />
        </label>
      </div>

      <label>
        الصعوبة
        <select
          value={form.problem.difficulty}
          onChange={(e) => setP("difficulty", Number(e.target.value) as 1 | 2 | 3)}
        >
          <option value={1}>★☆☆ سهلة</option>
          <option value={2}>★★☆ متوسطة</option>
          <option value={3}>★★★ صعبة</option>
        </select>
      </label>

      <label>
        Statement (English + LaTeX) *
        <textarea dir="ltr" rows={6} value={form.problem.statement} onChange={(e) => setP("statement", e.target.value)} />
      </label>

      <label>
        تلميح 1
        <textarea rows={2} value={form.problem.hint1 ?? ""} onChange={(e) => setP("hint1", e.target.value)} />
      </label>

      <label>
        تلميح 2
        <textarea rows={2} value={form.problem.hint2 ?? ""} onChange={(e) => setP("hint2", e.target.value)} />
      </label>

      <label>
        Solution
        <textarea dir="ltr" rows={6} value={form.problem.solution ?? ""} onChange={(e) => setP("solution", e.target.value)} />
      </label>

      <h2>2) فكرة اليوم *</h2>
      <label>
        النص (عربي + LaTeX)
        <textarea rows={4} value={form.idea.text} onChange={(e) => setForm({ ...form, idea: { text: e.target.value } })} />
      </label>

      <h2>3) مقولة اليوم *</h2>
      <label>
        النص
        <input value={form.quote.text} onChange={(e) => setForm({ ...form, quote: { ...form.quote, text: e.target.value } })} />
      </label>
      <label>
        القائل (اختياري)
        <input value={form.quote.author ?? ""} onChange={(e) => setForm({ ...form, quote: { ...form.quote, author: e.target.value } })} />
      </label>

      <button className="sa-save" onClick={save} disabled={busy}>
        {busy ? "جارٍ الحفظ…" : "💾 حفظ"}
      </button>
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
