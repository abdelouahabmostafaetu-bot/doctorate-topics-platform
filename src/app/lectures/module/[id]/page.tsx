// صفحة الموديل — ملفات مضغوطة وبسيطة
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LECTURE_TYPES, levelByValue, fmtSize } from "@/lib/lectures";

export const dynamic = "force-dynamic";

export default async function ModulePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const [session, moduleData] = await Promise.all([
		auth(),
		prisma.module
			.findUnique({
				where: { id },
				include: {
					university: true,
					specialty: true,
					resources: { orderBy: { createdAt: "desc" } },
				},
			})
			.catch(() => null),
	]);
	if (!moduleData) notFound();
	const lvl = levelByValue(moduleData.level);
	const isMember = Boolean(session?.user?.id);
	const univTitle =
		moduleData.university.nameAr?.trim() || moduleData.university.name;
	const levelHref =
		"/lectures/" + moduleData.university.slug + "/" + (lvl?.key ?? "l1");

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<nav className="text-[11px] text-muted-foreground">
				<Link href="/lectures" className="hover:text-primary">
					المحاضرات
				</Link>
				<span className="mx-1">‹</span>
				<Link
					href={"/lectures/" + moduleData.university.slug}
					className="hover:text-primary"
				>
					{univTitle}
				</Link>
				<span className="mx-1">‹</span>
				<Link href={levelHref} className="hover:text-primary">
					{lvl?.label ?? moduleData.level}
				</Link>
				<span className="mx-1">‹</span>
				<span className="truncate">{moduleData.name}</span>
			</nav>

			<h1 className="mt-2 text-base font-bold">{moduleData.name}</h1>
			<p className="mt-0.5 text-[11px] text-muted-foreground">
				{lvl?.label ?? moduleData.level} · س{moduleData.semester}
				{moduleData.specialty
					? " · " + (moduleData.specialty.nameAr?.trim() || moduleData.specialty.name)
					: ""}
				{moduleData.coefficient ? " · معامل " + moduleData.coefficient : ""}
			</p>

			{!isMember && (
				<p className="mt-3 rounded border px-2.5 py-1.5 text-[11px] text-muted-foreground">
					التحميل للأعضاء فقط —{" "}
					<Link href="/signin" className="font-medium text-primary underline">
						سجّل دخولك
					</Link>
				</p>
			)}

			{moduleData.resources.length === 0 ? (
				<p className="mt-8 text-center text-xs text-muted-foreground">
					لا توجد ملفات بعد.
				</p>
			) : (
				LECTURE_TYPES.map((t) => {
					const list = moduleData.resources.filter((r) => r.type === t.value);
					if (list.length === 0) return null;
					return (
						<section key={t.value} className="mt-5">
							<h2 className="mb-2 text-[11px] font-semibold text-muted-foreground">
								{t.label} ({list.length})
							</h2>
							<div className="divide-y rounded-lg border bg-card">
								{list.map((r) => (
									<div
										key={r.id}
										className="flex items-center justify-between gap-2 px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">{r.title}</p>
											<p className="text-[10px] text-muted-foreground">
												{fmtSize(r.fileSizeBytes)} · {r.downloadsCount} تحميل
											</p>
										</div>
										{isMember ? (
											<a
												href={"/api/lectures/download/" + r.id}
												className="shrink-0 rounded border px-2.5 py-1 text-[11px] font-medium transition hover:border-primary hover:text-primary"
											>
												تحميل
											</a>
										) : (
											<Link
												href="/signin"
												className="shrink-0 rounded border px-2.5 py-1 text-[11px] text-muted-foreground"
											>
												دخول
											</Link>
										)}
									</div>
								))}
							</div>
						</section>
					);
				})
			)}
		</div>
	);
}
