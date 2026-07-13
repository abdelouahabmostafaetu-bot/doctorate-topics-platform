import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AiImportForm } from "@/components/admin/ai-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AiImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const [universities, specialties] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" } }),
    prisma.specialty.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">📥 استيراد موضوع من صور/PDF</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            اختبار واحد في كل مرة: ملف PDF واحد (حتى 3.5MB) أو صورتان كحد أقصى (حتى 1.8MB لكل صورة).
            يقرأ الذكاء الاصطناعي الاختبار ثم تعاين الموضوع وتعدّله قبل الإضافة المباشرة.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            يتطلب مفتاحًا بمهمة (قراءة الصور وPDF) من <Link href="/admin/ai" className="underline">صفحة الذكاء الاصطناعي</Link> —
            نموذج يدعم الصور مثل pixtral-large-latest، وقراءة PDF تتطلب مفتاح Mistral (خدمة OCR).
          </p>
        </div>
        <Link href="/admin/ai" className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-secondary">← إدارة المفاتيح</Link>
      </div>

      {sp.error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">⚠️ {sp.error}</div>
      ) : null}

      <AiImportForm
        universities={universities.map((u) => ({ id: u.id, name: u.name, nameAr: u.nameAr }))}
        specialties={specialties.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr }))}
      />
    </div>
  );
}
