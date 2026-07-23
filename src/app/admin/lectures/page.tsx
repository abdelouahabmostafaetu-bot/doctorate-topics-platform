import { BookOpen, CloudUpload, FileText, FolderCog, GraduationCap, PlusCircle, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LectureUploadForm } from "@/components/admin/lecture-upload-form";
import { LEVELS, levelByValue, lectureType, fmtSize } from "@/lib/lectures";
import { createLectureSpecialty, createModule, deleteLectureSpecialty, deleteModule, deleteResource } from "./actions";

export const dynamic = "force-dynamic";
const fieldClass = "mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

export default async function AdminLecturesPage() {
	const [universities, lectureSpecialties, modules] = await Promise.all([
		prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
		prisma.lectureSpecialty.findMany({ include: { university: true, _count: { select: { modules: true } } }, orderBy: { name: "asc" } }),
		prisma.module.findMany({ include: { university: true, specialty: true, lectureSpecialty: true, resources: { orderBy: { createdAt: "desc" } } }, orderBy: [{ level: "asc" }, { semester: "asc" }, { name: "asc" }] }),
	]);
	const totalFiles = modules.reduce((sum, m) => sum + m.resources.length, 0);
	const totalDownloads = modules.reduce((sum, m) => sum + m.resources.reduce((n, r) => n + r.downloadsCount, 0), 0);
	const moduleOptions = modules.map((m) => ({ id: m.id, label: `${m.university.nameAr?.trim() || m.university.name} · ${levelByValue(m.level)?.label ?? m.level} · س${m.semester}${m.lectureSpecialty ? ` · ${m.lectureSpecialty.name}` : m.specialty ? ` · ${m.specialty.nameAr?.trim() || m.specialty.name}` : ""} · ${m.name}` }));

	return (
		<div className="space-y-5 py-3">
			<header className="rounded-2xl border bg-gradient-to-l from-primary/[0.12] via-card to-card p-5 shadow-sm">
				<div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">إدارة مكتبة المحاضرات</h2><p className="mt-0.5 text-xs text-muted-foreground">أنشئ الموديلات وارفع ملفات مفيدة ومنظمة للطلبة.</p></div></div>
				<div className="mt-4 grid grid-cols-3 gap-2 border-t border-primary/10 pt-3 text-center"><Stat value={modules.length} label="موديل" /><Stat value={totalFiles} label="ملف" /><Stat value={totalDownloads} label="تحميل" /></div>
			</header>

			<div className="grid gap-5 lg:grid-cols-2">
				<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
					<SectionTitle icon={<PlusCircle className="h-4 w-4" />} number="1" title="إنشاء موديل جديد" subtitle="حدد الجامعة والمستوى قبل رفع الملفات" />
					<form action={createModule} className="grid gap-4 p-4 sm:grid-cols-2">
						<label className="text-xs font-medium sm:col-span-2">اسم الموديل<input name="name" required maxLength={120} placeholder="مثال: Analyse Fonctionnelle" className={fieldClass} /></label>
						<label className="text-xs font-medium">الجامعة<select name="universityId" required className={fieldClass}><option value="">اختر الجامعة</option>{universities.map((u) => <option key={u.id} value={u.id}>{u.nameAr?.trim() || u.name}</option>)}</select></label>
						<label className="text-xs font-medium">المستوى<select name="level" className={fieldClass}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></label>
						<label className="text-xs font-medium">التخصص (ليسانس 3 / ماستر)<select name="lectureSpecialtyId" className={fieldClass}><option value="">بدون تخصص (جذع مشترك)</option>{lectureSpecialties.map((s) => <option key={s.id} value={s.id}>{s.university.nameAr?.trim() || s.university.name} · {levelByValue(s.level)?.label ?? s.level} · {s.name}</option>)}</select></label>
						<label className="text-xs font-medium">السداسي<select name="semester" className={fieldClass}><option value="1">السداسي 1</option><option value="2">السداسي 2</option></select></label>
						<label className="text-xs font-medium">المعامل (اختياري)<input name="coefficient" type="number" min={1} max={10} className={fieldClass} /></label>
						<div className="flex items-end"><button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"><PlusCircle className="h-4 w-4" />إنشاء الموديل</button></div>
					</form>
				</section>

				<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
					<SectionTitle icon={<CloudUpload className="h-4 w-4" />} number="2" title="رفع ملف جديد" subtitle="الرفع مباشر وآمن إلى Cloudflare R2" />
					<div className="p-4">{moduleOptions.length ? <LectureUploadForm modules={moduleOptions} /> : <p className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">أنشئ موديلًا أولًا، ثم ارجع لرفع الملف إليه.</p>}</div>
				</section>
			</div>

			<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
				<SectionTitle icon={<GraduationCap className="h-4 w-4" />} number="3" title="تخصصات المحاضرات" subtitle="تخصصات مستقلة تمامًا عن تخصصات المواضيع — لليسانس 3 والماستر" />
				<div className="space-y-4 p-4">
					<form action={createLectureSpecialty} className="grid gap-4 sm:grid-cols-4">
						<label className="text-xs font-medium sm:col-span-2">اسم التخصص<input name="name" required maxLength={80} placeholder="مثال: Analyse Mathématique" className={fieldClass} /></label>
						<label className="text-xs font-medium">الجامعة<select name="universityId" required className={fieldClass}><option value="">اختر الجامعة</option>{universities.map((u) => <option key={u.id} value={u.id}>{u.nameAr?.trim() || u.name}</option>)}</select></label>
						<label className="text-xs font-medium">المستوى<select name="level" className={fieldClass}><option value="L3">ليسانس 3</option><option value="M1">ماستر 1</option><option value="M2">ماستر 2</option></select></label>
						<div className="sm:col-span-4"><button type="submit" className="flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"><PlusCircle className="h-4 w-4" />إضافة التخصص</button></div>
					</form>
					{lectureSpecialties.length > 0 && <div className="overflow-hidden rounded-xl border"><div className="divide-y">{lectureSpecialties.map((s) => (
						<div key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
							<span className="text-xs font-semibold">{s.name}</span>
							<span className="text-[10px] text-muted-foreground">{s.university.nameAr?.trim() || s.university.name} · {levelByValue(s.level)?.label ?? s.level}</span>
							<span className="mr-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{s._count.modules} موديل</span>
							<form action={deleteLectureSpecialty}><input type="hidden" name="id" value={s.id} /><button type="submit" title="يُحذف فقط إذا كان فارغًا من الموديلات" className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 className="h-3.5 w-3.5" /></button></form>
						</div>
					))}</div></div>}
				</div>
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between"><div><h3 className="flex items-center gap-2 text-sm font-bold"><FolderCog className="h-4 w-4 text-primary" />إدارة المحتوى</h3><p className="mt-0.5 text-[11px] text-muted-foreground">راجع الملفات أو احذف المحتوى غير الصحيح.</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">{modules.length} موديل</span></div>
				<div className="space-y-2">{modules.map((m) => (
					<details key={m.id} className="group overflow-hidden rounded-xl border bg-card shadow-sm">
						<summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-secondary/35"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}</span><span className="block truncate text-[10px] text-muted-foreground">{m.university.nameAr?.trim() || m.university.name} · {levelByValue(m.level)?.label ?? m.level} · س{m.semester}{m.lectureSpecialty ? ` · ${m.lectureSpecialty.name}` : m.specialty ? ` · ${m.specialty.nameAr?.trim() || m.specialty.name}` : ""}</span></span><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{m.resources.length} ملف</span></summary>
						<div className="border-t bg-secondary/10 p-3"><div className="space-y-2">{m.resources.map((r) => <div key={r.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{r.title}</span><span className="text-[10px] text-muted-foreground">{lectureType(r.type).label} · {fmtSize(r.fileSizeBytes)} · {r.downloadsCount} تحميل</span></span><form action={deleteResource}><input type="hidden" name="id" value={r.id} /><button type="submit" title="حذف الملف" className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 className="h-3.5 w-3.5" /></button></form></div>)}</div>
							<form action={deleteModule} className="mt-3 border-t pt-3"><input type="hidden" name="id" value={m.id} /><button type="submit" className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 hover:underline"><Trash2 className="h-3 w-3" />حذف الموديل وكل ملفاته</button></form>
						</div>
					</details>
				))}{!modules.length && <div className="rounded-xl border bg-card p-8 text-center text-xs text-muted-foreground">لا توجد موديلات بعد.</div>}</div>
			</section>
		</div>
	);
}

function Stat({ value, label }: { value: number; label: string }) { return <div><p className="text-base font-bold text-primary">{value.toLocaleString("ar-DZ")}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>; }
function SectionTitle({ icon, number, title, subtitle }: { icon: React.ReactNode; number: string; title: string; subtitle: string }) { return <div className="flex items-center gap-3 border-b bg-secondary/25 px-4 py-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">{number}</span><span className="text-primary">{icon}</span><div><h3 className="text-sm font-bold">{title}</h3><p className="text-[10px] text-muted-foreground">{subtitle}</p></div></div>; }
