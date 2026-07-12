"use client";

// تنبيه الذكاء الاصطناعي في صفحة الموضوع — قابل للإغلاق،
// وإذا أغلقه المستخدم لا يظهر مجددًا إلا بعد 24 ساعة
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "hideTopicAiNoticeUntil";
const HIDE_MS = 24 * 60 * 60 * 1000; // يوم كامل

export function TopicAiNotice() {
  // نبدأ مخفيًا ثم نظهر بعد التحميل إذا انتهت مدة الإخفاء — لتجنب ومضة الـ hydration
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      setHidden(Date.now() < until);
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + HIDE_MS));
    } catch {
      // تجاهل — سيظهر مجددًا في الزيارة القادمة
    }
  }

  if (hidden) return null;

  return (
    <div className="mt-4 flex items-start justify-between gap-3 rounded-md border-s-2 border-amber-400 bg-amber-500/10 px-3 py-2 text-xs leading-6 text-amber-900 dark:text-amber-100">
      <p>
        <strong>تنبيه:</strong> تمت إعادة كتابة هذا الموضوع باستخدام الذكاء
        الاصطناعي، وقد يكون الحل المرفق مولّدًا بالذكاء الاصطناعي. تحقق من
        صحته قبل الاعتماد عليه، وأبلغ عن أي خطأ.{" "}
        <Link href="/about#ai-notice" className="font-medium underline">
          التفاصيل
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="إخفاء التنبيه لمدة يوم"
        title="إخفاء التنبيه لمدة يوم"
        className="shrink-0 rounded p-0.5 leading-none transition hover:opacity-70"
      >
        ✕
      </button>
    </div>
  );
}
