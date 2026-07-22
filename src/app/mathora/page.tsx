import type { Metadata } from "next";
import { MathoraPageClient } from "@/components/assistant/mathora-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mathora AI",
  description:
    "Mathora — ابحث عن امتحانات الدكتوراه بروابط مباشرة، مع محادثة تبقى عند الرجوع من الامتحان.",
  robots: { index: false, follow: false },
};

export default function MathoraPage() {
  return <MathoraPageClient />;
}
