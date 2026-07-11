import Link from "next/link";

export function AiNoticeBanner() {
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-start sm:justify-between">
      <p>
        <span className="font-semibold">⚠️ تنبيه:</span> تمت إعادة كتابة هذا
        الموضوع باستخدام الذكاء الاصطناعي، وقد يكون الحل المرفق مولدًا بالذكاء
        الاصطناعي. يُنصح بالتحقق من صحته قبل الاعتماد عليه، والإبلاغ عن أي خطأ
        عبر نموذج «الإبلاغ عن خطأ» أسفل هذه الصفحة.
      </p>
      <Link
        href="/about#ai-notice"
        className="shrink-0 self-start rounded-md border border-amber-400 px-3 py-1 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
      >
        اعرف المزيد
      </Link>
    </div>
  );
}
