"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function reviewContribution(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return;

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const adminNotes =
    String(formData.get("adminNotes") ?? "").trim().slice(0, 2000) || null;
  if (!id) return;

  const map: Record<
    string,
    { status: "accepted" | "duplicate" | "rejected"; points: number }
  > = {
    accept10: { status: "accepted", points: 10 },
    accept5: { status: "accepted", points: 5 },
    duplicate: { status: "duplicate", points: 0 },
    reject: { status: "rejected", points: 0 },
  };
  const d = map[decision];
  if (!d) return;

  const existing = await prisma.contribution.findUnique({ where: { id } });
  if (!existing || existing.status !== "pending") return;

  await prisma.contribution.update({
    where: { id },
    data: {
      status: d.status,
      pointsAwarded: d.points,
      adminNotes,
      handledById: session?.user?.id ?? null,
    },
  });

  if (d.points > 0) {
    // Explicit set instead of increment: increment silently does nothing on
    // accounts created before the points field existed.
    const contributor = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { points: true },
    });
    await prisma.user.update({
      where: { id: existing.userId },
      data: { points: (contributor?.points ?? 0) + d.points },
    });
  }

  revalidatePath("/admin/contributions");
  revalidatePath("/contribute");
  revalidatePath("/contributors");
}
