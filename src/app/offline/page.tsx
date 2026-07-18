import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لا يوجد اتصال",
  robots: { index: false, follow: false },
};

// صفحة عدم الاتصال — يعرضها عامل الخدمة عند انقطاع الإنترنت
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="text-6xl">📡</span>
      <h1 className="mt-6 text-xl font-bold">لا يوجد اتصال بالإنترنت</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        تحقق من اتصالك ثم أعد المحاولة.
        <br />
        الصفحات التي زرتها سابقًا قد تبقى متاحة بدون إنترنت.
      </p>
      <a
        href="/"
        className="mt-8 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        ⭯ إعادة المحاولة
      </a>
    </div>
  );
}
