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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">إضافة موضوع جديد</h2>
        <Link
          href="/admin/topics"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          → رجوع للقائمة
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        أدخل بيانات المسابقة والتمارين. المدة تُضبط تلقائيًا (عامة 90 د / تخصص 180 د).
      </p>
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
  );
}
