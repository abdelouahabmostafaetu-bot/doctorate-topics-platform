"use client";

// رسالة استعادة المسودة (FR-604)
export function DraftRestoreBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <span>
        📝 تم العثور على مسودة غير مكتملة (آخر حفظ:{" "}
        {new Date(savedAt).toLocaleString("ar-DZ")}) — هل تريد المتابعة؟
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          متابعة المسودة
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm("حذف المسودة والبدء من جديد؟")) onDiscard();
          }}
          className="rounded-md border px-3 py-1.5 text-xs"
        >
          البدء من جديد
        </button>
      </div>
    </div>
  );
}
