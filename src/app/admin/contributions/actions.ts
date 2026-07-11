"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function reviewContribution(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role;

  // The page is admin-only, but keep the action protected as well.
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/signin");
  }

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const adminNotes =
    String(formData.get("adminNotes") ?? "").trim().slice(0, 2000) || null;

  const decisions: Record<
    string,
    { status: "accepted" | "duplicate" | "rejected"; points: number }
  > = {
    accept10: { status: "accepted", points: 10 },
    accept5: { status: "accepted", points: 5 },
    duplicate: { status: "duplicate", points: 0 },
    reject: { status: "rejected", points: 0 },
  };
  const selected = decisions[decision];

  // Always return to the inbox, even if an old button/form sent invalid data.
  if (!id || !selected) {
    redirect("/admin/contributions");
  }

  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  // A contribution can only be reviewed once. The redirect makes the latest
  // inbox state visible immediately instead of leaving the old card onscreen.
  if (!contribution || contribution.status !== "pending") {
    redirect("/admin/contributions");
  }

  await prisma.$transaction(async (tx) => {
    await tx.contribution.update({
      where: { id: contribution.id },
      data: {
        status: selected.status,
        pointsAwarded: selected.points,
        adminNotes,
        handledById: session?.user?.id ?? null,
      },
    });

    if (selected.points > 0) {
      const contributor = await tx.user.findUnique({
        where: { id: contribution.userId },
        select: { points: true },
      });

      // Explicit value works with both new accounts and accounts created
      // before the points field was added.
      await tx.user.update({
        where: { id: contribution.userId },
        data: { points: (contributor?.points ?? 0) + selected.points },
      });
    }
  });

  revalidatePath("/admin/contributions");
  revalidatePath("/contribute");
  revalidatePath("/contributors");
  revalidatePath("/");

  // This is the important part: force the browser back to the refreshed inbox.
  redirect("/admin/contributions");
}
