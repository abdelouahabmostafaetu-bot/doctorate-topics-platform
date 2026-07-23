import { redirect } from "next/navigation";
import { Search, ShieldCheck, ShieldPlus, UserMinus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_PERMS } from "@/lib/admin-perms";
import { demoteAdmin, promoteToAdmin, updateAdminPerms } from "./actions";

export const dynamic = "force-dynamic";

function PermsChecklist({ defaults }: { defaults?: string[] }) {
	return (
		<div className="flex flex-wrap gap-2">
			{ADMIN_PERMS.map((p) => (
				<label
					key={p.key}
					className="flex cursor-pointer items-center gap-1.5 rounded-full border border-primary/15 bg-secondary/30 px-2.5 py-1 text-[11px] transition hover:border-primary/40 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
				>
					<input
						type="checkbox"
						name="perms"
						value={p.key}
						defaultChecked={defaults?.includes(p.key)}
						className="h-3 w-3 accent-[hsl(var(--primary))]"
					/>
					{p.icon} {p.label}
				</label>
			))}
		</div>
	);
}

export default async function AdminAdminsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string }>;
}) {
	const session = await auth();
	if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");
	const { q } = await searchParams;
	const query = (q || "").trim();

	const admins = await prisma.user.findMany({
		where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
		orderBy: { createdAt: "asc" },
		select: { id: true, name: true, email: true, role: true, adminPerms: true },
	});
	const results = query
		? await prisma.user.findMany({
				where: {
					role: "USER",
					blocked: false,
					OR: [
						{ email: { contains: query, mode: "insensitive" } },
						{ name: { contains: query, mode: "insensitive" } },
					],
				},
				take: 10,
				select: { id: true, name: true, email: true },
			})
		: [];

	return (
		<div className="space-y-5 py-3">
			<header className="rounded-2xl border bg-gradient-to-l from-primary/[0.12] via-card to-card p-5 shadow-sm">
				<div className="flex items-center gap-3">
					<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>
					<div>
						<h2 className="text-lg font-bold">الأدمن والصلاحيات</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">رقِّ الأعضاء إلى أدمن وحدد لكل واحد الميزات التي يستطيع الوصول إليها.</p>
					</div>
				</div>
			</header>

			{/* الأدمن الحاليون */}
			<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
				<div className="border-b bg-secondary/25 px-4 py-3"><h3 className="text-sm font-bold">🛡️ الأدمن الحاليون ({admins.length})</h3></div>
				<div className="divide-y">
					{admins.map((u) => (
						<div key={u.id} className="p-4">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-sm font-semibold">{u.name}</span>
								<span dir="ltr" className="text-[11px] text-muted-foreground">{u.email}</span>
								{u.role === "SUPER_ADMIN" ? (
									<span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">👑 مدير أعلى — كل الصلاحيات</span>
								) : (
									<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">🛡️ أدمين</span>
								)}
							</div>
							{u.role === "ADMIN" && (
								<div className="mt-3 flex flex-wrap items-end justify-between gap-3">
									<form action={updateAdminPerms} className="space-y-2">
										<input type="hidden" name="userId" value={u.id} />
										<PermsChecklist defaults={u.adminPerms} />
										<button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90">حفظ الصلاحيات</button>
									</form>
									<form action={demoteAdmin}>
										<input type="hidden" name="userId" value={u.id} />
										<button type="submit" className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"><UserMinus className="h-3 w-3" />إزالة الأدمين</button>
									</form>
								</div>
							)}
						</div>
					))}
				</div>
			</section>

			{/* البحث عن عضو وترقيته */}
			<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
				<div className="border-b bg-secondary/25 px-4 py-3">
					<h3 className="flex items-center gap-2 text-sm font-bold"><ShieldPlus className="h-4 w-4 text-primary" />إضافة أدمين جديد</h3>
					<p className="mt-0.5 text-[11px] text-muted-foreground">ابحث عن العضو بالبريد أو الاسم، اختر صلاحياته ثم رقِّه.</p>
				</div>
				<div className="p-4">
					<form method="GET" className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<input name="q" defaultValue={query} placeholder="البريد الإلكتروني أو الاسم..." className="h-10 w-full rounded-lg border bg-background pr-9 pl-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
						</div>
						<button type="submit" className="rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90">بحث</button>
					</form>

					{query && (
						<div className="mt-4 space-y-3">
							{results.length ? results.map((u) => (
								<form key={u.id} action={promoteToAdmin} className="rounded-xl border bg-secondary/15 p-3">
									<input type="hidden" name="userId" value={u.id} />
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-sm font-semibold">{u.name}</span>
										<span dir="ltr" className="text-[11px] text-muted-foreground">{u.email}</span>
									</div>
									<div className="mt-2.5"><PermsChecklist /></div>
									<button type="submit" className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90"><ShieldPlus className="h-3 w-3" />ترقية إلى أدمين بالصلاحيات المحددة</button>
								</form>
							)) : <p className="rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">لا توجد نتائج مطابقة لـ «{query}».</p>}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
