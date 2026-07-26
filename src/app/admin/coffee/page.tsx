"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "katex/dist/katex.min.css"
import "./admin.css"
import CoffeeCup from "@/components/coffee/CoffeeCup"
import { TexBlock } from "@/components/coffee/Tex"
import { EMPTY_DROP, type DailyDropInput } from "@/lib/coffee/types"

type Row = DailyDropInput & { _id: string }
type Tab = "problem" | "idea" | "quote"

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers" }).format(new Date())
}

const SNIPPETS = [
  { label: "$x$", insert: "$x$" },
  { label: "$$…$$", insert: "$$\n\n$$" },
  { label: "\\frac", insert: "\\frac{a}{b}" },
  { label: "\\sum", insert: "\\sum_{n=1}^{+\\infty}" },
  { label: "\\int", insert: "\\int_0^1" },
  { label: "\\lim", insert: "\\lim_{n \\to \\infty}" },
  { label: "\\|·\\|", insert: "\\|T\\|" },
  { label: "\\R", insert: "\\R" },
  { label: "**b**", insert: "**bold**" },
]

export default function AdminCoffeePage() {
  const [form, setForm] = useState<DailyDropInput>({ ...EMPTY_DROP, date: todayISO() })
  const [rows, setRows] = useState<Row[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("problem")
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const stmtRef = useRef<HTMLTextAreaElement | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/coffee", { cache: "no-store" })
      if (!r.ok) throw new Error("unauthorized")
      const d = await r.json()
      setRows(d.items ?? [])
    } catch {
      setMsg({ kind: "err", text: "تعذر تحميل القائمة — تحقق من تسجيل الدخول" })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setP = (k: keyof DailyDropInput["problem"], v: unknown) =>
    setForm((f) => ({ ...f, problem: { ...f.problem, [k]: v } }))

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) =>
      [r.date, r.problem?.subject, r.problem?.source, r.idea?.text, r.quote?.text]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(t)),
    )
  }, [rows, q])

  const published = rows.filter((r) => r.published).length
  const hasToday = rows.some((r) => r.date === todayISO() && r.published)

  function insertSnippet(text: string) {
    const el = stmtRef.current
    const cur = form.problem.statement ?? ""
    if (!el) return setP("statement", cur + text)
    const s = el.selectionStart ?? cur.length
    const e = el.selectionEnd ?? cur.length
    setP("statement", cur.slice(0, s) + text + cur.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = s + text.length
    })
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch("/api/admin/coffee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? "خطأ غير متوقع")
      setMsg({ kind: "ok", text: `حُفِظ ✓ ${form.date}` })
      setEditingId(null)
      await load()
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message })
    } finally {
      setBusy(false)
    }
  }

  function edit(row: Row) {
    const { _id, ...rest } = row
    setForm(rest as DailyDropInput)
    setEditingId(_id)
    setTab("problem")
    setMsg(null)
  }

  function duplicate(row: Row) {
    const { _id, ...rest } = row
    setForm({ ...(rest as DailyDropInput), date: todayISO(), published: false })
    setEditingId(null)
    setMsg({ kind: "ok", text: "نُسِخَت كمسودة — غير التاريخ واحفظ" })
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
    setTab("problem")
    setMsg(null)
  }

  return (
    <div className="ac" dir="rtl">
      {/* ═════ TOOLBAR ═════ */}
      <div className="ac__bar">
        <div className="ac__brand">
          <CoffeeCup size="sm" />
          <h1>قهوة اليوم</h1>
        </div>
        <div className="ac__sep" />
        <span className="ac__crumb">Admin / Coffee</span>
        <div className="ac__spacer" />
        <span className="ac__crumb">{hasToday ? "● today published" : "○ today missing"}</span>
        <button className="ac__btn ac__btn--sm" onClick={reset}>
          + جديد
        </button>
        <a className="ac__btn ac__btn--sm" href="/coffee" target="_blank" rel="noreferrer">
          معاينة ↗
        </a>
      </div>

      <div className="ac__body">
        {/* ═════ COL 1 · LIST ═════ */}
        <aside className="ac__col">
          <div className="ac__ch">
            <span className="ac__dot" style={{ background: "var(--ac-rose)" }} />
            <h2>الأيام</h2>
            <span className="ac__en">{rows.length} total</span>
          </div>

          <div className="ac__stats">
            <div className="ac__stat">
              <div className="ac__statn">{published}</div>
              <div className="ac__statl">published</div>
            </div>
            <div className="ac__stat">
              <div className="ac__statn">{rows.length - published}</div>
              <div className="ac__statl">drafts</div>
            </div>
          </div>

          <div className="ac__search">
            <input
              type="text"
              placeholder="بحث…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="ac__empty">لا نتائج</p>
          ) : (
            <div className="ac__list">
              {filtered.map((row) => (
                <div
                  key={row._id}
                  className={`ac__row${editingId === row._id ? " is-on" : ""}`}
                  onClick={() => edit(row)}
                >
                  <span className={`ac__pip ac__pip--${row.published ? "on" : "off"}`} />
                  <div className="ac__rowmain">
                    <div className="ac__rowdate">{row.date}</div>
                    <div className="ac__rowsub">
                      {row.problem?.subject || "—"}
                      {row.problem?.source ? ` · ${row.problem.source}` : ""}
                    </div>
                  </div>
                  <div className="ac__rowact">
                    <button
                      className="ac__ico"
                      title={row.published ? "إخفاء" : "نشر"}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePublish(row)
                      }}
                    >
                      {row.published ? "●" : "○"}
                    </button>
                    <button
                      className="ac__ico"
                      title="نسخ"
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicate(row)
                      }}
                    >
                      ⧉
                    </button>
                    <button
                      className="ac__ico ac__ico--danger"
                      title="حذف"
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(row)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ═════ COL 2 · EDITOR ═════ */}
        <section className="ac__col">
          <div className="ac__ch">
            <span className="ac__dot" style={{ background: "var(--ac-gold)" }} />
            <h2>{editingId ? `تعديل · ${form.date}` : "إضافة يوم"}</h2>
            <span className="ac__en">Editor</span>
          </div>

          <div className="ac__grid ac__grid--2" style={{ marginBottom: 14 }}>
            <div className="ac__f">
              <label>
                التاريخ <i>*</i>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="ac__f">
              <label>الحالة</label>
              <label className="ac__sw" style={{ paddingTop: 5 }}>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                <span>{form.published ? "منشور" : "مسودة"}</span>
              </label>
            </div>
          </div>

          {/* tabs */}
          <div className="ac__tabs">
            <button
              className={`ac__tab${tab === "problem" ? " is-on" : ""}`}
              onClick={() => setTab("problem")}
            >
              مسألة <small>LaTeX</small>
            </button>
            <button
              className={`ac__tab${tab === "idea" ? " is-on" : ""}`}
              onClick={() => setTab("idea")}
            >
              فكرة
            </button>
            <button
              className={`ac__tab${tab === "quote" ? " is-on" : ""}`}
              onClick={() => setTab("quote")}
            >
              مقولة
            </button>
          </div>

          {/* ── tab: problem ── */}
          {tab === "problem" && (
            <>
              <div className="ac__grid ac__grid--3">
                <div className="ac__f">
                  <label>Subject</label>
                  <input
                    type="text"
                    className="ac--ltr"
                    placeholder="Functional Analysis"
                    value={form.problem.subject}
                    onChange={(e) => setP("subject", e.target.value)}
                  />
                </div>
                <div className="ac__f">
                  <label>Source</label>
                  <input
                    type="text"
                    className="ac--ltr"
                    placeholder="Khenchela 2022"
                    value={form.problem.source}
                    onChange={(e) => setP("source", e.target.value)}
                  />
                </div>
                <div className="ac__f">
                  <label>الصعوبة</label>
                  <select
                    value={form.problem.difficulty}
                    onChange={(e) => setP("difficulty", Number(e.target.value))}
                  >
                    <option value={1}>★☆☆</option>
                    <option value={2}>★★☆</option>
                    <option value={3}>★★★</option>
                  </select>
                </div>
              </div>

              <div className="ac__f" style={{ marginTop: 10 }}>
                <label>
                  Statement <i>*</i>
                  <span className="ac__count">{form.problem.statement.length}</span>
                </label>
                <div className="ac__snips">
                  {SNIPPETS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      className="ac__snip"
                      onClick={() => insertSnippet(s.insert)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={stmtRef}
                  className="ac--ltr ac--tall"
                  dir="ltr"
                  placeholder={"Let $E$ be a Banach space…"}
                  value={form.problem.statement}
                  onChange={(e) => setP("statement", e.target.value)}
                />
                <span className="ac__note">
                  <code>$…$</code> داخل السطر · <code>$$…$$</code> معادلة مستقلة ·{" "}
                  <code>**bold**</code> · مختصرات: <code>\R \N \L</code>
                </span>
              </div>

              <div className="ac__grid ac__grid--2" style={{ marginTop: 10 }}>
                <div className="ac__f">
                  <label>تلميح أول</label>
                  <textarea
                    value={form.problem.hint1 ?? ""}
                    onChange={(e) => setP("hint1", e.target.value)}
                  />
                </div>
                <div className="ac__f">
                  <label>فكرة البرهان</label>
                  <textarea
                    value={form.problem.hint2 ?? ""}
                    onChange={(e) => setP("hint2", e.target.value)}
                  />
                </div>
              </div>

              <div className="ac__f" style={{ marginTop: 10 }}>
                <label>Solution</label>
                <textarea
                  className="ac--ltr"
                  dir="ltr"
                  value={form.problem.solution ?? ""}
                  onChange={(e) => setP("solution", e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── tab: idea ── */}
          {tab === "idea" && (
            <div className="ac__f">
              <label>
                فكرة اليوم <i>*</i>
                <span className="ac__count">{form.idea.text.length}</span>
              </label>
              <textarea
                className="ac--tall"
                placeholder="احفظ **الفرضَ الذي لا يمكن حذفه** مع كل مبرهنة…"
                value={form.idea.text}
                onChange={(e) => setForm({ ...form, idea: { text: e.target.value } })}
              />
              <span className="ac__note">
                يُقبل <code>**عريض**</code> و <code>$رياضيات$</code>.
              </span>
            </div>
          )}

          {/* ── tab: quote ── */}
          {tab === "quote" && (
            <>
              <div className="ac__f">
                <label>
                  المقولة <i>*</i>
                  <span className="ac__count">{form.quote.text.length}</span>
                </label>
                <textarea
                  value={form.quote.text}
                  onChange={(e) =>
                    setForm({ ...form, quote: { ...form.quote, text: e.target.value } })
                  }
                />
              </div>
              <div className="ac__f" style={{ marginTop: 10 }}>
                <label>القائل</label>
                <input
                  type="text"
                  value={form.quote.author ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, quote: { ...form.quote, author: e.target.value } })
                  }
                />
              </div>
            </>
          )}

          <div className="ac__actions">
            <button className="ac__btn ac__btn--pri" onClick={save} disabled={busy}>
              {busy ? "جارٍ…" : editingId ? "حفظ التعديلات" : "حفظ ونشر"}
            </button>
            <button className="ac__btn" onClick={reset} disabled={busy}>
              تفريغ
            </button>
            {msg && <div className={`ac__msg ac__msg--${msg.kind}`}>{msg.text}</div>}
          </div>
        </section>

        {/* ═════ COL 3 · LIVE PREVIEW ═════ */}
        <aside className="ac__col">
          <div className="ac__ch">
            <span className="ac__dot" style={{ background: "var(--ac-blue)" }} />
            <h2>معاينة مباشرة</h2>
            <span className="ac__en">Live</span>
          </div>

          <div className="ac__pvl">Statement</div>
          <div className="ac__pv ac__pv--ltr">
            {form.problem.statement ? (
              <TexBlock source={form.problem.statement} dir="ltr" />
            ) : (
              <span className="ac__dash">—</span>
            )}
          </div>

          {form.problem.hint1 && (
            <>
              <div className="ac__pvl">تلميح أول</div>
              <div className="ac__pv ac__pv--rtl">
                <TexBlock source={form.problem.hint1} dir="rtl" />
              </div>
            </>
          )}

          {form.problem.solution && (
            <>
              <div className="ac__pvl">Solution</div>
              <div className="ac__pv ac__pv--ltr">
                <TexBlock source={form.problem.solution} dir="ltr" />
              </div>
            </>
          )}

          <div className="ac__pvl">فكرة اليوم</div>
          <div className="ac__pv ac__pv--rtl">
            {form.idea.text ? (
              <TexBlock source={form.idea.text} dir="rtl" />
            ) : (
              <span className="ac__dash">—</span>
            )}
          </div>

          <div className="ac__pvl">مقولة اليوم</div>
          <div className="ac__pv ac__pv--rtl">
            {form.quote.text ? (
              <>
                «{form.quote.text}»
                {form.quote.author && (
                  <div style={{ marginTop: 6, color: "var(--ac-faint)", fontSize: 11.5 }}>
                    — {form.quote.author}
                  </div>
                )}
              </>
            ) : (
              <span className="ac__dash">—</span>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
