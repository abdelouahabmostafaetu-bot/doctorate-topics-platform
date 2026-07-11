"use client";

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
      aria-label="تبديل الوضع الليلي"
      title="الوضع الليلي / النهاري"
      className="rounded-md border px-2 py-1.5 text-base leading-none transition hover:border-primary"
    >
      {mounted && dark ? "☀️" : "🌙"}
    </button>
  );
}
