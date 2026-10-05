"use client";

import { useState } from "react";
import type { TinyFishCampaign } from "@/lib/tinyfish-world";

type RunResult = {
  campaign: string;
  found: number;
  candidates: number;
  imported: Array<{ action?: string; slug?: string }>;
  rejected: Array<{ url?: string; reason?: string }>;
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

  return (
    <div className="space-y-4">
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