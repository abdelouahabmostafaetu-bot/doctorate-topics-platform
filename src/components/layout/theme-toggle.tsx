"use client";

// زر صغير لتبديل الوضع الداكن/الفاتح — يحفظ الاختيار في localStorage
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      // تجاهل أخطاء التخزين المحلي
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="تبديل الوضع الداكن"
      title="الوضع الداكن / الفاتح"
      className="rounded-full p-1 text-sm leading-none transition hover:bg-secondary"
    >
      {mounted && dark ? "☀️" : "🌙"}
    </button>
  );
}
