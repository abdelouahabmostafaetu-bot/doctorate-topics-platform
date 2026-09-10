import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";

const SOURCE_URL =
  "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const VIEW_URL = "/api/preview/waterloo-pdf";

export const metadata: Metadata = {
  title: "Fields and Galois Theory 2025 — University of Waterloo",
  description:
    "قراءة امتحان التأهيل في Fields and Galois Theory من University of Waterloo داخل DocMath DZ.",
  robots: { index: false, follow: false },
};

export default function CanadaWaterlooPdfPreviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-2 py-4 sm:px-4 sm:py-5">
      <nav className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link href="/world" className="hover:text-foreground">العالم</Link>
        <span>/</span>
        <span>كندا</span>
        <span>/</span>
        <span className="truncate text-foreground">University of Waterloo</span>
      </nav>

      <header className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>🇨🇦 كندا</span>
            <span>·</span>
            <span>Pure Mathematics</span>
            <span>·</span>
            <span>2025</span>
          </div>
          <h1 className="mt-1 truncate text-base font-semibold tracking-tight sm:text-lg">
            Fields and Galois Theory Qualifying Exam
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            University of Waterloo — النسخة الرسمية دون إعادة كتابة
          </p>
        </div>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex h-8 items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          المصدر الرسمي
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </header>

      <PdfExamViewer
        fileUrl={VIEW_URL}
        downloadUrl={SOURCE_URL}
        sourceUrl={SOURCE_URL}
        fileName="waterloo-fields-galois-qualifying-exam-2025.pdf"
        title="Waterloo · Fields and Galois Theory · 2025"
      />

      <footer className="mt-3 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
        <p>معاينة تجريبية لقارئ الامتحانات الدولي.</p>
        <Link href="/world" className="inline-flex shrink-0 items-center gap-1 hover:text-foreground">
          رجوع
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
