import { BookOpen, CloudUpload, FileText, FolderCog, PlusCircle, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LectureModuleForm } from "@/components/admin/lecture-module-form";
import { LectureUploadForm } from "@/components/admin/lecture-upload-form";
import { levelByValue, lectureType, fmtSize } from "@/lib/lectures";
import { deleteModule, deleteResource } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLecturesPage() {
	const [universitiesRaw, specialtiesRaw, modules] = await Promise.all([
		prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
		prisma.lectureSpecialty.findMany({ orderBy: { name: "asc" } }),
		prisma.module.findMany({ include: { university: true, lectureSpecialty: true, resources: { orderBy: { createdAt: "desc" } } }, orderBy: [{ level: "asc" }, { semester: "asc" }, { name: "asc" }] }),
	]);
	const totalFiles = modules.reduce((sum, item) => sum + item.resources.length, 0);
	const totalDownloads = modules.reduce((sum, item) => sum + item.resources.reduce((count, resource) => count + resource.downloadsCount, 0), 0);
	const universities = universitiesRaw.map((item) => ({ id: item.id, name: item.nameAr?.trim() || item.name }));
	const specialties = specialtiesRaw.map((item) => ({ id: item.id, name: item.name, universityId: item.universityId, level: item.level }));
	const moduleOptions = modules.map((item) => ({
		id: item.id,
		name: item.name,
		universityId: item.universityId,
		level: item.level,
		lectureSpecialtyId: item.lectureSpecialtyId,
		label: `${item.name} · س${item.semester}`,
	}));

	return (
		<div className="mx-auto max-w-5xl space-y-7 py-1">
			<header className="flex flex-wrap items-center gap-3 border-b pb-4">
				<img src="/icon-512.png" alt="DocMath DZ" className="h-9 w-9 rounded-lg object-cover" />
				<div className="min-w-0 flex-1">
					<h2 className="text-base font-bold">مكتبة المحاضرات</h2>
					<p className="text-[11px] text-muted-foreground">إضافة الموديلات والملفات حسب الجامعة والمستوى والتخصص.</p>
				</div>
				<div className="flex items-center gap-4 text-[10px] text-muted-foreground">
					<MiniStat value={modules.length} label="موديل" />
					<MiniStat value={totalFiles} label="ملف" />
					<MiniStat value={totalDownloads} label="تحميل" />
				</div>
			</header>

			<section className="space-y-3">
				<SectionHeading icon={<PlusCircle className="h-4 w-4" />} title="إضافة موديل" description="اختر الجامعة أولًا؛ ستظهر تخصصاتها وموديلاتها فقط." />
				<LectureModuleForm universities={universities} specialties={specialties} modules={moduleOptions} />
			</section>

			<section className="space-y-3 border-t pt-6">
				<SectionHeading icon={<CloudUpload className="h-4 w-4" />} title="رفع ملفات" description="اختر المسار ثم ارفع ملفًا واحدًا أو عدة ملفات مباشرة." />
				<LectureUploadForm universities={universities} specialties={specialties} modules={moduleOptions} />
			</section>

			<section className="border-t pt-6">
				<div className="mb-3 flex items-center justify-between gap-3">
					<SectionHeading icon={<FolderCog className="h-4 w-4" />} title="المحتوى المنشور" description="الملفات تظهر تلقائيًا للطلبة في صفحة المحاضرات." />
					<span className="text-[10px] text-muted-foreground">{modules.length} موديل</span>
				</div>
				<div className="divide-y border-y">
					{modules.map((module) => (
						<details key={module.id} className="group">
							<summary className="flex cursor-pointer list-none items-center gap-3 py-3 transition hover:text-primary">
								<BookOpen className="h-4 w-4 shrink-0 text-primary" />
								<span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{module.name}</span><span className="block truncate text-[10px] text-muted-foreground">{module.university.nameAr?.trim() || module.university.name} · {levelByValue(module.level)?.label ?? module.level} · س{module.semester}{module.lectureSpecialty ? ` · ${module.lectureSpecialty.name}` : ""}</span></span>
								<span className="text-[10px] text-muted-foreground">{module.resources.length} ملف</span>
							</summary>
							<div className="space-y-1 border-t py-2">
								{module.resources.map((resource) => (
									<div key={resource.id} className="flex items-center gap-2 py-1.5">
										<FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
										<span className="min-w-0 flex-1"><span className="block truncate text-xs">{resource.title}</span><span className="text-[10px] text-muted-foreground">{lectureType(resource.type).label} · {fmtSize(resource.fileSizeBytes)} · {resource.downloadsCount} تحميل</span></span>
										<form action={deleteResource}><input type="hidden" name="id" value={resource.id} /><button type="submit" title="حذف الملف" className="p-1.5 text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></form>
									</div>
								))}
								<form action={deleteModule} className="pt-2"><input type="hidden" name="id" value={module.id} /><button type="submit" className="flex items-center gap-1 text-[10px] font-medium text-red-600 hover:underline"><Trash2 className="h-3 w-3" />حذف الموديل وكل ملفاته</button></form>
							</div>
						</details>
					))}
					{modules.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">لا توجد موديلات بعد.</p>}
				</div>
			</section>
		</div>
	);
}

function MiniStat({ value, label }: { value: number; label: string }) {
	return <span className="whitespace-nowrap"><b className="text-xs text-primary">{value.toLocaleString("ar-DZ")}</b> {label}</span>;
}

function SectionHeading({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
	return <div className="flex items-start gap-2"><span className="mt-0.5 text-primary">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="text-[10px] text-muted-foreground">{description}</p></div></div>;
}
