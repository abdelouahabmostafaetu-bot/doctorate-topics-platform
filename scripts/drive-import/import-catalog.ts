/**
 * يقرأ catalog.json ويرفع الملفات المحلية إلى R2 ثم يسجّلها في LectureResource.
 *
 * npx tsx scripts/drive-import/import-catalog.ts
 * npx tsx scripts/drive-import/import-catalog.ts --dry
 * npx tsx scripts/drive-import/import-catalog.ts --min-confidence 0.55
 */
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
const DRY = flag("dry");
const MIN_CONF = Number(arg("min-confidence") || 0.45);
const MAX_FILE = 200 * 1024 * 1024;

const outDir = path.join(process.cwd(), "scripts/drive-import/out");
const catalogPath = path.join(outDir, "catalog.json");
if (!fs.existsSync(catalogPath)) {
	console.error("missing catalog.json — run classify-with-kimi first");
	process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as {
	root: string;
	items: Array<{
		relPath: string;
		sourceName: string;
		size: number;
		universitySlug: string | null;
		level: "L1" | "L2" | "L3" | "M1" | "M2" | null;
		specialtyName: string | null;
		specialtySlug: string | null;
		module: string;
		semester: number;
		type: string;
		title: string;
		confidence: number;
		skip?: boolean;
	}>;
};

const root = catalog.root;
if (!root || !fs.existsSync(root)) {
	console.error("catalog.root missing on disk:", root);
	process.exit(1);
}

function slugify(input: string): string {
	return (
		input
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "module"
	);
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
		".txt": "text/plain",
		".md": "text/markdown",
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
			if (i < retries) await new Promise((r) => setTimeout(r, 1500 * i));
		}
	}
	throw last;
}

const prisma = new PrismaClient();

type ReportRow = {
	relPath: string;
	status: "uploaded" | "skipped" | "failed" | "dry";
	reason?: string;
	fileUrl?: string;
	moduleId?: string;
};

async function main() {
	for (const k of [
		"DATABASE_URL",
		"STORAGE_ENDPOINT",
		"STORAGE_ACCESS_KEY",
		"STORAGE_SECRET_KEY",
		"STORAGE_BUCKET",
	]) {
		if (!process.env[k] && !DRY) {
			console.error(`Missing env ${k}`);
			process.exit(1);
		}
	}

	const admin =
		(await prisma.user.findFirst({
			where: { role: "SUPER_ADMIN" },
			select: { id: true, email: true },
		})) ||
		(await prisma.user.findFirst({
			where: { role: "ADMIN" },
			select: { id: true, email: true },
		}));

	const universities = await prisma.university.findMany({
		select: { id: true, slug: true, name: true, nameAr: true },
	});
	const uniBySlug = new Map(universities.map((u) => [u.slug.toLowerCase(), u]));
	// مطابقة مرنة بالاسم
	function resolveUniversity(slug: string | null, hintPath: string) {
		if (slug && uniBySlug.has(slug.toLowerCase())) return uniBySlug.get(slug.toLowerCase())!;
		const blob = `${slug || ""} ${hintPath}`.toLowerCase();
		for (const u of universities) {
			const keys = [u.slug, u.name, u.nameAr || ""].map((x) => x.toLowerCase()).filter(Boolean);
			if (keys.some((k) => k && blob.includes(k))) return u;
		}
		return null;
	}

	const report: ReportRow[] = [];
	let uploaded = 0;
	let skipped = 0;
	let failed = 0;
	const moduleCache = new Map<string, string>(); // key -> moduleId

	const items = catalog.items || [];
	console.log(`Items=${items.length} dry=${DRY} minConfidence=${MIN_CONF}`);

	for (const item of items) {
		const localPath = path.join(root, item.relPath);
		try {
			if (item.skip || (item.confidence ?? 0) < MIN_CONF) {
				skipped++;
				report.push({ relPath: item.relPath, status: "skipped", reason: item.skip ? "marked skip" : "low confidence" });
				continue;
			}
			if (!item.universitySlug || !item.level || !item.module) {
				skipped++;
				report.push({
					relPath: item.relPath,
					status: "skipped",
					reason: "missing university/level/module",
				});
				continue;
			}
			if (!fs.existsSync(localPath)) {
				failed++;
				report.push({ relPath: item.relPath, status: "failed", reason: "file not found on disk" });
				continue;
			}

			const uni = resolveUniversity(item.universitySlug, item.relPath);
			if (!uni) {
				skipped++;
				report.push({
					relPath: item.relPath,
					status: "skipped",
					reason: `unknown universitySlug=${item.universitySlug}`,
				});
				continue;
			}

			const level = item.level;
			const semester = Number(item.semester) === 2 ? 2 : 1;
			const moduleName = item.module.slice(0, 120);
			const type = ["cours", "td", "tp", "resume", "book", "exam", "other"].includes(item.type)
				? item.type
				: "other";

			// تخصص المحاضرات (L3/M1/M2)
			let lectureSpecialtyId: string | null = null;
			if ((level === "L3" || level === "M1" || level === "M2") && (item.specialtySlug || item.specialtyName)) {
				const existing =
					(item.specialtySlug &&
						(await prisma.lectureSpecialty.findFirst({
							where: { slug: item.specialtySlug },
						}))) ||
					(item.specialtyName &&
						(await prisma.lectureSpecialty.findFirst({
							where: {
								universityId: uni.id,
								level: level as never,
								name: item.specialtyName,
							},
						})));
				if (existing) lectureSpecialtyId = existing.id;
				else if (!DRY && item.specialtyName) {
					const baseSlug = slugify(item.specialtySlug || item.specialtyName);
					let slug = baseSlug;
					let n = 2;
					while (await prisma.lectureSpecialty.findUnique({ where: { slug } })) {
						slug = `${baseSlug}-${n++}`;
					}
					const created = await prisma.lectureSpecialty.create({
						data: {
							name: item.specialtyName.slice(0, 80),
							slug,
							level: level as never,
							universityId: uni.id,
						},
					});
					lectureSpecialtyId = created.id;
					console.log(`  + specialty ${created.name} (${slug})`);
				}
			}

			const cacheKey = `${uni.id}|${level}|${semester}|${lectureSpecialtyId || ""}|${moduleName}`;
			let moduleId = moduleCache.get(cacheKey) || "";
			if (!moduleId) {
				const found = await prisma.module.findFirst({
					where: {
						universityId: uni.id,
						level: level as never,
						name: moduleName,
						...(lectureSpecialtyId ? { lectureSpecialtyId } : {}),
					},
				});
				if (found) moduleId = found.id;
				else if (!DRY) {
					const mod = await prisma.module.create({
						data: {
							name: moduleName,
							slug: `${slugify(moduleName)}-${Date.now().toString(36).slice(-6)}`,
							level: level as never,
							semester,
							universityId: uni.id,
							lectureSpecialtyId,
						},
					});
					moduleId = mod.id;
					console.log(`  + module [${level}] ${moduleName}`);
				} else {
					moduleId = "dry-module";
				}
				moduleCache.set(cacheKey, moduleId);
			}

			const title = (item.title || item.sourceName).slice(0, 150);
			if (!DRY && moduleId !== "dry-module") {
				const dup = await prisma.lectureResource.findFirst({
					where: { moduleId, title },
				});
				if (dup) {
					skipped++;
					report.push({ relPath: item.relPath, status: "skipped", reason: "duplicate title in module", moduleId });
					continue;
				}
			}

			const buf = fs.readFileSync(localPath);
			if (!buf.length || buf.length > MAX_FILE) {
				skipped++;
				report.push({ relPath: item.relPath, status: "skipped", reason: "bad size" });
				continue;
			}

			if (DRY) {
				uploaded++;
				report.push({ relPath: item.relPath, status: "dry", moduleId, reason: `${uni.slug}/${level}/${moduleName}/${type}` });
				console.log(`  🔍 dry ${item.relPath} → ${uni.slug}/${level}/${moduleName}/${type}`);
				continue;
			}

			const safe = item.sourceName.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80);
			const key = `lectures/drive/${uni.slug}/${level}/${Date.now()}-${safe}`;
			const ct = mimeOf(item.sourceName);
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
							title,
							type: type as never,
							moduleId,
							fileUrl,
							fileName: item.sourceName.slice(0, 200),
							fileSizeBytes: buf.length,
							mimeType: ct,
							uploadedById: admin?.id,
						},
					}),
				`db ${item.relPath}`,
			);
			uploaded++;
			report.push({ relPath: item.relPath, status: "uploaded", fileUrl, moduleId });
			console.log(`  📦 ${title} (${(buf.length / 1048576).toFixed(2)} MB)`);
		} catch (e) {
			failed++;
			const msg = e instanceof Error ? e.message : String(e);
			report.push({ relPath: item.relPath, status: "failed", reason: msg });
			console.log(`  ❌ ${item.relPath}: ${msg.slice(0, 180)}`);
		}
	}

	const reportPath = path.join(outDir, "import-report.json");
	fs.writeFileSync(
		reportPath,
		JSON.stringify(
			{
				finishedAt: new Date().toISOString(),
				dry: DRY,
				uploaded,
				skipped,
				failed,
				admin: admin?.email || null,
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
