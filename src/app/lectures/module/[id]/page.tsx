import Link from "next/link";
import { notFound } from "next/navigation";
import {
	BookOpen,
	ChevronLeft,
	FileArchive,
	LockKeyhole,
	Package,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { levelByValue, fmtSize } from "@/lib/lectures";
import { ModuleFilesTree } from "@/components/lectures/module-files-tree";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const [session, moduleData] = await Promise.all([
		auth(),
		prisma.module.findUnique({
			where: { id },
			include: {
				university: true,
				specialty: true,
				lectureSpecialty: true,
				resources: {
					orderBy: [{ folderPath: "asc" }, { title: "asc" }, { createdAt: "desc" }],
				},
			},
		}).catch(() => null),
	]);
	if (!moduleData) notFound();
	const lvl = levelByValue(moduleData.level);
	const isMember = Boolean(session?.user?.id);
	const univTitle = moduleData.university.nameAr?.trim() || moduleData.university.name;
	const levelHref = `/lectures/${moduleData.university.slug}/${lvl?.key ?? "l1"}`;
	const specName =
		moduleData.lectureSpecialty?.name ||
		moduleData.specialty?.nameAr?.trim() ||
		moduleData.specialty?.name ||
		"";

	const files = moduleData.resources.map((r) => ({
		id: r.id,
		title: r.title,
		folderPath: (r as { folderPath?: string }).folderPath || "",
		fileSizeBytes: r.fileSizeBytes,
		downloadsCount: r.downloadsCount,
		createdAt: r.createdAt,
	}));

	const totalBytes = moduleData.resources.reduce(
		(sum, item) => sum + (item.fileSizeBytes || 0),
		0,
	);
	const zipTooBig = totalBytes > 500 * 1024 * 1024;

	return (
		<main
			className="mx-auto max-w-3xl px-4 py-5 sm:py-6"
			style={{ fontFamily: "var(--font-article), Amiri, Georgia, serif" }}
		>
			<nav className="mb-3 flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground">
				<Link href="/lectures" className="shrink-0 hover:text-primary">
					المحاضرات
				</Link>
				<ChevronLeft className="h-3 w-3 shrink-0" />
				<Link
					href={`/lectures/${moduleData.university.slug}`}
					className="max-w-[125px] truncate hover:text-primary"
				>
					{univTitle}
				</Link>
				<ChevronLeft className="h-3 w-3 shrink-0" />
				<Link href={levelHref} className="shrink-0 hover:text-primary">
					{lvl?.label ?? moduleData.level}
				</Link>
				<ChevronLeft className="h-3 w-3 shrink-0" />
				<span className="truncate">{moduleData.name}</span>
			</nav>

			<section className="rounded-xl border border-primary/15 bg-gradient-to-l from-blue-500/[0.09] via-card to-amber-500/[0.045] p-3.5 shadow-[0_3px_16px_hsl(var(--primary)/0.045)]">
				<div className="flex items-start gap-3">
					<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
						<BookOpen className="h-3.5 w-3.5" />
					</span>
					<div className="min-w-0 flex-1">
						<h1 className="text-base font-bold">{moduleData.name}</h1>
						<p className="mt-1 text-[11px] leading-5 text-muted-foreground">
							{univTitle} · {lvl?.label ?? moduleData.level}
							{specName ? ` · ${specName}` : ""}
							{moduleData.coefficient ? ` · معامل ${moduleData.coefficient}` : ""}
							{` · ${moduleData.resources.length} ملف`}
							{totalBytes > 0 ? ` · ${fmtSize(totalBytes)}` : ""}
						</p>
					</div>
					{isMember && moduleData.resources.length > 1 && !zipTooBig && (
						<a
							href={`/api/lectures/module/${moduleData.id}/zip`}
							className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground transition hover:opacity-90"
							title="تحميل جميع ملفات الموديل في أرشيف واحد"
						>
							<Package className="h-3.5 w-3.5" />
							تحميل الكل ZIP
						</a>
					)}
				</div>
				{isMember && zipTooBig && moduleData.resources.length > 1 && (
					<p className="mt-2 text-[10px] text-muted-foreground">
						حجم الملفات يتجاوز 500 م.ب — حمّلها ملفاً ملفاً.
					</p>
				)}
			</section>

			{!isMember && (
				<div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.045] px-3 py-2.5 text-[11px] text-muted-foreground">
					<LockKeyhole className="h-4 w-4 shrink-0 text-primary" />
					<span>
						التحميل متاح للأعضاء مجانًا.{" "}
						<Link href="/signin" className="font-bold text-primary hover:underline">
							سجّل دخولك
						</Link>{" "}
						للمتابعة.
					</span>
				</div>
			)}

			{moduleData.resources.length === 0 ? (
				<div className="mt-4 rounded-xl border bg-card px-4 py-12 text-center">
					<FileArchive className="mx-auto h-7 w-7 text-muted-foreground/35" />
					<p className="mt-2 text-xs text-muted-foreground">لم تُضف ملفات لهذا الموديل بعد.</p>
					<p className="mt-1 text-[10px] text-muted-foreground/70">
						نضيف المحتوى تدريجيًا لخدمة جميع الطلبة.
					</p>
				</div>
			) : (
				<section className="mt-5">
					<ModuleFilesTree files={files} isMember={isMember} />
				</section>
			)}
		</main>
	);
}
