"use server";

// حفظ مساهمة دروس من عضو مسجّل — تبقى "قيد المراجعة" حتى يفرزها الأدمين
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveLectureContribution(input: {
	universityName: string;
	levelText: string;
	note: string;
	fileUrl: string;
	fileName: string;
	fileSizeBytes: number;
	mimeType?: string;
}) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) throw new Error("سجّل الدخول أولًا للمساهمة.");
	if (!input.fileUrl || !input.fileName) {
		throw new Error("بيانات الملف ناقصة.");
	}
	await prisma.lectureContribution.create({
		data: {
			userId,
			universityName:
				String(input.universityName || "").trim().slice(0, 120) || null,
			levelText: String(input.levelText || "").trim().slice(0, 40) || null,
			note: String(input.note || "").trim().slice(0, 1000) || null,
			fileUrl: input.fileUrl,
			fileName: input.fileName.slice(0, 200),
			fileSizeBytes: Math.max(0, Math.round(input.fileSizeBytes)),
			mimeType: input.mimeType?.slice(0, 100),
		},
	});
	revalidatePath("/contribute-lectures");
	revalidatePath("/admin/lecture-contributions");
}
