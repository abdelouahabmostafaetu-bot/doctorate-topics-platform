/**
 * استيراد تدريجي من مجلد lectures-library إلى R2 + قاعدة المحاضرات.
 * آمن لإعادة التشغيل: يتخطى المكرر (عنوان/اسم+حجم/ledger).
 *
 * البنية:
 *   <root>/<univSlug>/<L1|L2|L3|M1|M2>/[Specialty/]<Module>/[type/]<file.pdf
 *
 * npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library"
 * npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library" --dry
 * npx tsx scripts/lectures-drop/import-drop.ts --root "D:\lectures-library" --univ usthb
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

for (const f of [".env.local", ".env"]) {
	const p = path.join(process.cwd(), f);
	if (!fs.existsSync(p)) continue;
	for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		let v = m[2];
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		)
			v = v.slice(1, -1);
		if (!process.env[m[1]]) process.env[m[1]] = v;
	}
}

function arg(name: string): string | undefined {
	const i = process.argv.indexOf("--" + name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes("--" + name);

const ROOT = arg("root") || path.join(process.cwd(), "lectures-library");
const ONLY_UNIV = (arg("univ") || "").toLowerCase();
const DRY = flag("dry");
const MAX_FILE = 200 * 1024 * 1024;
const LEVELS = new Set(["L1", "L2", "L3", "M1", "M2"]);
const TYPES = new Set(["cours", "td", "tp", "resume", "book", "exam", "other"]);
const SKIP_NAMES = new Set([
	"how_to_add.txt",
	"universities.txt",
	"_university.txt",
	".ds_store",
	"thumbs.db",
	"desktop.ini",
]);
const ALLOWED_EXT = new Set([
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
]);

const outDir = path.join(process.cwd(), "scripts/lectures-drop/out");
fs.mkdirSync(outDir, { recursive: true });
const ledgerPath = path.join(outDir, "imported-ledger.json");

type Ledger = Record<
	string,
	{ relPath: string; size: number; sha1: string; fileUrl?: string; at: string }
>;

function loadLedger(): Ledger {
	if (!fs.existsSync(ledgerPath)) return {};
	try {
		return JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
	} catch {
		return {};
	}
}

function saveLedger(l: Ledger) {
	fs.writeFileSync(ledgerPath, JSON.stringify(l, null, 2), "utf8");
}

function slugify(input: string): string {
	return (
		input
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "item"
	);
}

function guessType(name: string): string {
	const n = name.toLowerCase();
	if (/\btd\b|s[eé]rie|سلسلة/.test(n)) return "td";
	if (/\btp\b/.test(n)) return "tp";
	if (/exam|contr[oô]le|\bemd\b|rattrapage|امتحان/.test(n)) return "exam";
	if (/r[eé]sum[eé]|ملخص/.test(n)) return "resume";
	if (/livre|book|كتاب/.test(n)) return "book";
	if (/cours|محاضرة|chapitre|chapter|\bch\s*\d/i.test(n)) return "cours";
	return "cours";
}

function cleanTitle(name: string): string {
	return name
		.replace(/\.[a-z0-9]+$/i, "")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 150);
}

function mimeOf(name: string): string {
	const ext = path.extname(name).toLowerCase();
	const map: Record<string, string> = {
		".pdf": "application/pdf",
		".zip": "application/zip",
		".png": "image/png",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".webp": "image/webp",
		".doc": "application/msword",
		".docx":
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".ppt": "application/vnd.ms-powerpoint",
		".pptx":
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	};
	return map[ext] || "application/octet-stream";
}

function s3() {
	return new S3Client({
		region: "auto",
		endpoint: process.env.STORAGE_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
			secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
		},
	});
}

function publicUrlForKey(key: string): string {
	const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
	return base
		? `${base}/${key}`
		: `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${key}`;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 4): Promise<T> {
	let last: unknown;
	for (let i = 1; i <= retries; i++) {
		try {
			return await fn();
		} catch (e) {
			last = e;
			const msg = e instanceof Error ? e.message : String(e);
			console.log(`   ⚠️ retry ${i}/${retries} (${label}): ${msg.slice(0, 140)}`);
			if (i < retries) await new Promise((r) => setTimeout(r, 1200 * i));
		}
	}
	throw last;
}

function sha1File(filePath: string): string {
	const h = crypto.createHash("sha1");
	h.update(fs.readFileSync(filePath));
	return h.digest("hex");
}

type Parsed = {
	relPath: string;
	absPath: string;
	univSlug: string;
	level: "L1" | "L2" | "L3" | "M1" | "M2";
	specialtyName: string | null;
	moduleName: string;
	type: string;
	fileName: string;
	title: string;
	size: number;
};

/** يفسّر المسار النسبي داخل المكتبة */
function parseRel(relPosix: string, absPath: string, size: number): Parsed | null {
	const parts = relPosix.split("/").filter(Boolean);
	if (parts.length < 3) return null; // univ/level/file على الأقل ضعيف — نحتاج module
	const univSlug = parts[0].toLowerCase();
	const levelRaw = parts[1].toUpperCase();
	if (!LEVELS.has(levelRaw)) return null;
	const level = levelRaw as Parsed["level"];
	const fileName = parts[parts.length - 1];
	if (SKIP_NAMES.has(fileName.toLowerCase())) return null;
	const ext = path.extname(fileName).toLowerCase();
	if (!ALLOWED_EXT.has(ext)) return null;

	// الوسط بين level والملف
	const mid = parts.slice(2, -1); // may include specialty, module, type
	if (mid.length === 0) return null; // ملف مباشرة تحت المستوى — غير كافٍ

	let type = "cours";
	let specialtyName: string | null = null;
	let moduleName = "";

	if (mid.length === 1) {
		// level/Module/file
		moduleName = mid[0];
		type = guessType(fileName);
	} else if (mid.length === 2) {
		if (TYPES.has(mid[1].toLowerCase())) {
			// level/Module/type/file
			moduleName = mid[0];
			type = mid[1].toLowerCase();
		} else {
			// level/Specialty/Module/file
			specialtyName = mid[0];
			moduleName = mid[1];
			type = guessType(fileName);
		}
	} else {
		// length >= 3
		const lastMid = mid[mid.length - 1];
		if (TYPES.has(lastMid.toLowerCase())) {
			type = lastMid.toLowerCase();
			const before = mid.slice(0, -1);
			if (before.length === 1) {
				moduleName = before[0];
			} else {
				specialtyName = before.slice(0, -1).join(" / ");
				moduleName = before[before.length - 1];
			}
		} else {
			// no type folder
			specialtyName = mid.slice(0, -1).join(" / ");
			moduleName = mid[mid.length - 1];
			type = guessType(fileName);
		}
	}

	moduleName = moduleName.trim().slice(0, 120);
	if (!moduleName) return null;
	if (specialtyName) specialtyName = specialtyName.trim().slice(0, 80);

	return {
		relPath: relPosix,
		absPath,
		univSlug,
		level,
		specialtyName,
		moduleName,
		type: TYPES.has(type) ? type : "other",
		fileName,
		title: cleanTitle(fileName),
		size,
	};
}

function walkFiles(dir: string, base: string, out: string[]) {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of entries) {
		if (e.name.startsWith(".")) continue;
		const full = path.join(dir, e.name);
		if (e.isDirectory()) walkFiles(full, base, out);
		else if (e.isFile()) out.push(full);
	}
}

const prisma = new PrismaClient();

async function main() {
	if (!fs.existsSync(ROOT)) {
		console.error("Root not found:", ROOT);
		process.exit(1);
	}
	for (const k of [
		"DATABASE_URL",
		"STORAGE_ENDPOINT",
		"STORAGE_ACCESS_KEY",
		"STORAGE_SECRET_KEY",
		"STORAGE_BUCKET",
	]) {
		if (!process.env[k] && !DRY) {
			console.error("Missing env", k);
			process.exit(1);
		}
	}

	const rootAbs = path.resolve(ROOT);
	const allFiles: string[] = [];
	walkFiles(rootAbs, rootAbs, allFiles);

	const parsed: Parsed[] = [];
	for (const abs of allFiles) {
		const rel = path.relative(rootAbs, abs).split(path.sep).join("/");
		const st = fs.statSync(abs);
		if (!st.isFile() || st.size <= 0 || st.size > MAX_FILE) continue;
		const p = parseRel(rel, abs, st.size);
		if (!p) continue;
		if (ONLY_UNIV && p.univSlug !== ONLY_UNIV) continue;
		parsed.push(p);
	}

	console.log(`Root: ${rootAbs}`);
	console.log(`Files matched: ${parsed.length}  dry=${DRY}`);

	const universities = await prisma.university.findMany({
		select: { id: true, slug: true, name: true, nameAr: true },
	});
	const uniBySlug = new Map(universities.map((u) => [u.slug.toLowerCase(), u]));

	const admin =
		(await prisma.user.findFirst({
			where: { role: "SUPER_ADMIN" },
			select: { id: true, email: true },
		})) ||
		(await prisma.user.findFirst({
			where: { role: "ADMIN" },
			select: { id: true, email: true },
		}));

	const ledger = loadLedger();
	const moduleCache = new Map<string, string>();
	const specialtyCache = new Map<string, string>();

	let uploaded = 0;
	let skipped = 0;
	let failed = 0;
	const report: Array<Record<string, unknown>> = [];

	for (const item of parsed) {
		const uni = uniBySlug.get(item.univSlug);
		if (!uni) {
			skipped++;
			report.push({
				relPath: item.relPath,
				status: "skipped",
				reason: `unknown university slug: ${item.univSlug}`,
			});
			continue;
		}

		// ledger key
		let sha = "";
		try {
			sha = sha1File(item.absPath);
		} catch {
			failed++;
			report.push({ relPath: item.relPath, status: "failed", reason: "cannot read file" });
			continue;
		}
		const ledgerKey = `${item.relPath}|${item.size}|${sha}`;
		if (ledger[ledgerKey]) {
			skipped++;
			report.push({ relPath: item.relPath, status: "skipped", reason: "ledger duplicate" });
			continue;
		}

		try {
			// specialty (L3/M1/M2 when provided)
			let lectureSpecialtyId: string | null = null;
			if (
				item.specialtyName &&
				(item.level === "L3" || item.level === "M1" || item.level === "M2")
			) {
				const sk = `${uni.id}|${item.level}|${item.specialtyName}`;
				if (specialtyCache.has(sk)) lectureSpecialtyId = specialtyCache.get(sk)!;
				else {
					const existing = await prisma.lectureSpecialty.findFirst({
						where: {
							universityId: uni.id,
							level: item.level as never,
							name: item.specialtyName,
						},
					});
					if (existing) {
						lectureSpecialtyId = existing.id;
					} else if (!DRY) {
						let slug = slugify(item.specialtyName);
						let n = 2;
						while (await prisma.lectureSpecialty.findUnique({ where: { slug } })) {
							slug = `${slugify(item.specialtyName)}-${n++}`;
						}
						const created = await prisma.lectureSpecialty.create({
							data: {
								name: item.specialtyName,
								slug,
								level: item.level as never,
								universityId: uni.id,
							},
						});
						lectureSpecialtyId = created.id;
						console.log(`  + specialty ${item.specialtyName}`);
					} else {
						lectureSpecialtyId = "dry-spec";
					}
					specialtyCache.set(sk, lectureSpecialtyId!);
				}
			}

			// module
			const mk = `${uni.id}|${item.level}|${lectureSpecialtyId || ""}|${item.moduleName}`;
			let moduleId = moduleCache.get(mk) || "";
			if (!moduleId) {
				const found = await prisma.module.findFirst({
					where: {
						universityId: uni.id,
						level: item.level as never,
						name: item.moduleName,
						...(lectureSpecialtyId && lectureSpecialtyId !== "dry-spec"
							? { lectureSpecialtyId }
							: {}),
					},
				});
				if (found) moduleId = found.id;
				else if (!DRY) {
					const mod = await prisma.module.create({
						data: {
							name: item.moduleName,
							slug: `${slugify(item.moduleName)}-${Date.now().toString(36).slice(-5)}`,
							level: item.level as never,
							semester: 1,
							universityId: uni.id,
							lectureSpecialtyId:
								lectureSpecialtyId && lectureSpecialtyId !== "dry-spec"
									? lectureSpecialtyId
									: null,
						},
					});
					moduleId = mod.id;
					console.log(`  + module [${item.level}] ${item.moduleName}`);
				} else {
					moduleId = "dry-module";
				}
				moduleCache.set(mk, moduleId);
			}

			// DB duplicates
			if (!DRY && moduleId !== "dry-module") {
				const dupTitle = await prisma.lectureResource.findFirst({
					where: { moduleId, title: item.title },
				});
				if (dupTitle) {
					skipped++;
					ledger[ledgerKey] = {
						relPath: item.relPath,
						size: item.size,
						sha1: sha,
						fileUrl: dupTitle.fileUrl,
						at: new Date().toISOString(),
					};
					report.push({ relPath: item.relPath, status: "skipped", reason: "db title duplicate" });
					continue;
				}
				const dupFile = await prisma.lectureResource.findFirst({
					where: {
						moduleId,
						fileName: item.fileName,
						fileSizeBytes: item.size,
					},
				});
				if (dupFile) {
					skipped++;
					ledger[ledgerKey] = {
						relPath: item.relPath,
						size: item.size,
						sha1: sha,
						fileUrl: dupFile.fileUrl,
						at: new Date().toISOString(),
					};
					report.push({ relPath: item.relPath, status: "skipped", reason: "db file+size duplicate" });
					continue;
				}
			}

			if (DRY) {
				uploaded++;
				report.push({
					relPath: item.relPath,
					status: "dry",
					target: `${item.univSlug}/${item.level}/${item.specialtyName || "-"}/${item.moduleName}/${item.type}`,
				});
				console.log(
					`  🔍 ${item.relPath} → ${item.univSlug}/${item.level}/${item.moduleName}/${item.type}`,
				);
				continue;
			}

			const buf = fs.readFileSync(item.absPath);
			const safe = item.fileName.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80);
			const key = `lectures/drop/${item.univSlug}/${item.level}/${Date.now()}-${safe}`;
			const ct = mimeOf(item.fileName);
			await withRetry(
				() =>
					s3().send(
						new PutObjectCommand({
							Bucket: process.env.STORAGE_BUCKET!,
							Key: key,
							Body: buf,
							ContentType: ct,
						}),
					),
				`upload ${item.relPath}`,
			);
			const fileUrl = publicUrlForKey(key);
			await withRetry(
				() =>
					prisma.lectureResource.create({
						data: {
							title: item.title,
							type: item.type as never,
							moduleId,
							fileUrl,
							fileName: item.fileName.slice(0, 200),
							fileSizeBytes: item.size,
							mimeType: ct,
							uploadedById: admin?.id,
						},
					}),
				`db ${item.relPath}`,
			);

			ledger[ledgerKey] = {
				relPath: item.relPath,
				size: item.size,
				sha1: sha,
				fileUrl,
				at: new Date().toISOString(),
			};
			uploaded++;
			report.push({ relPath: item.relPath, status: "uploaded", fileUrl });
			console.log(`  📦 ${item.title} (${(item.size / 1048576).toFixed(2)} MB)`);
		} catch (e) {
			failed++;
			const msg = e instanceof Error ? e.message : String(e);
			report.push({ relPath: item.relPath, status: "failed", reason: msg });
			console.log(`  ❌ ${item.relPath}: ${msg.slice(0, 160)}`);
		}
	}

	if (!DRY) saveLedger(ledger);

	const reportPath = path.join(outDir, "last-import-report.json");
	fs.writeFileSync(
		reportPath,
		JSON.stringify(
			{
				finishedAt: new Date().toISOString(),
				root: rootAbs,
				dry: DRY,
				matched: parsed.length,
				uploaded,
				skipped,
				failed,
				rows: report,
			},
			null,
			2,
		),
		"utf8",
	);

	console.log(`\nDONE uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
	console.log(reportPath);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
