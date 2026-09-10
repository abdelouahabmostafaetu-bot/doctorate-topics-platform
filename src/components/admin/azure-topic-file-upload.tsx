"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
type Kind = "exam_pdf" | "solution_pdf";

export function AzureTopicFileUpload({ topicId, kind, hasFile }: { topicId: string; kind: Kind; hasFile: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function start() {
    const file = input.current?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) return setMessage("اختر ملف PDF.");
    setBusy(true); setProgress(0); setMessage("تجهيز Azure…");
    try {
      const response = await fetch("/api/exams/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, kind, fileName: file.name, contentType: "application/pdf", sizeBytes: file.size }) });
      const target = await response.json();
      if (!response.ok) throw new Error(target.error || "تعذر تجهيز الرفع.");
      setMessage("رفع الملف الكامل مباشرة إلى Azure…");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", target.uploadUrl);
        xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
        xhr.setRequestHeader("x-ms-blob-content-type", "application/pdf");
        xhr.setRequestHeader("Content-Type", "application/pdf");
        xhr.upload.onprogress = (event) => event.lengthComputable && setProgress(Math.round(event.loaded / event.total * 100));
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`رفض Azure الرفع (${xhr.status}).`));
        xhr.onerror = () => reject(new Error("انقطع الاتصال أثناء الرفع."));
        xhr.send(file);
      });
      const save = await fetch("/api/exams/presign", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, kind, url: target.url, fileName: file.name, sizeBytes: file.size }) });
      const result = await save.json();
      if (!save.ok) throw new Error(result.error || "رُفع الملف لكن تعذر حفظه.");
      setProgress(100);
      if (kind === "exam_pdf" && file.size <= 80 * 1024 * 1024) {
        setMessage("تم الحفظ. يجري تجهيز الصفحات عالية الوضوح مرة واحدة…");
        const render = await fetch("/api/exams/rasterize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId }) });
        const rendered = await render.json();
        setMessage(render.ok ? `تم تجهيز ${rendered.pageCount} صفحة للقراءة السريعة.` : "تم حفظ PDF؛ سيُستخدم القارئ الأساسي لأن تجهيز الصور لم يكتمل.");
      } else setMessage("تم الحفظ في Azure بنجاح.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "فشل الرفع."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2"><div className="flex flex-wrap items-center gap-2"><input ref={input} type="file" accept="application/pdf,.pdf" disabled={busy} className="max-w-[190px] text-xs" /><button type="button" onClick={start} disabled={busy} className="rounded-md border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary disabled:opacity-50">{busy ? `${progress}%` : hasFile ? "استبدال في Azure" : "رفع كامل إلى Azure"}</button></div>{busy && <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>}{message && <p className="text-[11px] text-muted-foreground">{message}</p>}</div>;
}
