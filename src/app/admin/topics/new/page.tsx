import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTopicAction } from "../actions";
import { AdminTopicForm } from "@/components/admin/topic-form";

export const dynamic = "force-dynamic";

const emptyTopicFieldValues = {
  title: "",
  universityId: "",
  specialtyId: "",
  year: "",
  examType: "general",
  status: "published",
  examNumber: "",
  coefficient: "",
  durationMinutes: "",
  source: "",
};

export default async function NewTopicPage() {
  const session = await auth();
  const [universities, specialties] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">إضافة موضوع جديد</h2>
        <a
          href="/admin/topics"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          → رجوع للقائمة
        </a>
      </div>

      {universities.length === 0 || specialties.length === 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          يجب وجود جامعة واحدة وتخصّص واحد على الأقل قبل إضافة موضوع. أضف
          الجامعات من صفحة الإدارة ← الجامعات.
        </div>
      ) : null}

      <AdminTopicForm
        formId="admin-topic-new"
        action={createTopicAction}
        universities={universities.map((u) => ({ id: u.id, label: u.nameAr }))}
        specialties={specialties.map((s) => ({ id: s.id, label: s.nameAr }))}
        defaultValues={emptyTopicFieldValues}
        initialProblems={[]}
        submitLabel="إنشاء الموضوع"
        isLoggedIn={Boolean(session?.user)}
        titleHint="تُحفظ مسوحة هذا النموذج تلقائيًا كل 3 ثوانٍ حتى لا تفقد عملك."
      />
    </div>
  );
}
