"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("فقط المديرون يملكون هذا الإجراء");
  }
  return session!.user!;
}

export async function setReportStatusAction(
  id: string,
  status: "resolved" | "rejected",
) {
  const user = await requireAdmin();
  await prisma.report.update({
    where: { id },
    data: { status, handledById: user.id },
  });
  revalidatePath("/admin/reports");
}

// حفظ ملاحظات المدير الداخلية على البلاغ (محفوظة تلقائيًا — الأسبوع 7)
export async function saveReportNotesAction(formData: FormData) {
  const user = await requireAdmin();
  const id = formData.get("id") as string;
  const adminNotes = ((formData.get("adminNotes") as string) || "").trim();
  await prisma.report.update({
    where: { id },
    data: { adminNotes: adminNotes || null, handledById: user.id },
  });
  revalidatePath("/admin/reports");
}
