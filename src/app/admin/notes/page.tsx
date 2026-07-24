// صفحة «ملاحظاتي» — للمدير الأعلى فقط (SUPER_ADMIN)
// تقرأ كل الدفاتر والملاحظات من قاعدة mylibrary القديمة وتتيح الإدارة الكاملة
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadMyNotesData } from "@/lib/mylibrary";
import { NotesClient } from "./notes-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "📝 ملاحظاتي — لوحة الإدارة",
};

export default async function AdminNotesPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

  try {
    const data = await loadMyNotesData();
    return <NotesClient initialData={data} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : "خطأ غير معروف";
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="text-3xl">🔌</div>
        <h2 className="mt-2 text-base font-bold">تعذّر الاتصال بقاعدة mylibrary</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          تأكد من وجود <code className="rounded bg-muted px-1">DATABASE_URL_MYLIBRARY</code>{" "}
          في ملف <code className="rounded bg-muted px-1">.env</code> محليًا وفي إعدادات
          Environment Variables على Vercel، وأن عنوان الخادم مسموح له في Network Access على
          MongoDB Atlas.
        </p>
      </div>
    );
  }
}
