// استيراد جماعي لكتب الرياضيات إلى مكتبة الموقع.
//
// أمثلة:
//   npm run import-library -- --source=gutenberg --limit=100 --dry-run
//   npm run import-library -- --source=gutenberg --limit=100 --host-files
//   npm run import-library -- --source=all --limit=300
//
// الخيارات:
//   --source=gutenberg|openalex|all   المصدر (افتراضي gutenberg)
//   --limit=100                        الحد الأقصى للكتب في كل مصدر
//   --dry-run                          لا يكتب شيئًا في قاعدة البيانات، يُنتج تقريرًا فقط
//   --host-files                       ينسخ الملفات إلى R2 (للرخص التي تسمح بذلك فقط)
//   --mailto=you@example.com           بريد المسار المهذّب لـ OpenAlex

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { fetchGutenbergMath } from "./library/gutendex";
import { fetchOpenAlexMathBooks } from "./library/openalex";
import { dedupeKey, isRedistributable, normalizeKeyPart, type NormalizedBook } from "./library/normalize";
import { extensionFor, mirrorToR2, storageConfigured } from "./library/r2";

const prisma = new PrismaClient();

function arg(name: string, fallback: string): string {
	const found = process.argv.find((a) => a.startsWith("--" + name + "="));
	return found ? found.split("=").slice(1).join("=") : fallback;
}

function flag(name: string): boolean {
	return process.argv.includes("--" + name);
}

function slugify(input: string): string {
	const base = normalizeKeyPart(input).replace(/\s+/g, "-").slice(0, 60);
	return base || "category";
}

/** يضمن وجود التخصص (التصنيف) ويعيد معرّفه */
async function ensureCategory(name: string, cache: Map<string, string>): Promise<string> {
	const cached = cache.get(name);
	if (cached) return cached;

	const existing = await prisma.librarySpecialty.findFirst({ where: { name } });
	if (existing) {
		cache.set(name, existing.id);
		return existing.id;
	}

	let slug = slugify(name);
	if (await prisma.librarySpecialty.findUnique({ where: { slug } })) {
		slug = slug + "-" + Date.now().toString(36);
	}
	const created = await prisma.librarySpecialty.create({ data: { name, slug } });
	cache.set(name, created.id);
	return created.id;
}

function csvCell(value: string): string {
	return '"' + (value || "").replace(/"/g, '""') + '"';
}

async function main() {
	const source = arg("source", "gutenberg");
	const limit = Number(arg("limit", "100")) || 100;
	const mailto = arg("mailto", "abdelouahab.mostafa.etu@centre-univ-mila.dz");
	const dryRun = flag("dry-run");
	const hostFiles = flag("host-files");

	console.log("المصدر: " + source + " | الحد: " + limit + (dryRun ? " | وضع تجريبي (لا كتابة)" : ""));

	// 1) الجلب
	const fetched: NormalizedBook[] = [];
	if (source === "gutenberg" || source === "all") {
		console.log("جلب من Gutendex...");
		fetched.push(...(await fetchGutenbergMath(limit)));
	}
	if (source === "openalex" || source === "all") {
		console.log("جلب من OpenAlex...");
		fetched.push(...(await fetchOpenAlexMathBooks(limit, mailto)));
	}
	console.log("تم جلب " + fetched.length + " كتابًا رياضيًا.");

	// 2) إزالة التكرار مقابل قاعدة البيانات ومقابل الدفعة نفسها
	const existing = await prisma.libraryBook.findMany({ select: { title: true, author: true, downloadUrl: true } });
	const seenKeys = new Set(existing.map((b) => dedupeKey(b.title, b.author)));
	const seenUrls = new Set(existing.map((b) => b.downloadUrl));

	const fresh: NormalizedBook[] = [];
	let duplicates = 0;
	for (const book of fetched) {
		const key = dedupeKey(book.title, book.author);
		if (seenKeys.has(key) || seenUrls.has(book.downloadUrl)) {
			duplicates++;
			continue;
		}
		seenKeys.add(key);
		seenUrls.add(book.downloadUrl);
		fresh.push(book);
	}
	console.log("جديد: " + fresh.length + " | مكرر: " + duplicates);

	// 3) التقرير (يُكتب دائمًا)
	mkdirSync("scripts/library/out", { recursive: true });
	const reportPath = "scripts/library/out/import-report.csv";
	const rows = ["source,category,title,author,license,downloadUrl"];
	for (const b of fresh) {
		rows.push([b.source, b.category, b.title, b.author, b.license, b.downloadUrl].map(csvCell).join(","));
	}
	writeFileSync(reportPath, rows.join("\n"), "utf8");
	console.log("التقرير: " + reportPath);

	const byCategory = new Map<string, number>();
	for (const b of fresh) byCategory.set(b.category, (byCategory.get(b.category) || 0) + 1);
	console.log("التوزيع حسب التصنيف:");
	for (const [name, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
		console.log("  " + name + ": " + count);
	}

	if (dryRun) {
		console.log("وضع تجريبي — لم تُكتب أي بيانات. راجع التقرير ثم أعد التشغيل بدون --dry-run.");
		return;
	}

	// 4) الإدخال
	const categoryCache = new Map<string, string>();
	let created = 0;
	let mirrored = 0;
	let failed = 0;

	for (const book of fresh) {
		try {
			const specialtyId = await ensureCategory(book.category, categoryCache);
			let downloadUrl = book.downloadUrl;

			// نستضيف الملف فقط عندما تسمح الرخصة صراحةً
			if (hostFiles && storageConfigured() && isRedistributable(book.license)) {
				const key = "library/" + book.source + "/" + book.sourceId + extensionFor(book.fileMime);
				const hosted = await mirrorToR2(book.downloadUrl, key, book.fileMime);
				if (hosted) {
					downloadUrl = hosted;
					mirrored++;
				}
			}

			await prisma.libraryBook.create({
				data: {
					title: book.title,
					author: book.author,
					summary: book.summary,
					coverUrl: book.coverUrl,
					downloadUrl,
					specialtyId,
				},
			});
			created++;
			if (created % 25 === 0) console.log("  أُضيف " + created + "...");
		} catch (error) {
			failed++;
			console.error("فشل: " + book.title + " — " + (error as Error).message);
		}
	}

	console.log("انتهى. أُضيف: " + created + " | مُستضاف على R2: " + mirrored + " | فشل: " + failed);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
