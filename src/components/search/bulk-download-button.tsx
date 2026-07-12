"use client";

// زر تحميل كل مواضيع الفلترة في ملف PDF واحد (للأعضاء فقط — بدون حلول)
import Link from "next/link";
import { useState } from "react";

const btnClass =
  "inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-wait disabled:opacity-60";

export function BulkDownloadButton({
  university,
  specialty,
  year,
  count,
  isLoggedIn,
}: {
  university: string;
  specialty: string;
  year: string;
  count: number;
  isLoggedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  // غير مسجّل؟ التحميل الجماعي للأعضاء فقط
  if (!isLoggedIn) {
    return (
      <Link
        href="/signin"
        title="التحميل الجماعي متاح للأعضاء المسجلين فقط"
        className={btnClass}
      >
        ⬇️ تحميل الكل ({count}) — سجّل دخولك
      </Link>
    );
  }

  async function download() {
    setState("working");
    try {
      const params = new URLSearchParams();
      if (university) params.set("university", university);
      if (specialty) params.set("specialty", specialty);
      if (year) params.set("year", year);
      const res = await fetch("/api/pdf/bulk?" + params.toString());
      if (!res.ok) throw new Error("bulk failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recueil-doctorat-" + count + "-sujets.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={state === "working"}
      title="ملف PDF واحد: غلاف + فهرس + كل موضوع في صفحة مستقلة — بدون حلول"
      className={btnClass}
    >
      {state === "working"
        ? "⏳ جارٍ تجهيز الملف... قد يستغرق دقيقة"
        : state === "error"
          ? "⚠️ تعذّر — اضغط للمحاولة مجددًا"
          : `⬇️ تحميل الكل (${count}) PDF`}
    </button>
  );
}
