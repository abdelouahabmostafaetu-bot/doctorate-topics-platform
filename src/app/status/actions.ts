"use server";

// الاشتراك في تنبيهات حالة النظام (FR-704)
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function subscribeAction(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("يرجى إدخال بريد إلكتروني صالح");
  }
  const unsubscribeToken = randomBytes(16).toString("hex");
  await prisma.statusSubscription.upsert({
    where: { email },
    update: {},
    create: { email, unsubscribeToken },
  });
}

export async function unsubscribeAction(formData: FormData) {
  const token = formData.get("token") as string;
  if (!token) return;
  await prisma.statusSubscription.deleteMany({
    where: { unsubscribeToken: token },
  });
}
