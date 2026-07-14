"use client";

// إشعار صغير قابل للإغلاق: رصيد النقاط + نظام النقاط — يحفظ الإغلاق في localStorage
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hidePointsNotice";

export function PointsNotice({ points }: { points: number }) {
  // نبدأ مخفيًا ثم نظهر بعد التحميل إذا لم يسبق إغلاقه — لتجنب ومضة الـ hydration
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // تجاهل — سيظهر مجددًا في الزيارة القادمة
    }
  }

  if (hidden) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-6 text-muted-foreground">
      <p>
        ⭐ رصيدك: <strong className="text-primary">{points}</strong> نقطة —
        موضوع LaTeX يُنشر <strong>فورًا</strong> وتحصل على{" "}
        <strong>+100</strong> نقطة مباشرة · الملفات تُراجع من الإدارة · المكرر
        أو المرفوض تُسترجع نقاطه.{" "}
        <Link
          href="/contributors"
          className="text-primary underline-offset-2 hover:underline"
        >
          لوحة المساهمين ←
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="إغلاق الإشعار"
        title="إغلاق"
        className="shrink-0 rounded p-0.5 leading-none text-muted-foreground transition hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}
