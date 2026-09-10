"use client";

import { useEffect, useState } from "react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";

const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const STABLE_READER_URL = "/api/preview/waterloo-pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";

export function AzureExamPreview() {
  const [message, setMessage] = useState("القارئ ثابت الآن ولا يغيّر المصدر أثناء القراءة. يجري حفظ نسخة Azure بشكل مستقل.");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/preview/azure-exam", { method: "POST", signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setMessage(`نسخة Azure جاهزة (${(Number(data.sizeBytes) / 1024 / 1024).toFixed(2)} MB). لن نقطع القراءة الحالية.`))
      .catch(() => setMessage("القارئ يعمل بالمسار الثابت؛ تعذر تجهيز نسخة Azure مؤقتًا دون التأثير على القراءة."));
    return () => controller.abort();
  }, []);
  return <><p className="mb-4 text-xs text-emerald-600">{message}</p><PdfExamViewer fileUrl={STABLE_READER_URL} downloadUrl={SOURCE} sourceUrl={SOURCE} fileName={FILE_NAME} title="Waterloo 2025 — Fields and Galois Theory" /></>;
}
