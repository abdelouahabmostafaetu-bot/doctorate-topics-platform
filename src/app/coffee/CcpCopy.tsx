"use client"

import { useState } from "react"

/** 📋 CCP number with one-tap copy.
 * Every successful copy pings /api/coffee-stat so the counter in
 * /admin/coffee-support ("نسخ حساب CCP") keeps increasing — same counter,
 * same admin page as before.
 *
 * ⚠️ If the counter does NOT increase after deploy, your old page used a
 * different body shape. Run this in PowerShell and send me the output:
 *   Select-String -Pattern "coffee-stat" -Path "D:\doctorate-topics-platform\docs\coffee-old-page-backup\*" -Recurse
 */
const CCP = "00799999002781033371"

export default function CcpCopy() {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle")

  const grouped = CCP.replace(/(\d{4})(?=\d)/g, "$1 ")

  async function copy() {
    try {
      await navigator.clipboard.writeText(CCP)
      setState("ok")
      setTimeout(() => setState("idle"), 2600)
      // +1 in the admin counter — fire and forget, never blocks the UI
      fetch("/api/coffee-stat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ccp_copy" }),
      }).catch(() => {})
    } catch {
      setState("err")
      setTimeout(() => setState("idle"), 2600)
    }
  }

  return (
    <div className="dm-ccp">
      <div className="dm-ccp__row" dir="ltr">
        <span className="dm-ccp__tag">CCP</span>
        <span className="dm-ccp__num">{grouped}</span>
      </div>
      <button className="dm-ccp__btn" onClick={copy} aria-live="polite">
        {state === "ok"
          ? "✓ تمَّ النسخ — شكرًا لك 🤍"
          : state === "err"
            ? "تعذَّر النسخ — انسخه يدويًّا"
            : "📋 انسخ رقم الحساب"}
      </button>
    </div>
  )
}
