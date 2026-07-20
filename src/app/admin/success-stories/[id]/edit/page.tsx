import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SuccessStoryForm } from "@/components/admin/success-story-form";
import { updateSuccessStoryAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditSuccessStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await prisma.successStory.findUnique({ where: { id } });
  if (!story) notFound();
  return (
    <div className="mx-auto max-w-2xl" dir="rtl">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-sm font-bold">تعديل التجربة</h2>
        <Link
          href="/admin/success-stories"
          className="text-[11px] text-muted-foreground transition hover:text-primary"
        >
          العودة
        </Link>
      </div>
      <div className="mt-5">
        <SuccessStoryForm
          action={updateSuccessStoryAction}
          initial={story}
          submitLabel="حفظ"
        />
      </div>
    </div>
  );
}
