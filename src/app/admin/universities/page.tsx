import { AlertTriangle, ArrowLeftRight, BookOpen, Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { mergeUniversities } from "./actions";

export const dynamic = "force-dynamic";
const selectClass = "mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

export default async function AdminUniversitiesPage() {
	const universities = await prisma.university.findMany({ orderBy: { nameAr: "asc" }, include: { _count: { select: { topics: true, modules: true } } } });
	const totalTopics = universities.reduce((sum, u) => sum + u._count.topics, 0);
	const totalModules = universities.reduce((sum, u) => sum + u._count.modules, 0);

	return (
		<div className="space-y-5 py-3">
			<header className="rounded-2xl border bg-gradient-to-l from-primary/[0.12] via-card to-card p-5 shadow-sm">
				<div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></span><div><h2 className="text-lg font-bold">إدارة الجامعات</h2><p className="mt-0.5 text-xs text-muted-foreground">وحّد الجامعات المكررة لتحافظ على بحث واضح ودقيق للطلبة.</p></div></div>
				<div className="mt-4 grid grid-cols-3 gap-2 border-t border-primary/10 pt-3 text-center"><Stat value={universities.length} label="جامعة" /><Stat value={totalTopics} label="امتحان" /><Stat value={totalModules} label="موديل" /></div>
			</header>

			<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
				<div className="flex items-start gap-3 border-b bg-amber-50/70 px-4 py-3 dark:bg-amber-950/20"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600"><ArrowLeftRight className="h-4 w-4" /></span><div><h3 className="text-sm font-bold">دمج جامعة مكررة أو خاطئة</h3><p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">سننقل كل الامتحانات والموديلات إلى الجامعة الصحيحة، ثم نحذف الجامعة المصدر.</p></div></div>
				<form action={mergeUniversities} className="p-4">
					<div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
						<label className="block text-xs font-medium">1. الجامعة المصدر <span className="text-red-600">(ستُحذف)</span><select name="fromId" required className={selectClass}><option value="">اختر الجامعة الخاطئة</option>{universities.map((u) => <option key={u.id} value={u.id}>{u.nameAr?.trim() || u.name} — {u._count.topics} امتحان</option>)}</select></label>
						<span className="hidden h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground sm:flex"><ArrowLeftRight className="h-4 w-4" /></span>
						<label className="block text-xs font-medium">2. الجامعة الهدف <span className="text-emerald-600">(ستبقى)</span><select name="toId" required className={selectClass}><option value="">اختر الجامعة الصحيحة</option>{universities.map((u) => <option key={u.id} value={u.id}>{u.nameAr?.trim() || u.name} — {u._count.topics} امتحان</option>)}</select></label>
					</div>
					<div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/60 dark:bg-red-950/20">
						<label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-5"><input type="checkbox" name="confirm" required className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" /><span><b>تأكيد إلزامي:</b> أفهم أن الجامعة المصدر ستُحذف نهائيًا بعد نقل محتواها، ولا يمكن التراجع عن العملية.</span></label>
					</div>
					<div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"><AlertTriangle className="h-4 w-4" />نقل المحتوى وحذف المصدر</button><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />لا تُحذف ملفات الامتحانات أو المحاضرات</span></div>
				</form>
			</section>

			<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
				<div className="flex items-center justify-between border-b bg-secondary/25 px-4 py-3"><div><h3 className="text-sm font-bold">دليل الجامعات</h3><p className="text-[10px] text-muted-foreground">راجع عدد الامتحانات والموديلات قبل الدمج.</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">{universities.length} جامعة</span></div>
				<div className="divide-y">{universities.map((u) => <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-secondary/25"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{u.nameAr?.trim() || u.name}</span>{u.city && <span className="block text-[10px] text-muted-foreground">{u.city}</span>}</span><span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex"><BookOpen className="h-3 w-3" />{u._count.topics} امتحان</span><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><GraduationCap className="h-3 w-3" />{u._count.modules} موديل</span></div>)}</div>
			</section>
		</div>
	);
}

function Stat({ value, label }: { value: number; label: string }) { return <div><p className="text-base font-bold text-primary">{value.toLocaleString("ar-DZ")}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>; }
