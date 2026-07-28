import { redirect } from "next/navigation";
import { ShieldCheck, ShieldPlus, UserMinus, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_PERMS } from "@/lib/admin-perms";
import { AdminUserPicker } from "@/components/admin/admin-user-picker";
import { demoteAdmin, promoteToAdmin, updateAdminPerms } from "./actions";

export const dynamic = "force-dynamic";

function PermsChecklist({ defaults }: { defaults?: string[] }) {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-2">
			{ADMIN_PERMS.map((permission) => (
				<label key={permission.key} className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground has-[:checked]:font-medium has-[:checked]:text-foreground">
					<input type="checkbox" name="perms" value={permission.key} defaultChecked={defaults?.includes(permission.key)} className="h-3.5 w-3.5 rounded border-muted-foreground/40 accent-[hsl(var(--primary))]" />
					<span>{permission.icon}</span><span>{permission.label}</span>
				</label>
			))}
		</div>
	);
}

export default async function AdminAdminsPage() {
	const session = await auth();
	if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");

	const [admins, users] = await Promise.all([
		prisma.user.findMany({
			where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
			orderBy: [{ role: "desc" }, { name: "asc" }],
			select: { id: true, name: true, email: true, role: true, adminPerms: true },
		}),
		prisma.user.findMany({
			where: { role: "USER", blocked: false },
			orderBy: { name: "asc" },
			select: { id: true, name: true, email: true },
		}),
	]);

	return (
		<div className="mx-auto max-w-3xl py-2">
			<header className="flex items-start gap-3 border-b pb-4">
				<span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span>
				<div><h2 className="text-base font-bold">الأدمن والصلاحيات</h2><p className="mt-1 text-xs text-muted-foreground">إدارة المدراء وتحديد صلاحيات الوصول باختصار.</p></div>
			</header>

			<section className="py-5">
				<div className="mb-3 flex items-center justify-between gap-3">
					<h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-muted-foreground" />المدراء الحاليون</h3>
					<span className="text-xs text-muted-foreground">{admins.length}</span>
				</div>
				<div className="divide-y border-y">
					{admins.map((user) => (
						<div key={user.id} className="py-3">
							<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
								<span className="text-sm font-semibold">{user.name}</span>
								<span dir="ltr" className="text-[11px] text-muted-foreground">{user.email}</span>
								<span className={user.role === "SUPER_ADMIN" ? "text-[10px] font-semibold text-amber-600" : "text-[10px] font-semibold text-primary"}>{user.role === "SUPER_ADMIN" ? "مدير أعلى · كل الصلاحيات" : "أدمن"}</span>
							</div>
							{user.role === "ADMIN" && (
								<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
									<form action={updateAdminPerms} className="space-y-3">
										<input type="hidden" name="userId" value={user.id} />
										<PermsChecklist defaults={user.adminPerms} />
										<button type="submit" className="text-xs font-semibold text-primary hover:underline">حفظ الصلاحيات</button>
									</form>
									<form action={demoteAdmin}>
										<input type="hidden" name="userId" value={user.id} />
										<button type="submit" className="flex min-h-9 items-center gap-1.5 text-xs font-medium text-red-600 hover:underline"><UserMinus className="h-3.5 w-3.5" />إزالة الأدمن</button>
									</form>
								</div>
							)}
						</div>
					))}
				</div>
			</section>

			<section className="border-t py-5">
				<div className="mb-4">
					<h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldPlus className="h-4 w-4 text-primary" />إضافة أدمن</h3>
					<p className="mt-1 text-xs text-muted-foreground">اكتب الاسم أو البريد، أو افتح القائمة لاختيار أي مستخدم.</p>
				</div>
				{users.length > 0 ? (
					<form action={promoteToAdmin} className="space-y-4">
						<AdminUserPicker users={users} />
						<div><p className="mb-2 text-xs font-medium">الصلاحيات</p><PermsChecklist /></div>
						<button type="submit" className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"><ShieldPlus className="h-3.5 w-3.5" />إضافة كأدمن</button>
					</form>
				) : (
					<p className="text-xs text-muted-foreground">لا يوجد مستخدمون متاحون للترقية حاليًا.</p>
				)}
			</section>
		</div>
	);
}
