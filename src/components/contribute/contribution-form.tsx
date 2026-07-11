"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { submitContribution } from "@/app/contribute/actions";

const MAX_FILE_MB = 4;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.tex,.zip,.rar,.7z,.doc,.docx";

type UploadedFile = {
  url: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
};

export function ContributionForm() {
  const [kind, setKind] = useState<"latex" | "files">("latex");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) {
      setError("يرجى كتابة عنوان للمساهمة.");
      return;
    }

    setBusy(true);
    try {
      let latexContent: string | null = null;
      const files: UploadedFile[] = [];

      if (kind === "latex") {
        latexContent = String(fd.get("latexContent") ?? "").trim();
        if (!latexContent) {
          setError("يرجى كتابة محتوى المساهمة بصيغة LaTeX.");
          setBusy(false);
          return;
        }
      } else {
        const input = form.elements.namedItem("files") as HTMLInputElement | null;
        const list = input && input.files ? Array.from(input.files) : [];
        if (list.length === 0) {
          setError("يرجى اختيار ملف واحد على الأقل.");
          setBusy(false);
          return;
        }
        if (list.length > 10) {
          setError("يمكن رفع 10 ملفات كحد أقصى في المساهمة الواحدة.");
          setBusy(false);
          return;
        }
        for (const f of list) {
          if (f.size > MAX_FILE_MB * 1024 * 1024) {
            setError(
              "الملف «" +
                f.name +
                "» أكبر من " +
                MAX_FILE_MB +
                " م.ب — يرجى ضغطه بصيغة ZIP أو تقسيمه إلى أجزاء أصغر."
            );
            setBusy(false);
            return;
          }
        }
        for (const f of list) {
          const ufd = new FormData();
          ufd.append("file", f);
          const res = await fetch("/api/contributions/upload", {
            method: "POST",
            body: ufd,
          });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !data.url) {
            setError(data.error ?? "تعذر رفع الملف: " + f.name);
            setBusy(false);
            return;
          }
          files.push({
            url: data.url,
            fileName: f.name,
            sizeBytes: f.size,
            contentType: f.type || "application/octet-stream",
          });
        }
      }

      const yearRaw = String(fd.get("year") ?? "").trim();
      const result = await submitContribution({
        kind,
        title,
        universityName: String(fd.get("universityName") ?? "").trim() || null,
        specialtyName: String(fd.get("specialtyName") ?? "").trim() || null,
        year: yearRaw ? Number(yearRaw) : null,
        examType: String(fd.get("examType") ?? "") || null,
        message: String(fd.get("message") ?? "").trim() || null,
        latexContent,
        files,
      });
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      form.reset();
      setSuccess(true);
    } catch {
      setError("حدث خطأ غير متوقع. حاول مجددًا.");
    }
    setBusy(false);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
          ✅ شكرًا لك! وصلت مساهمتك بنجاح.
        </p>
        <p className="mt-2 text-sm text-emerald-800/80 dark:text-emerald-300/80">
          ستراجعها الإدارة قريبًا، وتُضاف نقاطك بعد القبول.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          إرسال مساهمة أخرى
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";
  const tabClass = (active: boolean) =>
    "rounded-md px-4 py-2 text-sm font-medium transition " +
    (active
      ? "bg-primary text-primary-foreground"
      : "border hover:border-primary hover:text-primary");

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind("latex")}
          className={tabClass(kind === "latex")}
        >
          ✍️ كتابة LaTeX
        </button>
        <button
          type="button"
          onClick={() => setKind("files")}
          className={tabClass(kind === "files")}
        >
          📎 رفع ملفات
        </button>
      </div>

      <label className="block text-sm font-medium">
        عنوان المساهمة *
        <input
          name="title"
          required
          placeholder="مثال: موضوع دكتوراه جامعة البليدة 2024 — تحليل دالي"
          className={inputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          الجامعة
          <input
            name="universityName"
            placeholder="مثال: جامعة البليدة 1"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          التخصص
          <input
            name="specialtyName"
            placeholder="مثال: تحليل دالي"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          السنة
          <input
            name="year"
            type="number"
            min={2000}
            max={2100}
            placeholder="2026"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          نوع المسابقة
          <select name="examType" className={inputClass} defaultValue="">
            <option value="">— غير محدد —</option>
            <option value="general">مسابقة عامة</option>
            <option value="specialty">مسابقة تخصص</option>
          </select>
        </label>
      </div>

      {kind === "latex" ? (
        <label className="block text-sm font-medium">
          محتوى الموضوع أو الحل (LaTeX) *
          <textarea
            name="latexContent"
            rows={12}
            dir="ltr"
            placeholder={"Exercice 1 :\nSoit $f : \\mathbb{R} \\to \\mathbb{R}$ une fonction..."}
            className={inputClass + " text-left font-mono"}
          />
        </label>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            الملفات (صور، PDF، Word، TEX، ZIP، RAR، 7Z) *
            <input
              name="files"
              type="file"
              multiple
              accept={ACCEPT}
              className={inputClass}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            الحد الأقصى لكل ملف: 4 م.ب، وحتى 10 ملفات في المساهمة الواحدة. إذا
            كان ملفك أكبر، قسّمه إلى أجزاء أو اضغطه بصيغة ZIP.
          </p>
        </div>
      )}

      <label className="block text-sm font-medium">
        رسالة إضافية (اختياري)
        <textarea
          name="message"
          rows={3}
          placeholder="أي معلومات تساعدنا في المراجعة والتصنيف..."
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال..." : "إرسال المساهمة 🌱"}
      </button>
    </form>
  );
}
