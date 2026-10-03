"use client";

import { useState } from "react";

type AdminItem = Record<string, unknown>;
type Overview = {
  configured: boolean;
  adminConfigured: boolean;
  available: boolean;
  webConfigs: AdminItem[];
  schedulers: AdminItem[];
  error?: string;
};
type AuditItem = {
  url: string;
  title: string;
  ok: boolean;
  status: number | null;
  method: string;
  contentType: string;
  reason: string;
};
type Audit = {
  checked: number;
  valid: number;
  invalid: number;
  search: { available: boolean; total: number; error?: string };
  items: AuditItem[];
};

function value(item: AdminItem, keys: string[]) {
  for (const key of keys) {
    const candidate = item[key];
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
}

export function FessConsole({
  initialOverview,
}: {
  initialOverview: Overview;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function request(body?: Record<string, unknown>) {
    const response = await fetch("/api/admin/fess", {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "فشلت العملية");
    return payload;
  }

  async function refresh() {
    setBusy("refresh");
    setMessage("");
    try {
      setOverview(await request());
      setMessage("تم تحديث حالة Fess.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر التحديث.");
    } finally {
      setBusy("");
    }
  }

  async function runAudit() {
    setBusy("audit");
    setMessage("");
    try {
      const report = (await request({
        action: "audit",
        query,
        limit: 12,
      })) as Audit;
      setAudit(report);
      setMessage("اكتمل الفحص المباشر للملفات.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الفحص.");
    } finally {
      setBusy("");
    }
  }

  async function startJob(id: string) {
    setBusy(id);
    setMessage("");
    try {
      await request({ action: "start", id });
      setMessage("تم إرسال أمر بدء الزحف إلى Fess.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر بدء الزحف.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-7">
      <section className="border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">حالة الاتصال</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              الاتصال خاص داخل Azure، ولا يظهر عنوان Fess أو التوكن للمتصفح.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                overview.available
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {overview.available ? "● متصل" : "● غير متصل"}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={Boolean(busy)}
              className="rounded-full border px-3 py-1 text-[11px] transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {busy === "refresh" ? "يحدّث…" : "تحديث"}
            </button>
          </div>
        </div>
        {!overview.available && (
          <p className="mt-3 text-[11px] text-destructive">
            {overview.error || "تعذر الاتصال."}
          </p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold">مصادر الزحف</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              الإعدادات القادمة مباشرة من Web Config في Fess.
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {overview.webConfigs.length} مصدر
          </span>
        </div>
        <div className="mt-3 divide-y border-y">
          {overview.webConfigs.length ? (
            overview.webConfigs.map((item, index) => {
              const name =
                value(item, ["name", "label"]) || `مصدر ${index + 1}`;
              const urls = value(item, ["urls", "url"]);
              return (
                <div key={`${name}-${index}`} className="py-3">
                  <p className="text-xs font-semibold">{name}</p>
                  {urls && (
                    <p
                      dir="ltr"
                      className="mt-1 break-all text-left text-[10px] text-muted-foreground"
                    >
                      {urls}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-5 text-xs text-muted-foreground">
              لم ترجع واجهة Fess أي مصدر.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold">تشغيل الزحف</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          شغّل Default Crawler من الموقع بدل العودة إلى لوحة Fess.
        </p>
        <div className="mt-3 divide-y border-y">
          {overview.schedulers.length ? (
            overview.schedulers.map((item, index) => {
              const id = value(item, ["id", "_id", "doc_id"]);
              const name =
                value(item, ["name", "target", "description"]) ||
                `مهمة ${index + 1}`;
              return (
                <div
                  key={`${id}-${index}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{name}</p>
                    {id && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        ID: {id}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startJob(id)}
                    disabled={!id || Boolean(busy)}
                    className="shrink-0 rounded-full bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {busy === id ? "يبدأ…" : "بدء الزحف"}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="py-5 text-xs text-muted-foreground">
              لم ترجع واجهة Fess أي مهمة مجدولة.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold">اختبار دقة اكتشاف PDF</h2>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          يبحث في الفهرس ثم يفحص حتى 12 رابطًا فعليًا عبر نوع المحتوى وتوقيع
          الملف <span dir="ltr">%PDF-</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اختياري: Baltic Way أو اسم جامعة"
            className="min-w-[220px] flex-1 border-0 border-b bg-transparent px-1 py-1 text-xs outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={runAudit}
            disabled={Boolean(busy)}
            className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy === "audit" ? "يفحص الروابط…" : "تشغيل الاختبار"}
          </button>
        </div>

        {audit && (
          <div className="mt-5">
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-y py-3 text-[11px]">
              <span>
                مفهرس: <strong>{audit.search.total}</strong>
              </span>
              <span className="text-emerald-700 dark:text-emerald-400">
                صالح: <strong>{audit.valid}</strong>
              </span>
              <span className="text-destructive">
                يحتاج مراجعة: <strong>{audit.invalid}</strong>
              </span>
            </div>
            <div className="divide-y">
              {audit.items.map((item) => (
                <div key={item.url} className="py-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={
                        item.ok
                          ? "text-emerald-600"
                          : "text-destructive"
                      }
                    >
                      {item.ok ? "✓" : "!"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {item.title}
                      </p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="ltr"
                        className="mt-0.5 block truncate text-left text-[10px] text-primary hover:underline"
                      >
                        {item.url}
                      </a>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.reason} · {item.method}
                        {item.status ? ` · HTTP ${item.status}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {message && (
        <p className="border-t pt-3 text-[11px] text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}