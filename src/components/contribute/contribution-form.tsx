"use client";

import { useState, useTransition } from "react";
import { ProblemsEditor } from "@/components/admin/problems-editor";
import { submitContributionAction } from "@/app/contribute/actions";

const NEW = "__new__";
const MAX_FILES = 100;

type Option = { id: string; name: string; nameAr: string };

export function ContributionForm({
  universities,
  specialties,
}: {
  universities: Option[];
  specialties: Option[];
}) {
  const [type, setType] = useState<"latex" | "file">("latex");
  const [universityId, setUniversityId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [newUniversity, setNewUniversity] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uniName =
    universityId === NEW
      ? newUniversity.trim()
      : universities.find((u) => u.id === universityId)?.nameAr ||
        universities.find((u) => u.id === universityId)?.name ||
        "";
  const specName =
    specialtyId === NEW
      ? newSpecialty.trim()
      : specialties.find((s) => s.id === specialtyId)?.nameAr ||
        specialties.find((s) => s.id === specialtyId)?.name ||
        "";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("type", type);
        fd.set("universityId", universityId === NEW ? "" : universityId);
        fd.set("specialtyId", specialtyId === NEW ? "" : specialtyId);
        fd.set("universityName", uniName);
        fd.set("specialtyName", specName);
        fd.delete("files");

        if (universityId === NEW && !uniName) {
          setError("يرجى كتابة اسم الجامعة الجديدة");
          return;
        }
        if (specialtyId === NEW && !specName) {
          setError("يرجى كتابة اسم التخصص الجديد");
          return;
        }
        if (type === "file" && files.length === 0) {
          setError("يرجى اختيار ملف واحد على الأقل");
          return;
        }
        if (files.length > MAX_FILES) {
          setError(`الحد الأقصى ${MAX_FILES} ملف في المرة الواحدة`);
          return;
        }

        startTransition(async () => {
          try {
            if (type === "file") {
              const uploaded: Array<{
                url: string;
                fileName: string;
                sizeBytes: number;
              }> = [];
              for (let i = 0; i < files.length; i++) {
                setProgress(`جاري رفع الملف ${i + 1} من ${files.length}...`);
                const ufd = new FormData();
                ufd.set("file", files[i]);
                const res = await fetch("/api/contributions/upload", {
                  method: "POST",
                  body: ufd,
                });
                const data = await res.json();
                if (!res.ok) {
                  throw new Error(
                    `الملف "${files[i].name}": ${data?.error || "تعذر الرفع"}`,
                  );
                }
                uploaded.push({
                  url: data.url,
                  fileName: data.fileName,
                  sizeBytes: data.sizeBytes,
                });
              }
              fd.set("filesJson", JSON.stringify(uploaded));
              setProgress("جاري إرسال المساهمة...");
            }
            await submitContributionAction(fd);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect")) return;
            setError(msg || "تعذر إرسال المساهمة");
          } finally {
            setProgress(null);
          }
        });
      }}
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("latex")}
          className={`rounded-md px-4 py-2 text-sm ${
            type === "latex"
              ? "bg-primary text-primary-foreground"
              : "border"
          }`}
        >
          كتابة بـ LaTeX
        </button>
        <button
          type="button"
          onClick={() => setType("file")}
          className={`rounded-md px-4 py-2 text-sm ${
            type === "file"
              ? "bg-primary text-primary-foreground"
              : "border"
          }`}
        >
          رفع ملفات
        </button>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <label className="text-sm">
          الجامعة
          <select
            required
            value={universityId}
            onChange={(e) => setUniversityId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— اختر —</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameAr || u.name}
              </option>
            ))}
            <option value={NEW}>+ إضافة جامعة جديدة</option>
          </select>
        </label>

        <label className="text-sm">
          التخصص
          <select
            required
            value={specialtyId}
            onChange={(e) => setSpecialtyId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— اختر —</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr || s.name}
              </option>
            ))}
            <option value={NEW}>+ إضافة تخصص جديد</option>
          </select>
        </label>

        {universityId === NEW && (
          <label className="text-sm">
            اسم الجامعة الجديدة
            <input
              value={newUniversity}
              onChange={(e) => setNewUniversity(e.target.value)}
              required
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}

        {specialtyId === NEW && (
          <label className="text-sm">
            اسم التخصص الجديد
            <input
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              required
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        )}

        <label className="text-sm">
          السنة
          <input
            type="number"
            name="year"
            required
            defaultValue={new Date().getFullYear()}
            min={1990}
            max={2100}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          نوع المسابقة
          <select
            name="examType"
            defaultValue="general"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="general">مسابقة عامة</option>
            <option value="specialty">مسابقة تخصص</option>
          </select>
        </label>
      </div>

      {type === "latex" ? (
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">التمارين (LaTeX)</h3>
            <a
              href="/latex-guide"
              className="text-sm text-primary hover:underline"
            >
              📖 كيف أكتب بـ LaTeX؟
            </a>
          </div>
          <ProblemsEditor />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-5">
          <label className="text-sm font-medium">
            الملفات (حتى {MAX_FILES} ملف — كل الأنواع مقبولة، الحد 4 م.ب للملف)
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-2 block w-full text-sm"
            />
          </label>
          {files.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              تم اختيار {files.length} ملف
            </p>
          )}
        </div>
      )}

      {progress && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          ⏳ {progress}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "جاري الإرسال..." : "إرسال المساهمة"}
      </button>
    </form>
  );
}
