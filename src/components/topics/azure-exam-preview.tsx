"use client";

import { useEffect, useState } from "react";
import { PdfExamViewer } from "@/components/topics/pdf-exam-viewer";

const SOURCE = "https://uwaterloo.ca/pure-mathematics/sites/default/files/uploads/documents/2025-a-fields-galois.pdf";
const FALLBACK = "/api/preview/waterloo-pdf";
const FILE_NAME = "waterloo-2025-fields-galois.pdf";

export function AzureExamPreview() {
  const [fileUrl, setFileUrl] = useState(FALLBACK);
  const [downloadUrl, setDownloadUrl] = useState(SOURCE);
  const [message, setMessage] = useState("القارئ يعمل فورًا عبر المسار الاحتياطي، ويجري تجهيز نسخة Azure دون تعطيل الصفحة.");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/preview/azure-exam", { method: "POST", signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("seed failed");
        return response.json();
      })
      .then((data) => {
        if (!data?.readUrl) return;
        setFileUrl(data.readUrl);
        setDownloadUrl(data.downloadUrl || data.readUrl);
        setMessage(`تم التحويل تلقائيًا إلى النسخة المحفوظة في Azure (${(Number(data.sizeBytes) / 1024 / 1024).toFixed(2)} MB).`);
      })
      .catch(() => setMessage("المعاينة تعمل الآن عبر المسار الاحتياطي؛ تعذر نسخ الجامعة إلى Azure مؤقتًا."));
    return () => controller.abort();
  }, []);

  return (
    <>
      <p className="mb-4 text-xs text-emerald-600">{message}</p>
      <PdfExamViewer
        key={fileUrl}
        fileUrl={fileUrl}
        downloadUrl={downloadUrl}
        sourceUrl={SOURCE}
        fileName={FILE_NAME}
        title="Waterloo 2025 — Fields and Galois Theory"
      />
    </>
  );
}
