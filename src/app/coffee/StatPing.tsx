"use client"

import { useEffect } from "react"

/**
 * 📈 Counts one page visit in /api/coffee-stat ({ type: "view" }) —
 * the same counter shown in the admin as "زيارة لصفحة القهوة".
 * Renders nothing.
 */
export default function StatPing() {
  useEffect(() => {
    fetch("/api/coffee-stat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view" }),
    }).catch(() => {})
  }, [])

  return null
}
