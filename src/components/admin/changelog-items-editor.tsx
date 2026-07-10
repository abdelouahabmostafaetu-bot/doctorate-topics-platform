"use client";

// محرّر عناصر إدخال "جديدنا" (نوع + نص) — الأسبوع 7
import { useState } from "react";

export type EditableChangelogItem = {
  type: "new" | "improved" | "fixed";
  textAr: string;
};

const TYPE_LABELS: Record<EditableChangelogItem["type"], string> = {
  new: "🆕 جديد",
  improved: "⚡ تحسين",
  fixed: "🐛 إصلاح",
};

function emptyItem(): EditableChangelogItem {
  return { type: "new", textAr: "" };
}

export function ChangelogItemsEditor({
  name = "itemsJson",
}: {
  name?: string;
}) {
  const [items, setItems] = useState<EditableChangelogItem[]>([emptyItem()]);

  function update(i: number, patch: Partial<EditableChangelogItem>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((item, i) => (
        <div key={i} className="flex flex-wrap items-start gap-2">
          <select
            value={item.type}
            onChange={(e) =>
              update(i, {
                type: e.target.value as EditableChangelogItem["type"],
              })
            }
            className="rounded-md border bg-background px-2 py-2 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={item.textAr}
            onChange={(e) => update(i, { textAr: e.target.value })}
            dir="auto"
            placeholder="وصف التحديث"
            className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setItems((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="rounded-md border border-destructive px-2 py-2 text-xs text-destructive"
            >
              حذف
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, emptyItem()])}
        className="rounded-md border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
      >
        + إضافة عنصر
      </button>
    </div>
  );
}
