import { redirect } from "next/navigation";
import { Download, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMyAdminPerms } from "@/lib/admin-perms";
import { fmtSize, levelByValue } from "@/lib/lectures";
import { approveLectureContribution, rejectLectureContribution } from "./actions";

export const dynamic = "force-dynamic";
const fieldClass = "mt-1 h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

const TYPE_OPTIONS = [
	{ value: "cours", label: "📖 محاضرة" },
	{ value: "td", label: "✏️ سلسلة TD" },
	{ value: "tp", label: "💻 أعمال تطبيقية TP" },
	{ value: "resume", label: "📝 ملخص" },
	{ value: "book", label: "📚 كتاب" },
	{ value: "exam", label: "📄 امتحان" },
	{ value: "other", label: "📁 أخرى" },
];

export default async function AdminLectureContributionsPage() {
	const { perms } = await getMyAdminPerms();
	if (!perms.includes("contributions")) redirect("/admin");

	const [pending, handled, modules] = await Promise.all([
		prisma.lectureContribution.findMany({
			where: { status: "pending" },
			include: { user: { select: { name: true, email: true, points: true } } },
			orderBy: { createdAt: "asc" },
		}),
		prisma.lectureContribution.findMany({
			where: { status: { not: "pending" } },
			include: { user: { select: { name: true } } },
			orderBy: { updatedAt: "desc" },
			take: 15,
		}),
		prisma.module.findMany({
			include: { university: true, lectureSpecialty: true },
			orderBy: [{ level: "asc" }, { semester: "asc" }, { name: "asc" }],
		}),
	]);
	const moduleOptions = modules.map((m) => ({
		id: m.id,
		label: `${m.university.nameAr?.trim() || m.university.name} · ${levelByValue(m.level)?.label ?? m.level} · س${m.semester}${m.lectureSpecialty ? ` · ${m.lectureSpecialty.name}` : ""} · ${m.name}`,
	}));

	return (
		<div className="space-y-5 py-3">
			<header className="rounded-2xl border bg-gradient-to-l from-primary/[0.12] via-card to-card p-5 shadow-sm">
				<div className="flex flex-wrap items-center gap-3">
					<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Inbox className="h-5 w-5" /></span>
					<div>
						<h2 className="text-lg font-bold">📥 مساهمات الدروس</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">افرز ملفات الطلبة، امنح النقاط، وانشرها كدروس في المكتبة بضغطة واحدة.</p>
					</div>
					<span className="mr-auto rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600">{pending.length} قيد المراجعة</span>
				</div>
			</header>

			{pending.length === 0 && (
				<p className="rounded-xl border border-dashed bg-card p-6 text-center text-xs text-muted-foreground">لا توجد مساهمات جديدة حاليًا 🌱</p>
			)}

			<section className="space-y-3">
				{pending.map((c) => (
					<div key={c.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
						<div className="flex flex-wrap items-center gap-2 border-b bg-secondary/20 px-4 py-2.5">
							<span className="text-xs font-bold">{c.user.name}</span>
							<span dir="ltr" className="text-[10px] text-muted-foreground">{c.user.email}</span>
							<span className="text-[10px] text-muted-foreground">⭐ {c.user.points} نقطة</span>
							<span className="mr-auto text-[10px] text-muted-foreground">{c.createdAt.toLocaleDateString("ar-DZ")}</span>
						</div>
						<div className="space-y-3 p-4">
							<div className="flex flex-wrap items-center gap-2">
								<a href={c.fileUrl} download className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"><Download className="h-3.5 w-3.5" /><span dir="ltr" className="max-w-[220px] truncate">{c.fileName}</span><span>({fmtSize(c.fileSizeBytes)})</span></a>
								{c.universityName && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">🏛️ {c.universityName}</span>}
								{c.levelText && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">🎓 {c.levelText}</span>}
							</div>
							{c.note && <p className="rounded-lg bg-secondary/30 p-2.5 text-[11px] leading-6 text-muted-foreground">{c.note}</p>}

							<form action={approveLectureContribution} className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-500/[0.04] p-3 dark:border-emerald-900 sm:grid-cols-2">
								<input type="hidden" name="id" value={c.id} />
								<label className="text-[11px] font-medium">النقاط الممنوحة ⭐<input name="points" type="number" min={0} max={1000} defaultValue={10} className={fieldClass} /></label>
								<label className="text-[11px] font-medium">نوع المحتوى<select name="type" className={fieldClass}>{TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
								<label className="text-[11px] font-medium">نشر مباشرة في موديل (اختياري)<select name="moduleId" className={fieldClass}><option value="">بدون نشر مباشر</option>{moduleOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
								<label className="text-[11px] font-medium">عنوان الدرس عند النشر (اختياري)<input name="title" maxLength={150} placeholder="يُستخدم اسم الملف إذا تُرك فارغًا" className={fieldClass} /></label>
								<div className="sm:col-span-2"><button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90">✅ قبول ومنح النقاط</button></div>
							</form>

							<form action={rejectLectureContribution} className="flex flex-wrap items-end gap-2">
								<input type="hidden" name="id" value={c.id} />
								<label className="min-w-0 flex-1 text-[11px] font-medium">سبب الرفض (اختياري)<input name="adminNote" maxLength={300} placeholder="مثال: ملف مكرر أو غير واضح" className={fieldClass} /></label>
								<button type="submit" className="rounded-lg border border-red-200 bg-red-500/10 px-4 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-500/20 dark:border-red-900">❌ رفض</button>
							</form>
						</div>
					</div>
				))}
			</section>

			{handled.length > 0 && (
				<section>
					<h3 className="mb-2 text-xs font-bold text-muted-foreground">آخر المساهمات المعالجة</h3>
					<div className="overflow-hidden rounded-xl border bg-card"><div className="divide-y">
						{handled.map((c) => (
							<div key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
								<span dir="ltr" className="min-w-0 flex-1 truncate text-[11px]">{c.fileName}</span>
								<span className="text-[10px] text-muted-foreground">{c.user.name}</span>
								{c.status === "accepted" ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">✅ مقبولة{c.pointsAwarded ? ` +${c.pointsAwarded}⭐` : ""}</span> : <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600">❌ مرفوضة</span>}
							</div>
						))}
					</div></div>
				</section>
			)}
		</div>
	);
}
