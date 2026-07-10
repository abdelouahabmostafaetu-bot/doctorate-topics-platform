"use client";

// مؤشر الحفظ التلقائي بحالاته (FR-605)
import type { SaveStatus } from "@/hooks/use-auto-save";

const LABELS: Record<
  Exclude<SaveStatus, "idle">,
  { text: string; className: string }
> = {
  saving: { text: "⏳ جارٍ الحفظ...", className: "text-muted-foreground" },
  saved: { text: "✓ تم الحفظ", className: "text-emerald-600" },
  offline: {
    text: "⚠️ غير متصل — سيُحفظ محليًا",
    className: "text-amber-600",
  },
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const conf = LABELS[status];
  return (
    <span className={`text-xs font-medium ${conf.className}`}>{conf.text}</span>
  );
}
