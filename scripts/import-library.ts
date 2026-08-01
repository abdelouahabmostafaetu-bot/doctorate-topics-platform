// استيراد جماعي لكتب الرياضيات إلى مكتبة الموقع.
//
// أمثلة:
//   npm run import-library -- --source=gutenberg --limit=100 --dry-run
//   npm run import-library -- --source=archive --limit=100 --host-files
//
// الخيارات:
//   --source=gutenberg|archive|openalex|all   المصدر (افتراضي gutenberg)
//   --limit=100                        الحد الأقصى للكتب في كل مصدر
//   --dry-run                          لا يكتب شيئًا في قاعدة البيانات، يُنتج تقريرًا فقط
//   --host-files                       ينسخ الملفات والأغلفة إلى التخزين
//   --no-learn                         يعطّل مرحلة التعلّم الذاتي
//   --mailto=you@example.com           بريد المسار المهذّب لـ OpenAlex

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { fetchGutenbergMath } from "./library/gutendex";
import { fetchArchiveMath } from "./library/archive";
import { fetchOpenAlexMathBooks } from "./library/openalex";
import {
	dedupeKey,
	FALLBACK_CATEGORY,
	isRedistributable,
	normalizeKeyPart,
	type NormalizedBook,
} from "./library/normalize";
import { learnAndAssign } from "./library/classify";
import { extensionFor, mirrorToStorage, storageConfigured, storageName, uploadBuffer } from "./library/storage";
import { coverSvg } from "./library/cover";

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

/** يضمن وجود التخصص (الباب) ويعيد معرّفه */
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
	const noLearn = flag("no-learn");

	console.log("المصدر: " + source + " | الحد: " + limit + (dryRun ? " | وضع تجريبي (لا كتابة)" : ""));
	if (hostFiles) console.log("التخزين: " + storageName());

	// 1) الجلب
	const fetched: NormalizedBook[] = [];
	if (source === "gutenberg" || source === "all") {
		console.log("جلب من Gutendex...");
		fetched.push(...(await fetchGutenbergMath(limit)));
	}
	if (source === "archive" || source === "all") {
		console.log("جلب من Internet Archive...");
		fetched.push(...(await fetchArchiveMath(limit)));
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

	// 3) التعلّم الذاتي — الدفعة تعلّم نفسها
	let learned = 0;
	const beforeLearning = fresh.filter((b) => b.category === FALLBACK_CATEGORY).length;
	if (!noLearn && beforeLearning) {
		learned = learnAndAssign(fresh);
		console.log(
			"التعلّم الذاتي: أسند " + learned + " من " + beforeLearning + " بالتشابه المعجمي.",
		);
	}

	// 4) التقرير (يُكتب دائمًا)
	mkdirSync("scripts/library/out", { recursive: true });
	const reportPath = "scripts/library/out/import-report.csv";
	const rows = ["source,category,title,author,license,hasCover,downloadUrl"];
	for (const b of fresh) {
		rows.push(
			[b.source, b.category, b.title, b.author, b.license, b.coverUrl ? "yes" : "generated", b.downloadUrl]
				.map(csvCell)
				.join(","),
		);
	}
	writeFileSync(reportPath, rows.join("\n"), "utf8");
	console.log("التقرير: " + reportPath);

	const byCategory = new Map<string, number>();
	for (const b of fresh) byCategory.set(b.category, (byCategory.get(b.category) || 0) + 1);
	console.log("التوزيع حسب الباب:");
	for (const [name, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
		console.log("  " + name + ": " + count);
	}

	// تشخيص: ما لم يستطع المصنّف تمييزه — منه نشتقّ كلمات مفتاحية جديدة
	const unclassified = fresh.filter((b) => b.category === FALLBACK_CATEGORY);
	if (unclassified.length) {
		console.log("عناوين لم تُصنّف (" + unclassified.length + "):");
		for (const b of unclassified.slice(0, 30)) console.log("  - " + b.title);
	}

	if (dryRun) {
		console.log("وضع تجريبي — لم تُكتب أي بيانات. راجع التقرير ثم أعد التشغيل بدون --dry-run.");
		return;
	}

	// 5) الإدخال
	const categoryCache = new Map<string, string>();
	let created = 0;
	let mirrored = 0;
	let coversHosted = 0;
	let coversGenerated = 0;
	let failed = 0;

	for (const book of fresh) {
		try {
			const specialtyId = await ensureCategory(book.category, categoryCache);
			let downloadUrl = book.downloadUrl;
			let coverUrl = book.coverUrl;

			if (hostFiles && storageConfigured()) {
				// ملف الكتاب — فقط عندما تسمح الرخصة صراحةً
				if (isRedistributable(book.license)) {
					const key = book.source + "/" + book.sourceId + extensionFor(book.fileMime);
					const hosted = await mirrorToStorage(book.downloadUrl, key, book.fileMime);
					if (hosted) {
						downloadUrl = hosted;
						mirrored++;
					}
				}

				// الغلاف: ننسخه بدل الربط المباشر بموقع المصدر
				if (coverUrl) {
					const hostedCover = await mirrorToStorage(
						coverUrl,
						"covers/" + book.source + "/" + book.sourceId + ".jpg",
						"image/jpeg",
					);
					if (hostedCover) {
						coverUrl = hostedCover;
						coversHosted++;
					}
				}

				// لا غلاف؟ نولّد واحدًا بلون الباب حتى لا تظهر بطاقة فارغة
				if (!coverUrl) {
					const generated = await uploadBuffer(
						coverSvg(book.title, book.author, book.category),
						"covers/" + book.source + "/" + book.sourceId + ".svg",
						"image/svg+xml",
					);
					if (generated) {
						coverUrl = generated;
						coversGenerated++;
					}
				}
			}

			await prisma.libraryBook.create({
				data: {
					title: book.title,
					author: book.author,
					summary: book.summary,
					coverUrl,
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

	console.log(
		"انتهى. أُضيف: " + created +
			" | ملفات مستضافة: " + mirrored +
			" | أغلفة منسوخة: " + coversHosted +
			" | أغلفة مولّدة: " + coversGenerated +
			" | بالتعلّم الذاتي: " + learned +
			" | فشل: " + failed,
	)
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
