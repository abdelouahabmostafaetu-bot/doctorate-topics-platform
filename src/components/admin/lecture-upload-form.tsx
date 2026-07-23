"use client";

// نموذج رفع ملف محاضرة: يرفع الملف مباشرة من المتصفح إلى R2 (presigned PUT)
// ثم يحفظ السجل في قاعدة البيانات — يدعم ملفات كبيرة وZIP حتى 200 م.ب
import { useState } from "react";
import { saveLectureResource } from "@/app/admin/lectures/actions";
import { LECTURE_TYPES } from "@/lib/lectures";

export function LectureUploadForm({
	modules,
}: {
	modules: { id: string; label: string }[];
}) {
	const [status, setStatus] = useState("");
	const [busy, setBusy] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const fd = new FormData(form);
		const file = fd.get("file") as File | null;
		const title = String(fd.get("title") || "").trim();
		const moduleId = String(fd.get("moduleId") || "");
		const type = String(fd.get("type") || "cours");
		if (!file || !file.size || !title || !moduleId) {
			setStatus("⚠️ أكمل كل الحقول واختر ملفًا");
			return;
		}
		setBusy(true);
		try {
			setStatus("⏳ تجهيز رابط الرفع...");
			const pres = await fetch("/api/lectures/presign", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fileName: file.name,
					contentType: file.type || "application/octet-stream",
					sizeBytes: file.size,
				}),
			});
			const data = (await pres.json()) as {
				uploadUrl?: string;
				url?: string;
				error?: string;
			};
			if (!pres.ok || !data.uploadUrl || !data.url) {
				throw new Error(data.error || "فشل تجهيز الرفع");
			}
			setStatus("⏳ جارٍ رفع الملف مباشرة إلى التخزين...");
			const put = await fetch(data.uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type || "application/octet-stream",
				},
				body: file,
			});
			if (!put.ok) throw new Error("فشل رفع الملف إلى التخزين");
			setStatus("⏳ حفظ البيانات...");
			await saveLectureResource({
				title,
				type,
				moduleId,
				fileUrl: data.url,
				fileName: file.name,
				fileSizeBytes: file.size,
				mimeType: file.type || undefined,
			});
			setStatus("✅ تم رفع الملف بنجاح — ظهر مباشرة في صفحة الموديل");
			form.reset();
		} catch (err) {
			setStatus(
				"⚠️ " + (err instanceof Error ? err.message : "خطأ غير متوقع"),
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="block text-xs">
					الموديل
					<select
						name="moduleId"
						required
						className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
					>
						<option value="">— اختر الموديل —</option>
						{modules.map((m) => (
							<option key={m.id} value={m.id}>
								{m.label}
							</option>
						))}
					</select>
				</label>
				<label className="block text-xs">
					نوع الملف
					<select
						name="type"
						className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
					>
						{LECTURE_TYPES.map((t) => (
							<option key={t.value} value={t.value}>
								{t.icon} {t.label}
							</option>
						))}
					</select>
				</label>
			</div>
			<label className="block text-xs">
				عنوان الملف (مثال: محاضرة 1 — الفضاءات المترية)
				<input
					name="title"
					required
					maxLength={150}
					className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
				/>
			</label>
			<label className="block text-xs">
				الملف (PDF / صورة / ZIP — حتى 200 م.ب)
				<input
					type="file"
					name="file"
					required
					className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
				/>
			</label>
			<button
				type="submit"
				disabled={busy}
				className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
			>
				{busy ? "⏳ جارٍ الرفع..." : "📤 رفع الملف"}
			</button>
			{status && <p className="text-xs">{status}</p>}
		</form>
	);
}
