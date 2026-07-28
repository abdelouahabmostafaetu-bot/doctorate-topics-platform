"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, FileUp, LoaderCircle, TriangleAlert } from "lucide-react";
import { createModule, saveLectureResource } from "@/app/admin/lectures/actions";
import { LEVELS } from "@/lib/lectures";

type UniversityOption = { id: string; name: string };
type SpecialtyOption = { id: string; name: string; universityId: string; level: string };
type ModuleOption = { id: string; name: string; universityId: string; level: string; lectureSpecialtyId: string | null; label: string };

const fieldClass = "h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

export function LectureUploadForm({ universities, specialties, modules }: {
	universities: UniversityOption[];
	specialties: SpecialtyOption[];
	modules: ModuleOption[];
}) {
	const router = useRouter();
	const [universityId, setUniversityId] = useState("");
	const [level, setLevel] = useState("L1");
	const [specialtyId, setSpecialtyId] = useState("");
	const [moduleChoice, setModuleChoice] = useState("");
	const [status, setStatus] = useState("");
	const [kind, setKind] = useState<"idle" | "busy" | "success" | "error">("idle");
	const busy = kind === "busy";
	const needsSpecialty = level === "L3" || level === "M1" || level === "M2";

	const availableSpecialties = useMemo(
		() => specialties.filter((item) => item.universityId === universityId && item.level === level),
		[specialties, universityId, level],
	);
	const availableModules = useMemo(
		() => modules.filter((item) => item.universityId === universityId && item.level === level && (!needsSpecialty || !specialtyId ? item.lectureSpecialtyId === null : item.lectureSpecialtyId === specialtyId)),
		[modules, universityId, level, specialtyId, needsSpecialty],
	);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const formData = new FormData(form);
		const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
		if (!universityId || !moduleChoice || files.length === 0) { setKind("error"); setStatus("اختر الجامعة والموديل وملفًا واحدًا على الأقل."); return; }
		if (files.length > 20) { setKind("error"); setStatus("يمكن رفع 20 ملفًا كحد أقصى في كل مرة."); return; }

		setKind("busy");
		try {
			let moduleId = moduleChoice;
			if (moduleChoice === "__new__") {
				setStatus("جارٍ إنشاء الموديل تلقائيًا...");
				const moduleData = new FormData();
				moduleData.set("name", String(formData.get("newModuleName") || ""));
				moduleData.set("universityId", universityId);
				moduleData.set("level", level);
				moduleData.set("lectureSpecialtyId", specialtyId);
				moduleData.set("newSpecialtyName", String(formData.get("newSpecialtyName") || ""));
				const createdId = await createModule(moduleData);
				if (!createdId) throw new Error("تعذر إنشاء الموديل. تحقق من الاسم والتخصص.");
				moduleId = createdId;
			}

			for (let index = 0; index < files.length; index += 1) {
				const file = files[index];
				setStatus(`رفع الملف ${index + 1} من ${files.length}: ${file.name}`);
				const contentType = file.type || "application/octet-stream";
				const presign = await fetch("/api/lectures/presign", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ fileName: file.name, contentType, sizeBytes: file.size }),
				});
				const data = (await presign.json()) as { uploadUrl?: string; url?: string; error?: string };
				if (!presign.ok || !data.uploadUrl || !data.url) throw new Error(data.error || `تعذر تجهيز ${file.name}`);
				const upload = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
				if (!upload.ok) throw new Error(`تعذر رفع ${file.name}`);
				await saveLectureResource({
					title: file.name.replace(/\.[^.]+$/, ""),
					type: "cours",
					moduleId,
					folderPath: "",
					fileUrl: data.url,
					fileName: file.name,
					fileSizeBytes: file.size,
					mimeType: contentType,
				});
			}
			setKind("success");
			setStatus(`تم نشر ${files.length} ملف بنجاح.`);
			form.reset();
			router.refresh();
		} catch (error) {
			setKind("error");
			setStatus(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label className="space-y-1 text-[11px] font-medium">الجامعة
					<select name="universityId" required value={universityId} onChange={(event) => { setUniversityId(event.target.value); setSpecialtyId(""); setModuleChoice(""); }} className={fieldClass}>
						<option value="">اختر الجامعة</option>{universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
					</select>
				</label>
				<label className="space-y-1 text-[11px] font-medium">المستوى
					<select name="level" value={level} onChange={(event) => { setLevel(event.target.value); setSpecialtyId(""); setModuleChoice(""); }} className={fieldClass}>{LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
				</label>
				{needsSpecialty && <label className="space-y-1 text-[11px] font-medium">التخصص
					<select name="lectureSpecialtyId" value={specialtyId} onChange={(event) => { setSpecialtyId(event.target.value); setModuleChoice(""); }} className={fieldClass}>
						<option value="">{level === "L3" ? "بدون تخصص" : "اختر التخصص"}</option>{availableSpecialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="__new__">＋ تخصص جديد</option>
					</select>
				</label>}
				<label className="space-y-1 text-[11px] font-medium">الموديل
					<select name="moduleId" required value={moduleChoice} onChange={(event) => setModuleChoice(event.target.value)} className={fieldClass}><option value="">اختر الموديل</option>{availableModules.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="__new__">＋ موديل جديد تلقائيًا</option></select>
				</label>
			</div>

			{specialtyId === "__new__" && <label className="block max-w-md space-y-1 text-[11px] font-medium">اسم التخصص الجديد<input name="newSpecialtyName" required maxLength={80} placeholder="مثال: Analyse Mathématique" className={fieldClass} /></label>}

			{moduleChoice === "__new__" && (
				<label className="block max-w-md space-y-1 text-[11px] font-medium">اسم الموديل الجديد
					<input name="newModuleName" required maxLength={120} placeholder="مثال: Analyse Fonctionnelle" className={fieldClass} />
				</label>
			)}

			<label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-2 transition hover:border-primary/50 hover:bg-primary/[0.03]">
				<FileUp className="h-5 w-5 shrink-0 text-primary" />
				<span className="min-w-0 flex-1"><span className="block text-xs font-medium">اختر ملفًا أو عدة ملفات</span><span className="block text-[10px] text-muted-foreground">PDF، DJVU، صور وملفات أخرى — 200 م.ب لكل ملف</span></span>
				<input type="file" name="files" multiple required accept=".pdf,.djvu,.djv,.zip,.rar,.7z,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,text/*" className="max-w-[220px] text-[10px] text-muted-foreground file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-primary" />
			</label>

			<div className="flex flex-wrap items-center gap-3">
				<button type="submit" disabled={busy} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
					{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}{busy ? "جارٍ الرفع..." : "رفع ونشر الملفات"}
				</button>
				{status && <p className={`flex items-center gap-1.5 text-[11px] ${kind === "error" ? "text-red-600" : kind === "success" ? "text-emerald-600" : "text-muted-foreground"}`}>{kind === "error" ? <TriangleAlert className="h-3.5 w-3.5" /> : kind === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{status}</p>}
			</div>
		</form>
	);
}
