"use server";

// إجراءات صفحة الموضوع: بلاغات + مفضلة — تتطلب تسجيل دخول
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const VALID_TYPES = [
	"wrong_content",
	"broken_file",
	"wrong_classification",
	"other",
] as const;

type ReportType = (typeof VALID_TYPES)[number];

export type ReportFormState = { error?: string; success?: string };

/**
 * إرسال بلاغ عن خطأ في موضوع (FR-401) — يُرسل للمشرف للمراجعة.
 * أول بلاغ للمستخدم على الموضوع نفسه يمنحه +3 نقاط (منع تكرار النقاط بالبلاغات المتكررة).
 */
export async function reportTopicAction(
	_prev: ReportFormState,
	formData: FormData,
): Promise<ReportFormState> {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) return { error: "يجب تسجيل الدخول لإرسال بلاغ" };

	const topicId = ((formData.get("topicId") as string) || "").trim();
	const problemNumberRaw = (formData.get("problemNumber") as string) || "";
	const typeRaw = (formData.get("type") as string) || "other";
	const message = ((formData.get("message") as string) || "").trim();

	if (!topicId) return { error: "موضوع غير معروف" };
	if (message.length < 5) {
		return { error: "يرجى وصف المشكلة بشكل مختصر (5 أحرف على الأقل)" };
	}

	const safeType: ReportType = (VALID_TYPES as readonly string[]).includes(
		typeRaw,
	)
		? (typeRaw as ReportType)
		: "other";

	try {
		// هل سبق للمستخدم التبليغ عن هذا الموضوع؟ (لمنح النقاط مرة واحدة فقط)
		const already = await prisma.report.findFirst({
			where: { userId, topicId },
			select: { id: true },
		});

		await prisma.report.create({
			data: {
				topicId,
				problemNumber: problemNumberRaw
					? parseInt(problemNumberRaw, 10)
					: null,
				userId,
				type: safeType,
				message,
			},
		});

		let msg = "تم إرسال البلاغ ✅ سيراجعه المشرف قريبًا.";
		if (!already) {
			await prisma.user.update({
				where: { id: userId },
				data: { points: { increment: 3 } },
			});
			msg += " حصلت على +3 نقاط 🏆";
		}

		revalidatePath("/admin/reports");
		revalidatePath("/account");
		return { success: msg };
	} catch {
		return { error: "تعذّر إرسال البلاغ — أعد المحاولة" };
	}
}

// الإجراء القديم (محفوظ للتوافقية مع أي استخدام سابق)
export async function createReportAction(formData: FormData) {
	const state = await reportTopicAction({}, formData);
	if (state.error) throw new Error(state.error);
}

// حفظ/إلغاء حفظ موضوع في المفضلة — لوحة المستخدم الشخصية (v2)
export async function toggleFavoriteAction(
	topicId: string,
	slug: string,
): Promise<{ favorited: boolean }> {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) throw new Error("يجب تسجيل الدخول لحفظ الموضوع");

	const existing = await prisma.favorite.findUnique({
		where: { userId_topicId: { userId, topicId } },
	});

	if (existing) {
		await prisma.favorite.delete({ where: { id: existing.id } });
	} else {
		await prisma.favorite.create({ data: { userId, topicId } });
	}

	revalidatePath(`/topics/${slug}`);
	revalidatePath("/account");
	return { favorited: !existing };
}
