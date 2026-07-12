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
    <main className="mx-auto max-w-3xl py-2">
      {/* رأس صغير بنفس أسلوب صفحة ساهم معنا */}
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-base font-bold">➕ إضافة موضوع جديد</h1>
        <Link
          href="/admin/topics"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          ← رجوع للقائمة
        </Link>
      </header>
      <p className="mt-1 text-[11px] text-muted-foreground">
        نفس محرر صفحة المساهمة: اكتب التمارين بصيغة LaTeX مع معاينة فورية.
        المدة تُضبط تلقائيًا (عامة 90 د / تخصص 180 د).
      </p>

      <div className="mt-4 h-px bg-gradient-to-l from-primary/40 via-border to-transparent" />

      <div className="mt-4">
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
