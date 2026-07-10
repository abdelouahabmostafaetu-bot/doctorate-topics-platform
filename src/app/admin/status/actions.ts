"use server";

// إدارة حالة النظام والأعطال (SUPER_ADMIN فقط — FR-702, FR-703, FR-706)
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendMail } from "@/lib/mail";

async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("هذا الإجراء متاح للمشرف الرئيسي فقط");
  }
  return session.user;
}

export async function setServiceStateAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const key = formData.get("key") as string;
  const state = formData.get("state") as string;
  await prisma.serviceStatus.update({
    where: { key: key as never },
    data: {
      state: state as never,
      lastCheckedAt: new Date(),
      updatedById: user.id,
    },
  });
  revalidatePath("/admin/status");
  revalidatePath("/status");
}

export async function openIncidentAction(formData: FormData) {
  await requireSuperAdmin();
  const serviceKey = formData.get("serviceKey") as string;
  const titleAr = ((formData.get("titleAr") as string) || "").trim();
  const descriptionAr = (
    (formData.get("descriptionAr") as string) || ""
  ).trim();
  if (!titleAr) throw new Error("عنوان العطل مطلوب");

  await prisma.incident.create({
    data: {
      serviceKey: serviceKey as never,
      titleAr,
      descriptionAr: descriptionAr || null,
      startedAt: new Date(),
    },
  });
  revalidatePath("/admin/status");
  revalidatePath("/status");
}

export async function resolveIncidentAction(id: string) {
  await requireSuperAdmin();

  const incident = await prisma.incident.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });

  if (!incident.notifiedSubscribers) {
    const subscribers = await prisma.statusSubscription.findMany();
    await Promise.all(
      subscribers.map((sub) =>
        sendMail({
          to: sub.email,
          subject: `تم حل العلل: ${incident.titleAr}`,
          html: `<p>${incident.titleAr}</p><p>تم الإعلان عن حل هذا العلل. رابط الاشتراك: /status</p>`,
        }),
      ),
    );
    await prisma.incident.update({
      where: { id },
      data: { notifiedSubscribers: true },
    });
  }

  revalidatePath("/admin/status");
  revalidatePath("/status");
}
