"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

type UserOption = {
	id: string;
	name: string;
	email: string;
};

export function AdminUserPicker({ users }: { users: UserOption[] }) {
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState("");
	const [open, setOpen] = useState(false);

	const filteredUsers = useMemo(() => {
		const value = query.trim().toLowerCase();
		if (!value) return users;
		return users.filter(
			(user) =>
				user.name.toLowerCase().includes(value) ||
				user.email.toLowerCase().includes(value),
		);
	}, [query, users]);

	function selectUser(user: UserOption) {
		setSelectedId(user.id);
		setQuery(`${user.name} — ${user.email}`);
		setOpen(false);
	}

	return (
		<div className="relative">
			<input type="hidden" name="userId" value={selectedId} />
			<label htmlFor="admin-user-search" className="mb-1.5 block text-xs font-medium">
				المستخدم
			</label>
			<div className="relative">
				<Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					id="admin-user-search"
					type="search"
					required
					autoComplete="off"
					value={query}
					onFocus={() => setOpen(true)}
					onBlur={() => setTimeout(() => setOpen(false), 150)}
					onChange={(event) => {
						setQuery(event.target.value);
						setSelectedId("");
						setOpen(true);
					}}
					placeholder="اكتب اسم المستخدم أو البريد..."
					className="h-10 w-full rounded-lg border bg-background pr-9 pl-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
				/>
			</div>

			{open && (
				<div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-background shadow-lg">
					{filteredUsers.length > 0 ? (
						filteredUsers.map((user) => (
							<button
								key={user.id}
								type="button"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => selectUser(user)}
								className="flex w-full items-center gap-3 border-b px-3 py-2 text-right transition last:border-0 hover:bg-secondary/50"
							>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-xs font-semibold">{user.name}</span>
									<span dir="ltr" className="block truncate text-[10px] text-muted-foreground">{user.email}</span>
								</span>
								{selectedId === user.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
							</button>
						))
					) : (
						<p className="px-3 py-4 text-center text-xs text-muted-foreground">لا يوجد مستخدم مطابق.</p>
					)}
				</div>
			)}

			{query && !selectedId && (
				<p className="mt-1 text-[10px] text-amber-600">اختر مستخدمًا من النتائج قبل الإضافة.</p>
			)}
		</div>
	);
}
