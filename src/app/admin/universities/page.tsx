// إدارة الجامعات — دمج جامعة في أخرى (نقل كل الامتحانات ثم حذف المصدر)
import { prisma } from "@/lib/prisma";
import { mergeUniversities } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUniversitiesPage() {
	const universities = await prisma.university.findMany({
		orderBy: { nameAr: "asc" },
		include: {
			_count: { select: { topics: true, modules: true } },
		},
	});

	return (
		<div className="space-y-6 py-4">
			<h2 className="text-lg font-bold">🏛️ إدارة الجامعات</h2>

			{/* دمج جامعة في أخرى */}
			<section className="rounded-xl border bg-card p-4">
				<h3 className="text-sm font-bold">🔀 دمج جامعة في أخرى</h3>
				<p className="mt-1 text-xs text-muted-foreground">
					ينقل <b>كل الامتحانات</b> والموديلات من الجامعة المصدر إلى
					الجامعة الهدف، ثم <b className="text-red-600">يحذف</b> الجامعة
					المصدر نهائيًا. مفيد لتنظيف الجامعات المكررة أو الخاطئة مثل
					«مصدر غير معروف».
				</p>

				<form action={mergeUniversities} className="mt-4 grid gap-3 sm:grid-cols-2">
					<label className="block text-xs">
						الجامعة المصدر (ستُحذف ⚠️)
						<select
							name="fromId"
							required
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						>
							<option value="">— اختر الجامعة التي ستُحذف —</option>
							{universities.map((u) => (
								<option key={u.id} value={u.id}>
									{(u.nameAr?.trim() || u.name) +
										" (" +
										u._count.topics +
										" امتحان)"}
								</option>
							))}
						</select>
					</label>

					<label className="block text-xs">
						الجامعة الهدف (ستستقبل كل الامتحانات ✅)
						<select
							name="toId"
							required
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						>
							<option value="">— اختر الجامعة الهدف —</option>
							{universities.map((u) => (
								<option key={u.id} value={u.id}>
									{(u.nameAr?.trim() || u.name) +
										" (" +
										u._count.topics +
										" امتحان)"}
								</option>
							))}
						</select>
					</label>

					<label className="flex items-center gap-2 text-xs sm:col-span-2">
						<input type="checkbox" name="confirm" required className="h-4 w-4" />
						أؤكد أنني أفهم أن الجامعة المصدر ستُحذف نهائيًا بعد نقل
						امتحاناتها — لا يمكن التراجع.
					</label>

					<div className="sm:col-span-2">
						<button
							type="submit"
							className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-700"
						>
							🔀 نقل كل الامتحانات وحذف الجامعة المصدر
						</button>
					</div>
				</form>
			</section>

			{/* قائمة الجامعات */}
			<section className="rounded-xl border bg-card">
				<h3 className="border-b px-4 py-3 text-sm font-bold">
					الجامعات ({universities.length})
				</h3>
				<div className="divide-y">
					{universities.map((u) => (
						<div
							key={u.id}
							className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
						>
							<span className="min-w-0 truncate">
								{u.nameAr?.trim() || u.name}
							</span>
							<span className="shrink-0 text-[11px] text-muted-foreground">
								🎯 {u._count.topics} امتحان · 📚 {u._count.modules} موديل
							</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
