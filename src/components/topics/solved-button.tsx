"use client";

// زر "تم الحل ✓" — يعلّم الموضوع كمُنجز في نظام تتبع التقدم الشخصي
import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleTopicDoneAction } from "@/app/topics/actions";

export function SolvedButton({
  topicId,
  slug,
  initialDone,
  isLoggedIn,
}: {
  topicId: string;
  slug: string;
  initialDone: boolean;
  isLoggedIn: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link
        href="/signin"
        title="سجّل الدخول لتتبع المواضيع التي أنهيت حلها"
        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-emerald-500 hover:text-emerald-600"
      >
        ✓ تم الحل
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      title={
        done
          ? "موضوع محلول — اضغط للتراجع"
          : "علّم هذا الموضوع كموضوع أنهيت حله"
      }
      onClick={() =>
        startTransition(async () => {
          try {
            const res = await toggleTopicDoneAction(topicId, slug);
            setDone(res.done);
          } catch {
            // نتجاهل الخطأ — تبقى الحالة كما هي
          }
        })
      }
      className={
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition disabled:opacity-60 " +
        (done
          ? "bg-emerald-500/15 font-bold text-emerald-600 ring-1 ring-emerald-500/40"
          : "border text-muted-foreground hover:border-emerald-500 hover:text-emerald-600")
      }
    >
      {done ? "✅ محلول" : "✓ تم الحل"}
    </button>
  );
}
