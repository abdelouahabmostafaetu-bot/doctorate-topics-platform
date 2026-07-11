import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TopicForm } from "@/components/admin/topic-form";
import { createTopicAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminNewTopicPage() {
  const [universities, specialties] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-2">
      <header className="text-center">
        <h1 className="text-2xl font-bold">➕ إضافة موضوع جديد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          أدخل بيانات المسابقة والتمارين. المدة تُضبط تلقائيًا (عامة 90 د /
          تخصص 180 د).
        </p>
        <Link
          href="/admin/topics"
          className="mt-2 inline-block text-sm text-muted-foreground transition hover:text-primary"
        >
          ← رجوع للقائمة
        </Link>
      </header>

      <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
        <TopicForm
          action={createTopicAction}
          universities={universities.map((u) => ({
            id: u.id,
            name: u.name,
            nameAr: u.nameAr,
          }))}
          specialties={specialties.map((s) => ({
            id: s.id,
            name: s.name,
            nameAr: s.nameAr,
          }))}
          submitLabel="إنشاء الموضوع"
        />
      </div>
    </main>
  );
}
