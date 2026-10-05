"use client";

import { useEffect, useState } from "react";
import type { TinyFishCampaign } from "@/lib/tinyfish-world";

type RunResult = {
  campaign: string;
  found: number;
  candidates: number;
  imported: Array<{ action?: string; slug?: string }>;
  rejected: Array<{ url?: string; reason?: string }>;
};

type ResearchBatchStatus = {
  batch: number | string;
  searchedAt: string;
  total: number;
  imported: number;
  published: number;
};

export function TinyFishWorldConsole({
  configured,
  campaigns,
}: {
  configured: boolean;
  campaigns: TinyFishCampaign[];
}) {
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [message, setMessage] = useState("");
  const [research, setResearch] = useState<ResearchBatchStatus | null>(null);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchFailures, setResearchFailures] = useState(0);
  const [currentExam, setCurrentExam] = useState("");

  async function refreshStatus() {
    const response = await fetch("/api/admin/tinyfish-world", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = await response.json();
    setResearch(payload.researchBatch || null);
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function run(campaign: TinyFishCampaign) {
    setBusy(campaign.key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/tinyfish-world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: campaign.key }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "فشلت الدفعة");
      setResults((current) => ({ ...current, [campaign.key]: payload }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشلت العملية.");
    } finally {
      setBusy("");
    }
  }

  async function runAll() {
    for (const campaign of campaigns) {
      // تُشغّل بالتتابع حتى لا نضغط على TinyFish أو Azure Storage.
      await run(campaign);
    }
    setMessage("اكتملت الدفعة العالمية الأولى.");
  }

  async function importResearchBatch() {
    if (!research) return;
    setBusy("research");
    setMessage("");
    setResearchProgress(0);
    setResearchFailures(0);
    let failures = 0;
    for (let index = 0; index < research.total; index += 1) {
      setCurrentExam(`الاختبار ${index + 1} من ${research.total}`);
      try {
        const response = await fetch("/api/admin/tinyfish-world", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ researchIndex: index }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "فشل الاستيراد");
        setCurrentExam(
          `${payload.exam?.university || ""} · ${payload.exam?.year || ""}`,
        );
      } catch {
        failures += 1;
        setResearchFailures(failures);
      }
      setResearchProgress(index + 1);
    }
    await refreshStatus();
    setBusy("");
    setCurrentExam("");
    setMessage(
      failures
        ? `اكتملت الدفعة مع ${failures} عناصر تحتاج إعادة المحاولة.`
        : "تم استيراد الدفعة الموثقة كاملة مع إنشاء القارئ.",
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold">دفعة البحث العميق الموثقة</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {research
                ? `${research.total} ملف PDF رسمي · نُشر ${research.published} · موجود ${research.imported}`
                : "جارٍ قراءة حالة الدفعة…"}
            </p>
            {busy === "research" && research && (
              <p className="mt-1 text-[10px] text-primary">
                {researchProgress}/{research.total}
                {currentExam ? ` · ${currentExam}` : ""}
                {researchFailures ? ` · تعذر ${researchFailures}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={importResearchBatch}
            disabled={!research || Boolean(busy)}
            className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy === "research"
              ? "يُنسخ ويُنشئ القارئ…"
              : `استيراد ${research?.total || ""} اختبارًا`}
          </button>
        </div>
        {research && busy === "research" && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary transition-[width]"
              style={{
                width: `${Math.round(
                  (researchProgress / research.total) * 100,
                )}%`,
              }}
            />
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-bold">الحالة</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {configured
              ? "مفتاح TinyFish متصل بالخادم."
              : "المفتاح غير موجود في Azure."}
          </p>
        </div>
        <button
          type="button"
          onClick={runAll}
          disabled={!configured || Boolean(busy)}
          className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "يعمل الآن…" : "تشغيل الدفعة العالمية"}
        </button>
      </div>

      <div className="divide-y border-y">
        {campaigns.map((campaign) => {
          const result = results[campaign.key];
          const created =
            result?.imported.filter((item) => item.action === "created").length ||
            0;
          const existing =
            result?.imported.filter((item) => item.action === "existing").length ||
            0;
          const drafts =
            result?.imported.filter(
              (item) => item.action === "draft_reader_failed",
            ).length || 0;
          return (
            <div
              key={campaign.key}
              className="flex items-center gap-3 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">
                  {campaign.countryAr} · {campaign.universityAr}
                </span>
                <span
                  dir="ltr"
                  className="mt-0.5 block truncate text-left text-[10px] text-muted-foreground"
                >
                  {campaign.domain}
                </span>
                {result && (
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {result.found} نتائج · {result.candidates} PDF مرشح ·{" "}
                    <b className="text-emerald-600">{created} جديد</b> ·{" "}
                    {existing} موجود · {drafts} ينتظر القارئ ·{" "}
                    {result.rejected.length} مرفوض
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => run(campaign)}
                disabled={!configured || Boolean(busy)}
                className="shrink-0 rounded-full border px-3 py-1 text-[10px] transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {busy === campaign.key ? "يبحث…" : "تشغيل"}
              </button>
            </div>
          );
        })}
      </div>
      {message && <p className="text-[11px] text-muted-foreground">{message}</p>}
    </div>
  );
}