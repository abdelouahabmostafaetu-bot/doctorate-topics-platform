import { CloudUpload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LectureUploadForm } from "@/components/admin/lecture-upload-form";

export const dynamic = "force-dynamic";

export default async function AdminLecturesPage() {
	const [universitiesRaw, specialtiesRaw, modules] = await Promise.all([
		prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
		prisma.lectureSpecialty.findMany({ orderBy: { name: "asc" } }),
		prisma.module.findMany({
			select: {
				id: true,
				name: true,
				universityId: true,
				level: true,
				semester: true,
				lectureSpecialtyId: true,
				resources: { select: { downloadsCount: true } },
			},
			orderBy: [{ level: "asc" }, { semester: "asc" }, { name: "asc" }],
		}),
	]);
	const totalFiles = modules.reduce((sum, item) => sum + item.resources.length, 0);
	const totalDownloads = modules.reduce(
		(sum, item) => sum + item.resources.reduce((count, resource) => count + resource.downloadsCount, 0),
		0,
	);
	const universities = universitiesRaw.map((item) => ({
		id: item.id,
		name: item.nameAr?.trim() || item.name,
	}));
	const specialties = specialtiesRaw.map((item) => ({
		id: item.id,
		name: item.name,
		universityId: item.universityId,
		level: item.level,
	}));
	const moduleOptions = modules.map((item) => ({
		id: item.id,
		name: item.name,
		universityId: item.universityId,
		level: item.level,
		lectureSpecialtyId: item.lectureSpecialtyId,
		label: `${item.name} · س${item.semester}`,
	}));

	return (
		<div className="mx-auto max-w-5xl space-y-6 py-1">
			<header className="flex flex-wrap items-center gap-3 border-b pb-4">
				<img src="/icon-512.png" alt="DocMath DZ" className="h-9 w-9 rounded-lg object-cover" />
				<div className="min-w-0 flex-1">
					<h2 className="text-base font-bold">مكتبة المحاضرات</h2>
					<p className="text-[11px] text-muted-foreground">رفع وتنظيم الملفات حسب الجامعة والمستوى والتخصص.</p>
				</div>
				<div className="flex items-center gap-4 text-[10px] text-muted-foreground">
					<MiniStat value={modules.length} label="موديل" />
					<MiniStat value={totalFiles} label="ملف" />
					<MiniStat value={totalDownloads} label="تحميل" />
				</div>
			</header>

			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<CloudUpload className="h-4 w-4 text-primary" />
					<h3 className="text-sm font-semibold">رفع الملفات</h3>
				</div>
				<LectureUploadForm universities={universities} specialties={specialties} modules={moduleOptions} />
			</section>
		</div>
	);
}

function MiniStat({ value, label }: { value: number; label: string }) {
	return <span className="whitespace-nowrap"><b className="text-xs text-primary">{value.toLocaleString("ar-DZ")}</b> {label}</span>;
}
