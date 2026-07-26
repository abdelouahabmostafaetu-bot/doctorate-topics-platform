"use client"

import { useState } from "react"

/** 📤 Share today's coffee — native share sheet on phones, clipboard on desktop. */
export default function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = "https://www.docmathdz.dev/coffee"
    const text = "☕ قهوة الدكتوراه — مسألةٌ وفكرةٌ ومقولة، كلَّ صباح على DocMath DZ"
    try {
      if (navigator.share) {
        await navigator.share({ title: "قهوة الدكتوراه", text, url })
        return
      }
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* user cancelled the share sheet — nothing to do */
    }
  }

  return (
    <button className="dm-share" onClick={share}>
      {copied ? "✓ نُسِخ الرابط" : "شارِك قهوةَ اليوم مع زملائك"}
    </button>
  )
}
