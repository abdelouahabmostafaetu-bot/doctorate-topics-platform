import Link from "next/link";
import { ChevronLeft, Download, FileText, Folder, LockKeyhole } from "lucide-react";
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

function countFiles(node: FolderNode): number {
	let n = node.files.length;
	for (const c of node.children.values()) n += countFiles(c);
	return n;
}

function sortFiles(a: ModuleFileItem, b: ModuleFileItem) {
	return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
}

/** إزاحة خفيفة حسب العمق — بدل إطار مستقل لكل مجلد */
function indent(depth: number) {
	return { paddingInlineStart: 10 + Math.min(depth, 5) * 14 };
}

function FileRow({
	file,
	isMember,
	depth,
}: {
	file: ModuleFileItem;
	isMember: boolean;
	depth: number;
}) {
	return (
		<div
			className="flex items-center gap-2 py-1.5 pe-2 transition-colors hover:bg-secondary/40"
			style={indent(depth)}
		>
			<FileText className="h-3.5 w-3.5 shrink-0 text-primary/70" />
			<div className="min-w-0 flex-1">
				<p className="truncate text-[12px] font-medium leading-4">{file.title}</p>
				<p className="text-[9px] leading-3 text-muted-foreground">
					{fmtSize(file.fileSizeBytes)} · {file.downloadsCount} تحميل
				</p>
			</div>
			{isMember ? (
				<a
					href={`/api/lectures/download/${file.id}`}
					download
					rel="noopener"
					aria-label={`تحميل ${file.title}`}
					className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition hover:opacity-90"
				>
					<Download className="h-3 w-3" />
					تحميل
				</a>
			) : (
				<Link
					href="/signin"
					className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
				>
					<LockKeyhole className="h-2.5 w-2.5" />
					دخول
				</Link>
			)}
		</div>
	);
}

/** صفوف متسلسلة داخل إطار واحد: ملفات ثم مجلدات مغلقة */
function Rows({
	node,
	isMember,
	depth,
}: {
	node: FolderNode;
	isMember: boolean;
	depth: number;
}) {
	const childFolders = [...node.children.values()].sort((a, b) =>
		a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
	);
	const files = [...node.files].sort(sortFiles);

	return (
		<>
			{files.map((f) => (
				<FileRow key={f.id} file={f} isMember={isMember} depth={depth} />
			))}
			{childFolders.map((child) => (
				<details key={child.path} className="group">
					<summary
						className="flex cursor-pointer list-none items-center gap-2 py-1.5 pe-2 transition-colors hover:bg-secondary/60"
						style={indent(depth)}
					>
						<ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-open:-rotate-90" />
						<Folder className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
						<span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
							{child.name}
						</span>
						<span className="shrink-0 rounded bg-secondary px-1.5 text-[9px] text-muted-foreground">
							{countFiles(child)}
						</span>
					</summary>
					<div className="divide-y divide-primary/[0.06] border-t border-primary/[0.06]">
						<Rows node={child} isMember={isMember} depth={depth + 1} />
					</div>
				</details>
			))}
		</>
	);
}

export function ModuleFilesTree({
	files,
	isMember,
}: {
	files: ModuleFileItem[];
	isMember: boolean;
}) {
	const tree = buildTree(files);
	return (
		<div className="overflow-hidden rounded-lg border border-primary/15 bg-card">
			<div className="divide-y divide-primary/[0.06]">
				<Rows node={tree} isMember={isMember} depth={0} />
			</div>
		</div>
	);
}
