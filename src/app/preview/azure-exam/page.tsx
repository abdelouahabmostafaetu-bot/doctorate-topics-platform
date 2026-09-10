import Link from "next/link";
import { AzureExamPreview } from "@/components/topics/azure-exam-preview";

export const dynamic = "force-dynamic";

export default function AzureExamPreviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">University of Waterloo · 2025</p>
          <h1 className="mt-1 text-lg font-semibold">Fields and Galois Theory</h1>
        </div>
        <Link href="/" className="rounded-md border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">العودة للرئيسية</Link>
      </div>
      <AzureExamPreview />
    </main>
  );
}

export const metadata = {
  title: "معاينة اختبار Waterloo | DocMath DZ",
  robots: { index: false, follow: false },
};
