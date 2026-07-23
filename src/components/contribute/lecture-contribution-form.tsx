"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, FileUp, LoaderCircle, TriangleAlert } from "lucide-react";
import { saveLectureContribution } from "@/app/contribute-lectures/actions";

const fieldClass = "mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

const LEVEL_CHOICES = ["ليسانس 1", "ليسانس 2", "ليسانس 3", "ماستر 1", "ماستر 2", "غير محدد"];

export function LectureContributionForm() {
	const router = useRouter();
	const [status, setStatus] = useState("");
	const [kind, setKind] = useState<"idle" | "busy" | "success" | "error">("idle");
	const busy = kind === "busy";

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		const fd = new FormData(form);
		const file = fd.get("file") as File | null;
		const universityName = String(fd.get("universityName") || "").trim();
		const levelText = String(fd.get("levelText") || "");
		const note = String(fd.get("note") || "").trim();
		if (!file?.size || !universityName) { setKind("error"); setStatus("اكتب اسم الجامعة واختر ملفًا."); return; }
		setKind("busy");
		try {
			setStatus("تجهيز رابط الرفع الآمن...");
			const pres = await fetch("/api/lecture-contributions/presign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size }) });
			const data = (await pres.json()) as { uploadUrl?: string; url?: string; error?: string };
			if (!pres.ok || !data.uploadUrl || !data.url) throw new Error(data.error || "تعذر تجهيز الرفع");
			setStatus("جارِ رفع الملف...");
			const put = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
			if (!put.ok) throw new Error("تعذر رفع الملف إلى التخزين");
			setStatus("جارِ حفظ المساهمة...");
			await saveLectureContribution({ universityName, levelText, note, fileUrl: data.url, fileName: file.name, fileSizeBytes: file.size, mimeType: file.type || undefined });
			setKind("success"); setStatus("وصلت مساهمتك 🎉 سنراجعها وننشرها وتحصل على نقاطك."); form.reset();
			router.refresh();
		} catch (error) {
			setKind("error"); setStatus(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="block text-xs font-medium">جامعتك<input name="universityName" required maxLength={120} placeholder="مثال: جامعة الجزائر 1" className={fieldClass} /></label>
				<label className="block text-xs font-medium">المستوى<select name="levelText" className={fieldClass}>{LEVEL_CHOICES.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
			</div>
			<label className="block text-xs font-medium">ماذا يحتوي الملف؟ (اختياري)
				<textarea name="note" maxLength={1000} rows={3} placeholder="مثال: محاضرات وسلاسل TD لموديل التحليل — السداسي الأول..." className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
			</label>
			<label className="block text-xs font-medium">اختر الملف (يمكنك جمع عدة ملفات في ZIP واحد)
				<span className="mt-1.5 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-secondary/25 px-4 py-3 text-center transition hover:border-primary/50 hover:bg-primary/[0.035]">
					<FileUp className="h-5 w-5 text-primary" /><span className="mt-1 text-[11px] text-muted-foreground">PDF، صورة أو ZIP — الحد الأقصى 100 م.ب</span>
					<input type="file" name="file" required className="mt-2 max-w-full text-[11px] text-muted-foreground file:ml-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-primary" />
				</span>
			</label>
			<div className="flex flex-wrap items-center gap-3">
				<button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
					{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}{busy ? "جارِ الرفع..." : "إرسال المساهمة"}
				</button>
				{status && <p className={`flex items-center gap-1.5 text-[11px] ${kind === "error" ? "text-red-600" : kind === "success" ? "text-emerald-600" : "text-muted-foreground"}`}>{kind === "error" ? <TriangleAlert className="h-3.5 w-3.5" /> : kind === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{status}</p>}
			</div>
		</form>
	);
}
