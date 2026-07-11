"use client";

// زر تبديل الوضع الداكن/الفاتح (v2) — يحفظ الاختيار في localStorage
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // نتجاهل — التفضيل لن يُحفظ لكن التبديل يعمل
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تبديل الوضع الداكن"
      title="تبديل الوضع الداكن"
      className="rounded-md border px-2.5 py-1.5 text-sm transition hover:border-primary hover:text-primary"
    >
      {mounted && dark ? "☀️" : "🌙"}
    </button>
  );
}
