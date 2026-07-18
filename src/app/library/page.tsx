import type { Metadata } from "next";
import { OfflineLibraryView } from "@/components/offline/offline-library";

export const metadata: Metadata = {
  title: "📖 مكتبة بدون إنترنت",
  description:
    "حمّل كل مواضيع مسابقات الدكتوراه إلى جهازك مرة واحدة، وراجعها في أي مكان بدون اتصال.",
};

export default function LibraryPage() {
  return <OfflineLibraryView />;
}
