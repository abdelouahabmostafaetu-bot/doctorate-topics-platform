import "server-only";

import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const GUEST_TOPIC_LIMIT = 3;

type RequestHeaders = {
  get(name: string): string | null;
};

export type GuestTopicAccess = {
  allowed: boolean;
  viewedTopics: number;
  remainingTopics: number;
};

function visitorFingerprint(headers: RequestHeaders): string {
  const forwardedFor = headers.get("x-forwarded-for") ?? "";
  const ip =
    forwardedFor.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown-ip";

  // لا نخزن عنوان IP أو بيانات المتصفح بصورتها الأصلية.
  // البصمة الخادمية تجعل حذف الكوكيز أو استخدام النافذة الخفية غير كافٍ لتصفير العداد.
  const identityParts = [
    ip,
    headers.get("user-agent") ?? "unknown-agent",
    headers.get("accept-language") ?? "unknown-language",
    headers.get("sec-ch-ua") ?? "",
    headers.get("sec-ch-ua-mobile") ?? "",
    headers.get("sec-ch-ua-platform") ?? "",
  ];
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.DATABASE_URL ??
    "docmath-guest-topic-limit-v1";

  return createHmac("sha256", secret)
    .update(identityParts.join("\u001f"))
    .digest("hex");
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * يسمح للزائر بثلاثة مواضيع مختلفة فقط.
 *
 * تُستخدم ثلاثة مواضع ذات فهارس فريدة في MongoDB، لذلك لا يستطيع الزائر تجاوز
 * الحد بإرسال عدة طلبات متزامنة. إعادة فتح موضوع سبق احتسابه تبقى مسموحة.
 */
export async function checkGuestTopicAccess(
  topicSlug: string,
  headers: RequestHeaders,
): Promise<GuestTopicAccess> {
  const visitorKey = visitorFingerprint(headers);

  const existing = await prisma.guestTopicAccess.findUnique({
    where: { visitorKey_topicSlug: { visitorKey, topicSlug } },
    select: { slot: true },
  });
  if (existing) {
    return {
      allowed: true,
      viewedTopics: existing.slot,
      remainingTopics: Math.max(0, GUEST_TOPIC_LIMIT - existing.slot),
    };
  }

  for (let slot = 1; slot <= GUEST_TOPIC_LIMIT; slot += 1) {
    try {
      await prisma.guestTopicAccess.create({
        data: { visitorKey, topicSlug, slot },
      });
      return {
        allowed: true,
        viewedTopics: slot,
        remainingTopics: GUEST_TOPIC_LIMIT - slot,
      };
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;

      // قد يكون طلب متزامن لنفس الموضوع قد سبقنا إلى الإنشاء.
      const concurrentExisting = await prisma.guestTopicAccess.findUnique({
        where: { visitorKey_topicSlug: { visitorKey, topicSlug } },
        select: { slot: true },
      });
      if (concurrentExisting) {
        return {
          allowed: true,
          viewedTopics: concurrentExisting.slot,
          remainingTopics: Math.max(
            0,
            GUEST_TOPIC_LIMIT - concurrentExisting.slot,
          ),
        };
      }
    }
  }

  return {
    allowed: false,
    viewedTopics: GUEST_TOPIC_LIMIT,
    remainingTopics: 0,
  };
}
