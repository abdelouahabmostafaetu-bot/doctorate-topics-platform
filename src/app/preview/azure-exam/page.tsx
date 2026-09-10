import Link from "next/link";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";
import { ensureExamPdfFromUrl, getExamDownloadUrl, getExamReadUrl } from "@/lib/exam-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";

export default async function AzureExamPreviewPage() {
  let fileUrl = "/api/preview/waterloo-pdf";
  let downloadUrl = SOURCE;
  let storageMessage = "القارئ جاهز. إذا تعذر النسخ إلى Azure فسيستعمل المسار الاحتياطي تلقائيًا.";
  try {
    const stored = await ensureExamPdfFromUrl(SOURCE, "exams/previews/waterloo-2025-fields-galois.pdf", FILE_NAME);
    [fileUrl, downloadUrl] = await Promise.all([getExamReadUrl(stored.url), getExamDownloadUrl(stored.url, FILE_NAME)]);
    storageMessage = `تم حفظ الملف في Azure بنجاح (${(stored.sizeBytes / 1024 / 1024).toFixed(2)} MB).`;
  } catch (error) {
    console.error("Azure preview import failed; using source proxy:", error);
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">University of Waterloo · 2025</p>
          <h1 className="mt-1 text-lg font-semibold">Fields and Galois Theory</h1>
          <p className="mt-1 text-xs text-emerald-600">{storageMessage}</p>
        </div>
        <Link href="/" className="rounded-md border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">العودة للرئيسية</Link>
      </div>
      <PdfExamViewer fileUrl={fileUrl} downloadUrl={downloadUrl} sourceUrl={SOURCE} fileName={FILE_NAME} title="Waterloo 2025 — Fields and Galois Theory" />
    </main>
  );
}

export const metadata = {
  title: "معاينة اختبار Waterloo | DocMath DZ",
  robots: { index: false, follow: false },
};
