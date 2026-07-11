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
