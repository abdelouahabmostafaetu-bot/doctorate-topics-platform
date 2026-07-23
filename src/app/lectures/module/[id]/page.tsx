import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, Download, FileArchive, FileText, LockKeyhole } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LECTURE_TYPES, levelByValue, fmtSize } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const [session, moduleData] = await Promise.all([
		auth(),
		prisma.module.findUnique({
			where: { id },
			include: { university: true, specialty: true, resources: { orderBy: { createdAt: "desc" } } },
		}).catch(() => null),
	]);
	if (!moduleData) notFound();
	const lvl = levelByValue(moduleData.level);
	const isMember = Boolean(session?.user?.id);
	const univTitle = moduleData.university.nameAr?.trim() || moduleData.university.name;
	const levelHref = `/lectures/${moduleData.university.slug}/${lvl?.key ?? "l1"}`;

	return (
		<main className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
			<nav className="mb-3 flex items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground">
				<Link href="/lectures" className="shrink-0 hover:text-primary">المحاضرات</Link><ChevronLeft className="h-3 w-3 shrink-0" />
				<Link href={`/lectures/${moduleData.university.slug}`} className="max-w-[125px] truncate hover:text-primary">{univTitle}</Link><ChevronLeft className="h-3 w-3 shrink-0" />
				<Link href={levelHref} className="shrink-0 hover:text-primary">{lvl?.label ?? moduleData.level}</Link><ChevronLeft className="h-3 w-3 shrink-0" />
				<span className="truncate">{moduleData.name}</span>
			</nav>

			<section className="rounded-2xl border bg-gradient-to-l from-primary/[0.11] via-card to-card p-5 shadow-sm">
				<div className="flex items-start gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><BookOpen className="h-5 w-5" /></span>
					<div className="min-w-0"><h1 className="text-lg font-bold">{moduleData.name}</h1><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{univTitle} · {lvl?.label ?? moduleData.level} · السداسي {moduleData.semester}{moduleData.specialty ? ` · ${moduleData.specialty.nameAr?.trim() || moduleData.specialty.name}` : ""}{moduleData.coefficient ? ` · معامل ${moduleData.coefficient}` : ""}</p></div>
				</div>
			</section>

			{!isMember && (
				<div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.045] px-3 py-2.5 text-[11px] text-muted-foreground">
					<LockKeyhole className="h-4 w-4 shrink-0 text-primary" /><span>التحميل متاح للأعضاء مجانًا. <Link href="/signin" className="font-bold text-primary hover:underline">سجّل دخولك</Link> للمتابعة.</span>
				</div>
			)}

			{moduleData.resources.length === 0 ? (
				<div className="mt-4 rounded-xl border bg-card px-4 py-12 text-center"><FileArchive className="mx-auto h-7 w-7 text-muted-foreground/35" /><p className="mt-2 text-xs text-muted-foreground">لم تُضف ملفات لهذا الموديل بعد.</p><p className="mt-1 text-[10px] text-muted-foreground/70">نضيف المحتوى تدريجيًا لخدمة جميع الطلبة.</p></div>
			) : LECTURE_TYPES.map((type) => {
				const list = moduleData.resources.filter((resource) => resource.type === type.value);
				if (!list.length) return null;
				return (
					<section key={type.value} className="mt-5">
						<div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-bold">{type.label}</h2><span className="text-[10px] text-muted-foreground">{list.length} ملف</span></div>
						<div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="divide-y">{list.map((resource) => (
							<div key={resource.id} className="flex items-center gap-3 px-3 py-3">
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><FileText className="h-4 w-4" /></span>
								<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{resource.title}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{fmtSize(resource.fileSizeBytes)} · {resource.downloadsCount} تحميل · {new Date(resource.createdAt).toLocaleDateString("ar-DZ")}</p></div>
								{isMember ? <a href={`/api/lectures/download/${resource.id}`} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"><Download className="h-3.5 w-3.5" />تحميل</a> : <Link href="/signin" className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary"><LockKeyhole className="h-3 w-3" />دخول</Link>}
							</div>
						))}</div></div>
					</section>
				);
			})}
		</main>
	);
}
