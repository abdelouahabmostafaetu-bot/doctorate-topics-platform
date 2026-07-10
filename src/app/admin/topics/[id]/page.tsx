import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { AdminTopicForm } from "@/components/admin/topic-form";
import type { EditableProblem } from "@/components/admin/problems-editor";
import {
  updateTopicFullAction,
  uploadTopicFileAction,
  deleteTopicFileAction,
  deleteTopicAction,
} from "../actions";

export const dynamic = "force-dynamic";

type TopicFileInfo = { url: string; fileName: string; sizeBytes: number };

function FileSlot({
  label,
  kind,
  file,
  topicId,
}: {
  label: string;
  kind: "exam_pdf" | "solution_pdf";
  file?: TopicFileInfo;
  topicId: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm font-medium">{label}</div>
      {file ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-primary hover:underline"
            dir="ltr"
          >
            {file.fileName}
          </a>
          <ConfirmActionButton
            action={deleteTopicFileAction.bind(null, topicId, kind)}
            confirmText="حذف هذا الملف؟"
            label="حذف"
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">لا يوجد ملف مرفوع</p>
      )}
      <form
        action={uploadTopicFileAction}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="id" value={topicId} />
        <input type="hidden" name="kind" value={kind} />
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="max-w-[180px] text-xs"
        />
        <button
          type="submit"
          className="rounded-md border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
        >
          {file ? "استبدال" : "رفع"}
        </button>
      </form>
    </div>
  );
}

export default async function AdminTopicEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, topic] = await Promise.all([
    auth(),
    prisma.topic.findUnique({
      where: { id },
      include: { university: true, specialty: true },
    }),
  ]);
  if (!topic) notFound();

  const examFile = topic.files.find((f) => f.kind === "exam_pdf");
  const solutionFile = topic.files.find((f) => f.kind === "solution_pdf");

  const [universities, specialties] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  // تجهيز تمارين الموضوع الحالية لمحرّر LaTeX (الوسوم تُعاد إلى نص مفصول بفواصل)
  const editableProblems: EditableProblem[] = topic.problems.map((p) => ({
    problemNumber: p.problemNumber,
    title: p.title,
    difficulty: p.difficulty,
    tags: p.tags.join(", "),
    statement: p.statement,
    solution: p.solution ?? "",
    remark: p.remark ?? "",
  }));

  const topicFieldValues = {
    title: topic.title,
    universityId: topic.universityId,
    specialtyId: topic.specialtyId,
    year: String(topic.year),
    examType: topic.examType,
    status: topic.status,
    examNumber: topic.examNumber != null ? String(topic.examNumber) : "",
    coefficient: topic.coefficient != null ? String(topic.coefficient) : "",
    durationMinutes:
      topic.durationMinutes != null ? String(topic.durationMinutes) : "",
    source: topic.source ?? "",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">تعديل: {topic.title}</h2>
        <a
          href="/admin/topics"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          → رجوع للقائمة
        </a>
      </div>

      <p className="text-sm text-muted-foreground">
        {topic.university.nameAr} · {topic.specialty.nameAr} · {topic.year}
      </p>

      <AdminTopicForm
        formId={`admin-topic-edit-${topic.id}`}
        action={updateTopicFullAction}
        hiddenId={topic.id}
        universities={universities.map((u) => ({ id: u.id, label: u.nameAr }))}
        specialties={specialties.map((s) => ({ id: s.id, label: s.nameAr }))}
        defaultValues={topicFieldValues}
        initialProblems={editableProblems}
        submitLabel="حفظ التعديلات"
        isLoggedIn={Boolean(session?.user)}
        titleHint="تُحفظ مسودة تعديلاتك تلقائيًا كل 3 ثوانٍ حتى لا تفقد عملك."
      />

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">الملفات المرفقة (PDF)</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FileSlot
            label="ملف الموضوع"
            kind="exam_pdf"
            file={examFile}
            topicId={topic.id}
          />
          <FileSlot
            label="ملف الحل"
            kind="solution_pdf"
            file={solutionFile}
            topicId={topic.id}
          />
        </div>
      </div>

      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <h3 className="font-semibold text-destructive">منطقة الخطر</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          حذف الموضوع نهائي ولا يمكن التراجع عنه.
        </p>
        <div className="mt-3">
          <ConfirmActionButton
            action={deleteTopicAction.bind(null, topic.id)}
            confirmText={`حذف "${topic.title}" نهائيًا؟`}
            label="حذف الموضوع"
            redirectTo="/admin/topics"
            className="rounded-md border border-destructive px-4 py-1.5 text-sm text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
