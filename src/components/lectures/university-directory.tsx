import Link from "next/link";
import { Building2, ChevronLeft } from "lucide-react";

type UniversityItem = {
	id: string;
	slug: string;
	name: string;
	nameAr: string;
	city: string | null;
	logoUrl: string | null;
	modulesCount: number;
};

export function UniversityDirectory({ items }: { items: UniversityItem[] }) {
	return (
		<div className="mt-3 overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
			<div className="flex items-center justify-between border-b border-primary/10 bg-gradient-to-l from-primary/[0.07] to-amber-500/[0.035] px-3 py-1.5 text-[10px] text-muted-foreground">
				<span>{items.length} جامعة</span>
				<span>اختر جامعتك</span>
			</div>
			<div className="divide-y divide-primary/[0.08]">
				{items.map((u, index) => {
					const title = u.nameAr?.trim() || u.name;
					const colors = [
						"bg-blue-500/10 text-blue-600 dark:text-blue-400",
						"bg-amber-500/10 text-amber-600 dark:text-amber-400",
						"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
						"bg-violet-500/10 text-violet-600 dark:text-violet-400",
					];
					return (
						<Link
							key={u.id}
							href={"/lectures/" + u.slug}
							className="group flex items-center gap-2.5 border-r-2 border-r-transparent px-3 py-2 transition hover:border-r-primary hover:bg-primary/[0.035]"
						>
							{u.logoUrl ? (
								<span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/10 bg-white">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={u.logoUrl} alt={title} loading="lazy" className="h-full w-full object-contain p-0.5" />
								</span>
							) : (
								<span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colors[index % colors.length]}`}>
									<Building2 className="h-3.5 w-3.5" />
								</span>
							)}
							<span className="min-w-0 flex-1">
								<span className="block truncate text-[13px] font-bold leading-5">{title}</span>
								{u.city && <span className="block truncate text-[9px] text-muted-foreground">{u.city}</span>}
							</span>
							<span className="shrink-0 rounded-full border border-primary/10 bg-primary/[0.045] px-1.5 py-0.5 text-[9px] text-muted-foreground">
								{u.modulesCount > 0 ? u.modulesCount + " موديل" : "قريبًا"}
							</span>
							<ChevronLeft className="h-3.5 w-3.5 shrink-0 text-primary/40 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
						</Link>
					);
				})}
			</div>
			{items.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted-foreground">لا توجد جامعات بعد.</p>}
		</div>
	);
}
