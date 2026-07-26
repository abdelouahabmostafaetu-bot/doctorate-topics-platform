"use client"

import { useCallback, useEffect, useState } from "react"
import "katex/dist/katex.min.css"
import "./admin.css"
import CoffeeCup from "@/components/coffee/CoffeeCup"
import { TexBlock } from "@/components/coffee/Tex"
import { EMPTY_DROP, type DailyDropInput } from "@/lib/coffee/types"

type Row = DailyDropInput & { _id: string }

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers" }).format(new Date())
}

export default function AdminCoffeePage() {
  const [form, setForm] = useState<DailyDropInput>({ ...EMPTY_DROP, date: todayISO() })
  const [rows, setRows] = useState<Row[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/coffee", { cache: "no-store" })
    if (!r.ok) return setMsg({ kind: "err", text: "تعذر تحميل القائمة (تحقق من تسجيل الدخول)" })
    const d = await r.json()
    setRows(d.items ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  // small helpers to update nested state
  const setP = (k: keyof DailyDropInput["problem"], v: unknown) =>
    setForm((f) => ({ ...f, problem: { ...f.problem, [k]: v } }))

  async function save() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch("/api/admin/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "خطأ غير متوقع")
      setMsg({ kind: "ok", text: `تم الحفظ ✓ قهوة ${form.date}` })
      setEditingId(null)
      await load()
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message })
    } finally { setBusy(false) }
  }

  function edit(row: Row) {
    const { _id, ...rest } = row
    setForm(rest as DailyDropInput)
    setEditingId(_id)
    setMsg(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function togglePublish(row: Row) {
    await fetch(`/api/admin/coffee/${row._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !row.published }),
    })
    await load()
  }

  async function remove(row: Row) {
    if (!confirm(`حذف قهوة ${row.date} نهائيًا؟`)) return
    await fetch(`/api/admin/coffee/${row._id}`, { method: "DELETE" })
    if (editingId === row._id) reset()
    await load()
  }

  function reset() {
    setForm({ ...EMPTY_DROP, date: todayISO() })
    setEditingId(null)
    setMsg(null)
  }

  return (
    <main className="dma" dir="rtl">
      <div className="dma__wrap">
        <header className="dma__head">
          <CoffeeCup size="sm" />
          <h1>لوحة قهوة اليوم</h1>
          <div className="dma__spacer" />
          <button className="dma__btn" onClick={reset}>+ يوم جديد</button>
          <a className="dma__btn" href="/coffee" target="_blank" rel="noreferrer">عرض الصفحة ↗</a>
        </header>

        <div className="dma__grid">
          {/* ═════ EDITOR ═════ */}
          <section className="dma__panel">
            <h2><span className="dma__dot" style={{ background: "var(--dm-gold)" }} />
              {editingId ? "تعديل يوم" : "إضافة يوم"}
            </h2>

            <div className="dma__row dma__row--2">
              <div className="dma__field">
                <label>التاريخ <span>*</span></label>
                <input type="date" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="dma__field">
                <label>الحالة</label>
                <label className="dma__switch" style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                  {form.published ? "منشور للجميع" : "مسودة (غير مرئي)"}
                </label>
              </div>
            </div>

            {/* ── 1. problem ── */}
            <div className="dma__section">
              <h2><span className="dma__dot" style={{ background: "var(--dm-gold)" }} />مسألة اليوم (English + LaTeX)</h2>

              <div className="dma__row dma__row--3">
                <div className="dma__field">
                  <label>Subject</label>
                  <input type="text" className="dma--ltr" placeholder="Functional Analysis"
                    value={form.problem.subject} onChange={(e) => setP("subject", e.target.value)} />
                </div>
                <div className="dma__field">
                  <label>Source</label>
                  <input type="text" className="dma--ltr" placeholder="Khenchela 2022"
                    value={form.problem.source} onChange={(e) => setP("source", e.target.value)} />
                </div>
                <div className="dma__field">
                  <label>الصعوبة</label>
                  <select value={form.problem.difficulty}
                    onChange={(e) => setP("difficulty", Number(e.target.value))}>
                    <option value={1}>★☆☆ سهل</option>
                    <option value={2}>★★☆ متوسط</option>
                    <option value={3}>★★★ صعب</option>
                  </select>
                </div>
              </div>

              <div className="dma__field" style={{ marginTop: 12 }}>
                <label>Statement <span>*</span></label>
                <textarea className="dma--ltr" dir="ltr" style={{ minHeight: 170 }}
                  placeholder={"Let $E$ be a Banach space...\n\n$$\\|T\\| \\le \\liminf_n \\|T_n\\| < +\\infty$$"}
                  value={form.problem.statement} onChange={(e) => setP("statement", e.target.value)} />
                <span className="dma__hint">
                  رياضيات داخل السطر: <code>$...$</code> · معادلة مستقلة: <code>$$...$$</code> · عريض: <code>**bold**</code> · مختصرات: <code>\R \N \L</code>
                </span>
              </div>

              <div className="dma__row dma__row--2" style={{ marginTop: 12 }}>
                <div className="dma__field">
                  <label>تلميح أول (عربي)</label>
                  <textarea value={form.problem.hint1 ?? ""} onChange={(e) => setP("hint1", e.target.value)} />
                </div>
                <div className="dma__field">
                  <label>فكرة البرهان (عربي)</label>
                  <textarea value={form.problem.hint2 ?? ""} onChange={(e) => setP("hint2", e.target.value)} />
                </div>
              </div>

              <div className="dma__field" style={{ marginTop: 12 }}>
                <label>Solution (English + LaTeX)</label>
                <textarea className="dma--ltr" dir="ltr"
                  value={form.problem.solution ?? ""} onChange={(e) => setP("solution", e.target.value)} />
              </div>
            </div>

            {/* ── 2. idea ── */}
            <div className="dma__section">
              <h2><span className="dma__dot" style={{ background: "var(--dm-mint)" }} />فكرة اليوم</h2>
              <div className="dma__field">
                <label>النص <span>*</span></label>
                <textarea placeholder="احفظ الفرضَ الذي لا يمكن حذفه..."
                  value={form.idea.text}
                  onChange={(e) => setForm({ ...form, idea: { text: e.target.value } })} />
                <span className="dma__hint">يُقبل <code>**عريض**</code> و<code>$رياضيات$</code>.</span>
              </div>
            </div>

            {/* ── 3. quote ── */}
            <div className="dma__section">
              <h2><span className="dma__dot" style={{ background: "var(--dm-lilac)" }} />مقولة اليوم</h2>
              <div className="dma__field">
                <label>المقولة <span>*</span></label>
                <textarea style={{ minHeight: 90 }} value={form.quote.text}
                  onChange={(e) => setForm({ ...form, quote: { ...form.quote, text: e.target.value } })} />
              </div>
              <div className="dma__field" style={{ marginTop: 12 }}>
                <label>القائل (اختياري)</label>
                <input type="text" value={form.quote.author ?? ""}
                  onChange={(e) => setForm({ ...form, quote: { ...form.quote, author: e.target.value } })} />
              </div>
            </div>

            <div className="dma__btns">
              <button className="dma__btn dma__btn--pri" onClick={save} disabled={busy}>
                {busy ? "جارٍ الحفظ…" : editingId ? "حفظ التعديلات" : "نشر قهوة اليوم"}
              </button>
              <button className="dma__btn" onClick={reset} disabled={busy}>تفريغ النموزج</button>
            </div>

            {msg && <div className={`dma__msg dma__msg--${msg.kind}`}>{msg.text}</div>}
          </section>

          {/* ═════ PREVIEW + LIST ═════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <section className="dma__panel">
              <h2><span className="dma__dot" style={{ background: "var(--dm-blue)" }} />معاينة مباشرة</h2>

              <div className="dma__prevlbl">Statement</div>
              <div className="dma__prev dma__prev--ltr">
                {form.problem.statement
                  ? <TexBlock source={form.problem.statement} dir="ltr" />
                  : <span style={{ color: "var(--dm-muted)" }}>—</span>}
              </div>

              {form.problem.solution && (<>
                <div className="dma__prevlbl">Solution</div>
                <div className="dma__prev dma__prev--ltr"><TexBlock source={form.problem.solution} dir="ltr" /></div>
              </>)}

              <div className="dma__prevlbl">فكرة اليوم</div>
              <div className="dma__prev dma__prev--rtl">
                {form.idea.text
                  ? <TexBlock source={form.idea.text} dir="rtl" />
                  : <span style={{ color: "var(--dm-muted)" }}>—</span>}
              </div>

              <div className="dma__prevlbl">مقولة اليوم</div>
              <div className="dma__prev dma__prev--rtl">
                {form.quote.text || <span style={{ color: "var(--dm-muted)" }}>—</span>}
                {form.quote.author && (
                  <div style={{ marginTop: 8, color: "var(--dm-muted)", fontSize: 13 }}>— {form.quote.author}</div>
                )}
              </div>
            </section>

            <section className="dma__panel">
              <h2><span className="dma__dot" style={{ background: "var(--dm-rose)" }} />كل الأيام ({rows.length})</h2>
              {rows.length === 0 && <p style={{ color: "var(--dm-muted)", fontSize: 14 }}>لا شيء بعد.</p>}
              <div className="dma__list">
                {rows.map((row) => (
                  <div key={row._id} className={`dma__item${editingId === row._id ? " is-active" : ""}`}>
                    <span className="dma__date">{row.date}</span>
                    <span className="dma__ttl">{row.problem?.subject || "—"} · {row.problem?.source}</span>
                    <span className={`dma__tag ${row.published ? "dma__tag--pub" : "dma__tag--draft"}`}>
                      {row.published ? "منشور" : "مسودة"}
                    </span>
                    <button className="dma__mini" onClick={() => edit(row)}>تعديل</button>
                    <button className="dma__mini" onClick={() => togglePublish(row)}>
                      {row.published ? "إخفاء" : "نشر"}
                    </button>
                    <button className="dma__mini dma__mini--danger" onClick={() => remove(row)}>حذف</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
