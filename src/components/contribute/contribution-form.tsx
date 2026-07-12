"use client";

import { useRef, useState, useTransition } from "react";
import { ProblemsEditor } from "@/components/admin/problems-editor";
import { submitContributionAction } from "@/app/contribute/actions";

const NEW = "__new__";
const MAX_FILES = 100;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 م.ب للملف الواحد
const RELAY_LIMIT = 3 * 1024 * 1024; // الأصغر من ذلك يمر عبر الخادم، الأكبر يُرفع مباشرة للتخزين

type Option = { id: string; name: string; nameAr: string };

const fieldClass =
  "w-full border-0 border-b border-border bg-transparent px-0 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-0";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

function formatBytes(n: number) {
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " م.ب";
  if (n >= 1024) return Math.round(n / 1024) + " ك.ب";
  return n + " بايت";
}

function fileIcon(name: string) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "pdf") return "\uD83D\uDCD5";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) return "\uD83D\uDDBC\uFE0F";
  if (["zip", "rar", "7z"].includes(ext)) return "\uD83D\uDDDC\uFE0F";
  if (["doc", "docx", "odt"].includes(ext)) return "\uD83D\uDCD8";
  if (ext === "tex") return "\u2211";
  return "\uD83D\uDCC4";
}

/** رفع مباشر إلى التخزين مع تتبع نسبة التقدم */
function putWithProgress(
  url: string,
  file: File,
  onPct: (p: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("فشل رفع الملف (" + xhr.status + ")"));
    xhr.onerror = () =>
      reject(
        new Error(
          "تعذر الاتصال بخادم التخزين — تأكد من إعداد CORS للمخزن",
        ),
      );
    xhr.send(file);
  });
}

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
  const [pcts, setPcts] = useState<Record<number, number>>({});
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

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

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      setError(
        "هذه الملفات تتجاوز 50 م.ب: " +
          tooBig.map((f) => f.name).join("، "),
      );
    } else {
      setError(null);
    }
    setFiles((prev) =>
      [...prev, ...incoming.filter((f) => f.size <= MAX_FILE_BYTES)].slice(
        0,
        MAX_FILES,
      ),
    );
    setPcts({});
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPcts({});
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = e.currentTarget;

        if (type === "file") {
          if (files.length === 0) {
            setError("يرجى اختيار ملف واحد على الأقل");
            return;
          }
          startTransition(async () => {
            try {
              const uploaded: Array<{
                url: string;
                fileName: string;
                sizeBytes: number;
              }> = [];
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setProgress(
                  "جاري رفع " + file.name + " (" + (i + 1) + "/" + files.length + ")...",
                );
                if (file.size <= RELAY_LIMIT) {
                  const ufd = new FormData();
                  ufd.set("file", file);
                  const res = await fetch("/api/contributions/upload", {
                    method: "POST",
                    body: ufd,
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      'الملف "' + file.name + '": ' + (data?.error || "تعذر الرفع"),
                    );
                  }
                  setPcts((prev) => ({ ...prev, [i]: 100 }));
                  uploaded.push({
                    url: data.url,
                    fileName: data.fileName,
                    sizeBytes: data.sizeBytes,
                  });
                } else {
                  const res = await fetch("/api/contributions/presign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fileName: file.name,
                      contentType: file.type || "application/octet-stream",
                      sizeBytes: file.size,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      'الملف "' + file.name + '": ' + (data?.error || "تعذر تجهيز الرفع"),
                    );
                  }
                  await putWithProgress(data.uploadUrl, file, (p) =>
                    setPcts((prev) => ({ ...prev, [i]: p })),
                  );
                  uploaded.push({
                    url: data.url,
                    fileName: file.name,
                    sizeBytes: file.size,
                  });
                }
              }
              const fd = new FormData();
              fd.set("type", "file");
              fd.set("filesJson", JSON.stringify(uploaded));
              setProgress("جاري إرسال المساهمة...");
              await submitContributionAction(fd);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes("NEXT_REDIRECT") || msg.includes("Redirect")) return;
              setError(msg || "تعذر إرسال المساهمة");
            } finally {
              setProgress(null);
            }
          });
          return;
        }

        // مساهمة LaTeX — مع معلومات المسابقة
        const fd = new FormData(form);
        fd.set("type", "latex");
        fd.set("universityId", universityId === NEW ? "" : universityId);
        fd.set("specialtyId", specialtyId === NEW ? "" : specialtyId);
        fd.set("universityName", uniName);
        fd.set("specialtyName", specName);

        if (universityId === NEW && !uniName) {
          setError("يرجى كتابة اسم الجامعة الجديدة");
          return;
        }
        if (specialtyId === NEW && !specName) {
          setError("يرجى كتابة اسم التخصص الجديد");
          return;
        }

        startTransition(async () => {
          try {
            setProgress("جاري إرسال المساهمة...");
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
      {/* تبويبات بسيطة بدون صناديق */}
      <div className="flex gap-6 border-b">
        <button
          type="button"
          onClick={() => setType("latex")}
          className={
            type === "latex"
              ? "-mb-px border-b-2 border-primary pb-2 text-sm font-medium text-primary"
              : "pb-2 text-sm text-muted-foreground transition hover:text-foreground"
          }
        >
          ✍️ كتابة بـ LaTeX
        </button>
        <button
          type="button"
          onClick={() => setType("file")}
          className={
            type === "file"
              ? "-mb-px border-b-2 border-primary pb-2 text-sm font-medium text-primary"
              : "pb-2 text-sm text-muted-foreground transition hover:text-foreground"
          }
        >
          📤 رفع ملفات
        </button>
      </div>

      {type === "latex" ? (
        <>
          {/* معلومات المسابقة — حقول بخط سفلي فقط، بدون صناديق */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-semibold">معلومات المسابقة</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
            </div>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>الجامعة</label>
                <select
                  required
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">— اختر —</option>
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nameAr || u.name}
                    </option>
                  ))}
                  <option value={NEW}>+ إضافة جامعة جديدة</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>التخصص</label>
                <select
                  required
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">— اختر —</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr || s.name}
                    </option>
                  ))}
                  <option value={NEW}>+ إضافة تخصص جديد</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>السنة</label>
                <input
                  type="number"
                  name="year"
                  required
                  defaultValue={new Date().getFullYear()}
                  min={1990}
                  max={2100}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>نوع المسابقة</label>
                <select name="examType" defaultValue="general" className={fieldClass}>
                  <option value="general">مسابقة عامة</option>
                  <option value="specialty">مسابقة تخصص</option>
                </select>
              </div>

              {universityId === NEW && (
                <div>
                  <label className={labelClass}>اسم الجامعة الجديدة</label>
                  <input
                    value={newUniversity}
                    onChange={(e) => setNewUniversity(e.target.value)}
                    required
                    dir="auto"
                    className={fieldClass}
                  />
                </div>
              )}

              {specialtyId === NEW && (
                <div>
                  <label className={labelClass}>اسم التخصص الجديد</label>
                  <input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    required
                    dir="auto"
                    className={fieldClass}
                  />
                </div>
              )}
            </div>
          </section>

          {/* محرر التمارين — بأسلوب Math StackExchange: معاينة مباشرة أثناء الكتابة */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-semibold">التمارين (LaTeX)</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
              <a
                href="/latex-guide"
                className="shrink-0 text-xs text-primary hover:underline"
              >
                📖 كيف أكتب بـ LaTeX؟
              </a>
            </div>
            <ProblemsEditor />
          </section>
        </>
      ) : (
        /* رفع ملفات — بدون أي حقول تصنيف */
        <section className="space-y-4">
          <p className="text-xs text-muted-foreground">
            ✨ لا حاجة لاختيار الجامعة أو السنة هنا — ارفع ملفاتك فقط،
            وسيتولى المشرفون التصنيف عند المراجعة.
          </p>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              addFiles(e.dataTransfer.files);
            }}
            className={
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition " +
              (dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-secondary/30")
            }
          >
            <span className="text-4xl">📤</span>
            <p className="text-sm font-medium">
              اسحب الملفات وأفلتها هنا، أو انقر للاختيار
            </p>
            <p className="text-xs text-muted-foreground">
              حتى {MAX_FILES} ملف — كل الأنواع مقبولة — حتى 50 م.ب للملف الواحد
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="divide-y">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <span className="text-xl">{fileIcon(f.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" dir="ltr">
                      {f.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(f.size)}
                    </p>
                    {pcts[i] !== undefined && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={ { width: (pcts[i] ?? 0) + "%" } }
                        />
                      </div>
                    )}
                  </div>
                  {!pending && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="px-1 text-muted-foreground transition hover:text-destructive"
                      title="إزالة"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                {files.length} ملف — المجموع {formatBytes(totalSize)}
              </p>
            </div>
          )}
        </section>
      )}

      {progress && (
        <p className="text-sm text-primary">⏳ {progress}</p>
      )}

      {error && (
        <p className="text-sm text-destructive">⚠️ {error}</p>
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
