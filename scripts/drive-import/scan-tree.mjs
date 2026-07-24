/**
 * يبني شجرة الملفات المحلية (مجلد بمجلد) لملف tree.json
 * node scripts/drive-import/scan-tree.mjs --root "D:\\lectures-from-drive"
 */
import fs from "node:fs";
import path from "node:path";

function arg(name) {
	const i = process.argv.indexOf("--" + name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

const ROOT = arg("root");
if (!ROOT || !fs.existsSync(ROOT)) {
	console.error('مرّر --root "مسار_المجلد"');
	process.exit(1);
}

const ALLOWED = new Set([
	".pdf",
	".zip",
	".rar",
	".7z",
	".doc",
	".docx",
	".ppt",
	".pptx",
	".png",
	".jpg",
	".jpeg",
	".webp",
	".txt",
	".md",
]);

const rootAbs = path.resolve(ROOT);

/** @type {{ relDir: string, name: string, files: { name: string, relPath: string, size: number }[], subdirs: string[] }[]} */
const folders = [];

function walk(dirAbs) {
	const relDir = path.relative(rootAbs, dirAbs).split(path.sep).join("/") || ".";
	let entries = [];
	try {
		entries = fs.readdirSync(dirAbs, { withFileTypes: true });
	} catch {
		return;
	}
	const files = [];
	const subdirs = [];
	for (const e of entries) {
		if (e.name.startsWith(".")) continue;
		const full = path.join(dirAbs, e.name);
		if (e.isDirectory()) {
			subdirs.push(e.name);
			walk(full);
		} else if (e.isFile()) {
			const ext = path.extname(e.name).toLowerCase();
			if (!ALLOWED.has(ext)) continue;
			const st = fs.statSync(full);
			files.push({
				name: e.name,
				relPath: path.relative(rootAbs, full).split(path.sep).join("/"),
				size: st.size,
			});
		}
	}
	folders.push({
		relDir,
		name: relDir === "." ? path.basename(rootAbs) : path.posix.basename(relDir),
		files,
		subdirs: subdirs.sort(),
	});
}

walk(rootAbs);

// ترتيب من الجذر إلى الأعماق ثم أبجديًا
folders.sort((a, b) => {
	const da = a.relDir === "." ? 0 : a.relDir.split("/").length;
	const db = b.relDir === "." ? 0 : b.relDir.split("/").length;
	if (da !== db) return da - db;
	return a.relDir.localeCompare(b.relDir);
});

const outDir = path.join(process.cwd(), "scripts/drive-import/out");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "tree.json");
const payload = {
	scannedAt: new Date().toISOString(),
	root: rootAbs,
	folderCount: folders.length,
	fileCount: folders.reduce((n, f) => n + f.files.length, 0),
	folders,
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
console.log(`OK folders=${payload.folderCount} files=${payload.fileCount}`);
console.log(out);
