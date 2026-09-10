import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-7">
      <nav className="mb-5 flex items-center gap-1.5 text-[11px] text-[#9b9a97]">
        <Link href="/world" className="rounded px-1.5 py-0.5 hover:bg-[#efefed] hover:text-[#37352f] dark:hover:bg-[#333] dark:hover:text-white">العالم</Link>
        <span>/</span>
        <span>كندا</span>
        <span>/</span>
        <span className="truncate text-[#787774] dark:text-[#b8b8b8]">University of Waterloo</span>
      </nav>

      <header className="mb-5">
        <span className="mb-2 block text-3xl" aria-hidden="true">📄</span>
        <h1 className="text-xl font-bold tracking-tight text-[#37352f] dark:text-[#e9e9e7] sm:text-2xl">
          Fields and Galois Theory Qualifying Exam
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#787774] dark:text-[#b8b8b8]">
          <span>🇨🇦 Canada</span><span>·</span><span>University of Waterloo</span><span>·</span><span>Pure Mathematics</span><span>·</span><span>Fall 2025</span>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-[#2383e2] hover:underline">المصدر الرسمي <ExternalLink className="h-3 w-3" /></a>
        </div>
      </header>

      <PdfExamViewer
        fileUrl={VIEW_URL}
        downloadUrl={SOURCE_URL}
        sourceUrl={SOURCE_URL}
        fileName="waterloo-fields-galois-qualifying-exam-2025.pdf"
        title="Waterloo · Fields and Galois Theory · 2025"
      />

      <p className="mt-3 text-[10px] text-[#9b9a97]">معاينة تجريبية لقارئ الامتحانات الدولي.</p>
    </main>
  );
}
