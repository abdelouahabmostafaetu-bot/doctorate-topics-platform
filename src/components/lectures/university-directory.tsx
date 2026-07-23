"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, ChevronLeft, Search, X } from "lucide-react";

type UniversityItem = {
	id: string;
	slug: string;
	name: string;
	nameAr: string;
	city: string | null;
	modulesCount: number;
};

function normalize(value: string) {
	return value
		.toLocaleLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

export function UniversityDirectory({ items }: { items: UniversityItem[] }) {
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => {
		const q = normalize(query);
		if (!q) return items;
		return items.filter((u) =>
			normalize([u.nameAr, u.name, u.city ?? ""].join(" ")).includes(q),
		);
	}, [items, query]);

	return (
		<div className="mt-5">
			<div className="relative">
				<Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="ابحث باسم الجامعة أو المدينة..."
					aria-label="البحث عن جامعة"
					className="h-10 w-full rounded-xl border bg-card pr-10 pl-10 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
				/>
				{query && (
					<button
						type="button"
						onClick={() => setQuery("")}
						aria-label="مسح البحث"
						className="absolute left-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			<div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm">
				<div className="flex items-center justify-between border-b bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
					<span>{filtered.length} جامعة</span>
					<span>اختر للمتابعة</span>
				</div>
				<div className="divide-y">
					{filtered.map((u) => {
						const title = u.nameAr?.trim() || u.name;
						return (
							<Link
								key={u.id}
								href={"/lectures/" + u.slug}
								className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-primary/[0.045]"
							>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
									<Building2 className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold">{title}</span>
									{u.city && (
										<span className="block truncate text-[10px] text-muted-foreground">{u.city}</span>
									)}
								</span>
								<span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
									{u.modulesCount > 0 ? u.modulesCount + " موديل" : "قريبًا"}
								</span>
								<ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:-translate-x-0.5 group-hover:text-primary" />
							</Link>
						);
					})}
				</div>
				{filtered.length === 0 && (
					<div className="px-4 py-10 text-center">
						<Search className="mx-auto h-6 w-6 text-muted-foreground/40" />
						<p className="mt-2 text-xs text-muted-foreground">لا توجد جامعة مطابقة للبحث.</p>
					</div>
				)}
			</div>
		</div>
	);
}
