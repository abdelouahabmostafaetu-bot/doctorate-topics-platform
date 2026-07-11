import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  updateTopicDetailsAction,
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
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { university: true, specialty: true },
  });
  if (!topic) notFound();

  const examFile = topic.files.find((f) => f.kind === "exam_pdf");
  const solutionFile = topic.files.find((f) => f.kind === "solution_pdf");

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

      <form
        action={updateTopicDetailsAction}
        className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={topic.id} />
        <label className="text-sm sm:col-span-2">
          العنوان
          <input
            name="title"
            defaultValue={topic.title}
            dir="auto"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          الحالة
          <select
            name="status"
            defaultValue={topic.status}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="published">منشور</option>
            <option value="draft">مسوحة</option>
            <option value="needs_completion">يحتاج تكميلًا</option>
          </select>
        </label>
        <label className="text-sm">
          رقم الموضوع
          <input
            type="number"
            name="examNumber"
            defaultValue={topic.examNumber ?? ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          المعامل
          <input
            type="number"
            name="coefficient"
            defaultValue={topic.coefficient ?? ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          المدة (بالدقائق)
          <input
            type="number"
            name="durationMinutes"
            defaultValue={topic.durationMinutes ?? ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            حفظ التعديلات
          </button>
        </div>
      </form>

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
