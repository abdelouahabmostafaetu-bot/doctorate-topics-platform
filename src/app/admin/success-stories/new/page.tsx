import Link from "next/link";
import { SuccessStoryForm } from "@/components/admin/success-story-form";
import { createSuccessStoryAction } from "../actions";

export default function NewSuccessStoryPage() {
  return (
    <div className="mx-auto max-w-2xl" dir="rtl">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-sm font-bold">✦ تجربة نجاح</h2>
        <Link
          href="/admin/success-stories"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          العودة
        </Link>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        الاسم اختياري؛ عند تركه فارغًا ستظهر التجربة باسم «باحث/ة ناجح/ة».
      </p>
      <div className="mt-5">
        <SuccessStoryForm
          action={createSuccessStoryAction}
          submitLabel="نشر التجربة"
        />
      </div>
    </div>
  );
}
