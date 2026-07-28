"use client";

import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import { createModule } from "@/app/admin/lectures/actions";
import { LEVELS } from "@/lib/lectures";

type UniversityOption = { id: string; name: string };
type SpecialtyOption = { id: string; name: string; universityId: string; level: string };
type ModuleOption = { id: string; name: string; universityId: string; level: string; lectureSpecialtyId: string | null };

const fieldClass = "h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

export function LectureModuleForm({ universities, specialties, modules }: {
	universities: UniversityOption[];
	specialties: SpecialtyOption[];
	modules: ModuleOption[];
}) {
	const [universityId, setUniversityId] = useState("");
	const [level, setLevel] = useState("L1");
	const [specialtyId, setSpecialtyId] = useState("");
	const needsSpecialty = level === "L3" || level === "M1" || level === "M2";

	const availableSpecialties = useMemo(
		() => specialties.filter((item) => item.universityId === universityId && item.level === level),
		[specialties, universityId, level],
	);
	const availableModules = useMemo(
		() => modules.filter((item) => item.universityId === universityId && item.level === level && (!specialtyId || specialtyId === "__new__" || item.lectureSpecialtyId === specialtyId)),
		[modules, universityId, level, specialtyId],
	);

	return (
		<form action={createModule} className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label className="space-y-1 text-[11px] font-medium">الجامعة
					<select name="universityId" required value={universityId} onChange={(event) => { setUniversityId(event.target.value); setSpecialtyId(""); }} className={fieldClass}>
						<option value="">اختر الجامعة</option>
						{universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
					</select>
				</label>
				<label className="space-y-1 text-[11px] font-medium">المستوى
					<select name="level" value={level} onChange={(event) => { setLevel(event.target.value); setSpecialtyId(""); }} className={fieldClass}>
						{LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
					</select>
				</label>
				{needsSpecialty && (
					<label className="space-y-1 text-[11px] font-medium">التخصص
						<select name="lectureSpecialtyId" required={level === "M1" || level === "M2"} value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className={fieldClass}>
							<option value="">{level === "L3" ? "بدون تخصص" : "اختر التخصص"}</option>
							{availableSpecialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
							<option value="__new__">＋ إضافة تخصص جديد</option>
						</select>
					</label>
				)}
				{specialtyId === "__new__" && (
					<label className="space-y-1 text-[11px] font-medium">اسم التخصص الجديد
						<input name="newSpecialtyName" required maxLength={80} placeholder="مثال: Analyse Mathématique" className={fieldClass} />
					</label>
				)}
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label className="space-y-1 text-[11px] font-medium sm:col-span-2">اسم الموديل
					<input name="name" required maxLength={120} list="existing-module-names" placeholder="مثال: Analyse Fonctionnelle" className={fieldClass} />
					<datalist id="existing-module-names">{availableModules.map((item) => <option key={item.id} value={item.name} />)}</datalist>
				</label>
				<label className="space-y-1 text-[11px] font-medium">السداسي
					<select name="semester" className={fieldClass}><option value="1">السداسي 1</option><option value="2">السداسي 2</option></select>
				</label>
				<label className="space-y-1 text-[11px] font-medium">المعامل
					<input name="coefficient" type="number" min={1} max={10} placeholder="اختياري" className={fieldClass} />
				</label>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<button type="submit" className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
					<PlusCircle className="h-3.5 w-3.5" />إضافة الموديل
				</button>
				{universityId && <span className="text-[10px] text-muted-foreground">{availableModules.length} موديل موجود ضمن الاختيار الحالي</span>}
			</div>
		</form>
	);
}
