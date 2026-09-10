import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { TopicForm } from "@/components/admin/topic-form";
import { AzureTopicFileUpload } from "@/components/admin/azure-topic-file-upload";
import type { EditorProblem } from "@/components/admin/problems-editor";
import {
  updateTopicFullAction,
  deleteTopicFileAction,
  deleteTopicAction,
} from "../actions";

export const dynamic = "force-dynamic";
type TopicFileInfo = { url: string; fileName: string; sizeBytes: number };

function FileSlot({ label, kind, file, topicId, topicSlug }: {
  label: string;
  kind: "exam_pdf" | "solution_pdf";
  file?: TopicFileInfo;
  topicId: string;
  topicSlug: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{label}</div>
        <span className="rounded-full bg-[#f1f1ef] px-2 py-0.5 text-[10px] text-[#787774] dark:bg-[#333] dark:text-[#b8b8b8]">Azure</span>
      </div>
      {file ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <Link href={`/topics/${topicSlug}`} className="truncate text-primary hover:underline" dir="ltr">{file.fileName}</Link>
          <ConfirmActionButton action={deleteTopicFileAction.bind(null, topicId, kind)} confirmText="حذف هذا الملف من Azure؟" label="حذف" />
        </div>
      ) : <p className="mt-2 text-xs text-muted-foreground">لا يوجد ملف مرفوع</p>}
      <AzureTopicFileUpload topicId={topicId} kind={kind} hasFile={Boolean(file)} />
      <p className="mt-2 text-[10px] text-muted-foreground">يرفع الملف الكامل مباشرة من المتصفح إلى Azure، بحد أقصى 500 م.ب.</p>
    </div>
  );
}

export default async function AdminTopicEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [topic, universitiesRaw, specialtiesRaw] = await Promise.all([
    prisma.topic.findUnique({ where: { id }, include: { university: true, specialty: true } }),
    prisma.university.findMany({ orderBy: { name: "asc" } }),
    prisma.specialty.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!topic) notFound();
  const universities = universitiesRaw.map((u) => ({ id: u.id, name: u.name, nameAr: u.nameAr }));
  const specialties = specialtiesRaw.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr }));
  const initialProblems: EditorProblem[] = topic.problems.map((p) => ({
    problemNumber: p.problemNumber,
    title: p.title,
    difficulty: (["easy", "medium", "hard"] as const).includes(p.difficulty as "easy" | "medium" | "hard") ? p.difficulty as "easy" | "medium" | "hard" : "medium",
    tags: p.tags.join(", "), statement: p.statement, solution: p.solution ?? "", remark: p.remark ?? null,
  }));
  const examFile = topic.files.find((f) => f.kind === "exam_pdf");
  const solutionFile = topic.files.find((f) => f.kind === "solution_pdf");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">تعديل: {topic.title}</h2>
        <a href="/admin/topics" className="text-sm text-muted-foreground hover:text-primary">← رجوع للقائمة</a>
      </div>
      <p className="text-sm text-muted-foreground">{topic.university.nameAr} · {topic.specialty.nameAr} · {topic.year} · {topic.problems.length} تمرين</p>
      <TopicForm
        action={updateTopicFullAction}
        universities={universities}
        specialties={specialties}
        initial={{
          id: topic.id, title: topic.title, universityId: topic.universityId,
          specialtyId: topic.specialtyId, year: topic.year,
          examType: topic.examType as "general" | "specialty",
          examNumber: topic.examNumber, coefficient: topic.coefficient,
          durationMinutes: topic.durationMinutes, status: topic.status,
          source: topic.source ?? "", problems: initialProblems,
        }}
        submitLabel="حفظ التعديلات"
      />
      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">ملفات الاختبار الكاملة على Azure</h3>
        <p className="mt-1 text-xs text-muted-foreground">تُحفظ الملفات داخل حاوية exams في حساب Azure نفسه وتُقرأ مباشرة عبر رابط SAS آمن.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FileSlot label="ملف الموضوع" kind="exam_pdf" file={examFile} topicId={topic.id} topicSlug={topic.slug} />
          <FileSlot label="ملف الحل" kind="solution_pdf" file={solutionFile} topicId={topic.id} topicSlug={topic.slug} />
        </div>
      </div>
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
        <h3 className="font-semibold text-destructive">منطقة الخطر</h3>
        <p className="mt-1 text-sm text-muted-foreground">حذف الموضوع نهائي ولا يمكن التراجع عنه.</p>
        <div className="mt-3"><ConfirmActionButton action={deleteTopicAction.bind(null, topic.id)} confirmText={`حذف "${topic.title}" نهائيًا؟`} label="حذف الموضوع" redirectTo="/admin/topics" className="rounded-md border border-destructive px-4 py-1.5 text-sm text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50" /></div>
      </div>
    </div>
  );
}
