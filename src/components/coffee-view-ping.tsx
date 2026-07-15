"use client";

import { useEffect } from "react";

// يسجّل زيارة واحدة لصفحة القهوة لكل جلسة متصفح (لا يحسب التحديثات المكررة)
export function CoffeeViewPing() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("coffee_viewed")) return;
      sessionStorage.setItem("coffee_viewed", "1");
    } catch {
      // sessionStorage غير متاح — نسجل الزيارة على أي حال
    }
    fetch("/api/coffee-stat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view" }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);
  return null;
}
