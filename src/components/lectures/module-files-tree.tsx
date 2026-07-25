import Link from "next/link";
import { ChevronDown, Download, FileText, Folder, LockKeyhole } from "lucide-react";
import { fmtSize } from "@/lib/lectures";

export type ModuleFileItem = {
	id: string;
	title: string;
	folderPath: string;
	fileSizeBytes: number;
	downloadsCount: number;
	createdAt: Date | string;
};

type FolderNode = {
	name: string;
	path: string;
	files: ModuleFileItem[];
	children: Map<string, FolderNode>;
};

function buildTree(files: ModuleFileItem[]): FolderNode {
	const root: FolderNode = {
		name: "",
		path: "",
		files: [],
		children: new Map(),
	};

	for (const file of files) {
		const raw = String(file.folderPath || "")
			.replace(/\\/g, "/")
			.replace(/^\/+|\/+$/g, "");
		if (!raw) {
			root.files.push(file);
			continue;
		}
		const parts = raw.split("/").filter(Boolean);
		let node = root;
		let acc = "";
		for (const part of parts) {
			acc = acc ? `${acc}/${part}` : part;
			if (!node.children.has(part)) {
				node.children.set(part, {
					name: part,
					path: acc,
					files: [],
					children: new Map(),
				});
			}
			node = node.children.get(part)!;
		}
		node.files.push(file);
	}

	return root;
}

function sortFiles(a: ModuleFileItem, b: ModuleFileItem) {
	return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
}

function FileRow({
	file,
	isMember,
}: {
	file: ModuleFileItem;
	isMember: boolean;
}) {
	const date =
		typeof file.createdAt === "string"
			? new Date(file.createdAt)
			: file.createdAt;
	return (
		<div className="flex items-center gap-3 px-3 py-3">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
				<FileText className="h-3.5 w-3.5" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold">{file.title}</p>
				<p className="mt-0.5 text-[10px] text-muted-foreground">
					{fmtSize(file.fileSizeBytes)} · {file.downloadsCount} تحميل ·{" "}
					{date.toLocaleDateString("ar-DZ")}
				</p>
			</div>
			{isMember ? (
				<a
					href={`/api/lectures/download/${file.id}`}
					className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"
				>
					<Download className="h-3.5 w-3.5" />
					تحميل
				</a>
			) : (
				<Link
					href="/signin"
					className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
				>
					<LockKeyhole className="h-3 w-3" />
					دخول
				</Link>
			)}
		</div>
	);
}

function FolderBlock({
	node,
	isMember,
	depth = 0,
}: {
	node: FolderNode;
	isMember: boolean;
	depth?: number;
}) {
	const childFolders = [...node.children.values()].sort((a, b) =>
		a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
	);
	const files = [...node.files].sort(sortFiles);
	const count =
		files.length +
		childFolders.reduce((n, c) => n + countFiles(c), 0);

	// الجذر: بلا غلاف folder
	if (!node.name) {
		return (
			<div className="space-y-3">
				{files.length > 0 && (
					<div className="overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]">
						<div className="divide-y divide-primary/[0.08]">
							{files.map((f) => (
								<FileRow key={f.id} file={f} isMember={isMember} />
							))}
						</div>
					</div>
				)}
				{childFolders.map((child) => (
					<FolderBlock
						key={child.path}
						node={child}
						isMember={isMember}
						depth={0}
					/>
				))}
			</div>
		);
	}

	return (
		<details
			open
			className="group overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_2px_12px_hsl(var(--primary)/0.04)]"
			style={{ marginInlineStart: depth > 0 ? Math.min(depth, 3) * 10 : 0 }}
		>
			<summary className="flex cursor-pointer list-none items-center gap-2 border-b border-primary/10 bg-secondary/25 px-3 py-2.5">
				<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
					<Folder className="h-3.5 w-3.5" />
				</span>
				<span className="min-w-0 flex-1 truncate text-sm font-semibold">{node.name}</span>
				<span className="text-[10px] text-muted-foreground">{count} ملف</span>
				<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
			</summary>
			<div className="divide-y divide-primary/[0.08]">
				{files.map((f) => (
					<FileRow key={f.id} file={f} isMember={isMember} />
				))}
			</div>
			{childFolders.length > 0 && (
				<div className="space-y-2 border-t border-primary/10 bg-secondary/10 p-2">
					{childFolders.map((child) => (
						<FolderBlock
							key={child.path}
							node={child}
							isMember={isMember}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</details>
	);
}

function countFiles(node: FolderNode): number {
	let n = node.files.length;
	for (const c of node.children.values()) n += countFiles(c);
	return n;
}

export function ModuleFilesTree({
	files,
	isMember,
}: {
	files: ModuleFileItem[];
	isMember: boolean;
}) {
	const tree = buildTree(files);
	return <FolderBlock node={tree} isMember={isMember} />;
}
