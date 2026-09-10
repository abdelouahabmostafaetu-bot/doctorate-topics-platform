import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, MapPin } from "lucide-react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";

const SOURCE_URL =
  "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";

export const metadata: Metadata = {
  title: "معاينة قارئ PDF — University of Waterloo",
  description:
    "معاينة تجريبية لعرض امتحانات دكتوراه الرياضيات الأصلية داخل DocMath DZ.",
  robots: { index: false, follow: false },
};

export default function CanadaWaterlooPdfPreviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
      <nav className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/world" className="hover:text-foreground">العالم</Link>
        <span>/</span>
        <span>كندا</span>
        <span>/</span>
        <span className="text-foreground">معاينة امتحان PDF</span>
      </nav>

      <header className="mb-5 border-b pb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 font-medium text-red-700 dark:text-red-300">
                🇨🇦 كندا
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Waterloo, Ontario
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Fields and Galois Theory Qualifying Exam
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              University of Waterloo · Pure Mathematics · Fall 2025
            </p>
          </div>

          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition hover:bg-muted"
          >
            الموقع الرسمي للجامعة
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs leading-5 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            هذه صفحة تجريبية لمعاينة القارئ الجديد. الملف أصلي من جامعة Waterloo ولم تتم إعادة كتابته أو تعديله.
          </p>
        </div>
      </header>

      <PdfExamViewer
        fileUrl={SOURCE_URL}
        downloadUrl={SOURCE_URL}
        sourceUrl={SOURCE_URL}
        fileName="waterloo-fields-galois-qualifying-exam-2025.pdf"
        title="University of Waterloo — Fields and Galois Theory 2025"
      />

      <footer className="mt-5 flex flex-col justify-between gap-3 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <p>نسخة تجريبية قبل ربط أرشيف الامتحانات بحاوية Azure المستقلة.</p>
        <Link href="/world" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
          العودة إلى صفحة العالم
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
