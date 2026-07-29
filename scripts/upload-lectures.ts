// رفع المحاضرات من مجلد محلّي مباشرة إلى Azure Blob + تسجيلها في قاعدة البيانات.
//
// الاستخدام:
//   npm run upload-lectures -- "D:/lectures-library"
//   npm run upload-lectures -- "D:/lectures-library" --dry        (معاينة دون رفع)
//   npm run upload-lectures -- "D:/lectures-library" --only=mila  (جامعة واحدة فقط)
//   npm run upload-lectures -- "D:/lectures-library" --email=you@mail.com
//
// بنية المجلدات المطلوبة:
//
//   lectures-library/
//     mila/                    ← slug الجامعة (أو اسمها العربي/اللاتيني)
//       L1/  L2/               ← مباشرة مجلدات الموديلات
//         Analyse 1/
//           Chapitre 1/        ← مجلدات فرعية اختيارية → folderPath
//             cours1.pdf
//       L3/  M1/  M2/          ← مجلد التخصص أولاً ثم الموديل
//         Analyse Mathematique/
//           Analyse Fonctionnelle/
//             cours1.pdf
//
// ملاحظات:
//   • المجلدات الفارغة تُتجاوز بصمت — لا حاجة لحذفها.
//   • للسداسي الثاني سمّ مجلد الموديل: "Analyse 2 S2" أو "Analyse 2 (S2)".
//   • في L3 إن لم يكن هناك تخصص استعمل مجلداً باسم "_" مكان التخصص.
//   • النوع (cours/td/tp/resume/book/exam) يُستنتج من اسم الملف أو المجلد الفرعي.
//   • الملفات المرفوعة سابقاً تُتجاوز تلقائياً — أعد تشغيل الأمر كلما أضفت جديداً.
//   • عند انقطاع الإنترنت يعيد المحاولة 4 مرات تدريجياً ولا يتوقف البرنامج.

import { config } from "dotenv";
config({ path: ".env" });

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
	BlobServiceClient,
	StorageSharedKeyCredential,
} from "@azure/storage-blob";

const prisma = new PrismaClient();

const LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;
type Level = (typeof LEVELS)[number];
const NEEDS_SPECIALTY: Level[] = ["L3", "M1", "M2"];

const MIME: Record<string, string> = {
	".pdf": "application/pdf",
	".djvu": "image/vnd.djvu",
	".djv": "image/vnd.djvu",
	".zip": "application/zip",
	".rar": "application/vnd.rar",
	".7z": "application/x-7z-compressed",
	".doc": "application/msword",
	".docx":
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".ppt": "application/vnd.ms-powerpoint",
	".pptx":
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".xls": "application/vnd.ms-excel",
	".xlsx":
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".txt": "text/plain",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * يعيد المحاولة عند أعطال الشبكة المؤقتة:
 * getaddrinfo ENOTFOUND (فشل DNS) أو Server selection timeout (انقطاع MongoDB).
 */
async function withRetry<T>(
	label: string,
	fn: () => Promise<T>,
	attempts = 4,
): Promise<T> {
	const waits = [3000, 8000, 20000, 40000];
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt === attempts) break;
			const wait = waits[attempt - 1] ?? 40000;
			console.warn(
				`         ⏳ ${label}: مشكلة اتصال — إعادة المحاولة ${attempt + 1}/${attempts} بعد ${wait / 1000} ثانية`,
			);
			containerClient = null; // إعادة حلّ DNS وبناء الاتصال من جديد
			await sleep(wait);
		}
	}
	throw lastError;
}

function slugify(input: string): string {
	const base = input
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (base) return base;
	// الأسماء العربية البحتة: بصمة قصيرة ثابتة
	return "x" + createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function inferType(fileName: string, folderPath: string): string {
	const hay = (folderPath + " " + fileName).toLowerCase();
	if (/\btd\b|serie|série|سلسلة/.test(hay)) return "td";
	if (/\btp\b|أعمال تطبيقية/.test(hay)) return "tp";
	if (/resume|résumé|ملخص/.test(hay)) return "resume";
	if (/livre|book|كتاب/.test(hay)) return "book";
	if (/exam|examen|امتحان|استدراك/.test(hay)) return "exam";
	if (/cours|محاضر/.test(hay)) return "cours";
	return "cours";
}

/** "Analyse 2 S2" أو "Analyse 2 (S2)" → { name: "Analyse 2", semester: 2 } */
function parseModuleFolder(name: string): { name: string; semester: number } {
	const match = name.match(/^(.*?)[\s_-]*\(?s([12])\)?$/i);
	if (match && match[1].trim()) {
		return { name: match[1].trim(), semester: Number(match[2]) };
	}
	return { name: name.trim(), semester: 1 };
}

async function listDirs(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b, "fr"));
}

type FoundFile = { absPath: string; fileName: string; folderPath: string };

async function walkFiles(dir: string, prefix = ""): Promise<FoundFile[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const out: FoundFile[] = [];
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
		if (entry.name.startsWith(".")) continue;
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await walkFiles(abs, prefix ? prefix + "/" + entry.name : entry.name)));
		} else if (entry.isFile()) {
			out.push({ absPath: abs, fileName: entry.name, folderPath: prefix });
		}
	}
	return out;
}

/** هل يحتوي المجلد على أي ملف في أي عمق؟ */
async function hasAnyFile(dir: string): Promise<boolean> {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		if (entry.isFile()) return true;
		if (entry.isDirectory() && (await hasAnyFile(path.join(dir, entry.name))))
			return true;
	}
	return false;
}

// ===== Azure =====
const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT ?? "";
const KEY = process.env.AZURE_STORAGE_KEY ?? "";
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || "lectures";
const ORIGIN = "https" + "://" + ACCOUNT + ".blob.core.windows.net";

let containerClient: ReturnType<BlobServiceClient["getContainerClient"]> | null =
	null;

async function getContainer() {
	if (containerClient) return containerClient;
	const service = new BlobServiceClient(
		ORIGIN,
		new StorageSharedKeyCredential(ACCOUNT, KEY),
	);
	const client = service.getContainerClient(CONTAINER);
	await client.createIfNotExists({ access: "blob" });
	containerClient = client;
	return client;
}

function publicUrl(key: string): string {
	return (
		ORIGIN +
		"/" +
		CONTAINER +
		"/" +
		key.split("/").map(encodeURIComponent).join("/")
	);
}

/** يبحث عن الجامعة بالـ slug أو بالاسم أو بتطابق جزئي. */
async function findUniversity(folderName: string, folderSlug: string) {
	const exact = await withRetry("قراءة الجامعات", () =>
		prisma.university.findFirst({
			where: {
				OR: [
					{ slug: folderSlug },
					{ slug: folderName },
					{ nameAr: { equals: folderName, mode: "insensitive" } },
					{ name: { equals: folderName, mode: "insensitive" } },
				],
			},
		}),
	);
	if (exact) return exact;
	// تطابق جزئي: slug طويل من نوع universite-...-mila
	const partial = await withRetry("قراءة الجامعات", () =>
		prisma.university.findMany({
			where: {
				OR: [
					{ slug: { contains: folderSlug, mode: "insensitive" } },
					{ name: { contains: folderName, mode: "insensitive" } },
					{ nameAr: { contains: folderName, mode: "insensitive" } },
				],
			},
			take: 2,
		}),
	);
	if (partial.length === 1) return partial[0];
	if (partial.length > 1) {
		console.error(
			`   ⚠️  "${folderName}" يطابق أكثر من جامعة — سمّ المجلد بالـ slug الدقيق.`,
		);
	}
	return null;
}

async function main() {
	const args = process.argv.slice(2);
	const root = args.find((value) => !value.startsWith("--")) ?? "./lectures";
	const dry = args.includes("--dry");
	const emailArg = args.find((value) => value.startsWith("--email="));
	const email = emailArg ? emailArg.slice("--email=".length) : "";
	const onlyArg = args.find((value) => value.startsWith("--only="));
	const only = onlyArg ? onlyArg.slice("--only=".length).toLowerCase() : "";

	if (!dry && (!ACCOUNT || !KEY)) {
		console.error(
			"❌ أضف AZURE_STORAGE_ACCOUNT و AZURE_STORAGE_KEY في ملف .env أولاً.",
		);
		process.exit(1);
	}

	const rootAbs = path.resolve(root);
	try {
		const info = await stat(rootAbs);
		if (!info.isDirectory()) throw new Error("not a directory");
	} catch {
		console.error(`❌ المجلد غير موجود: ${rootAbs}`);
		process.exit(1);
	}

	let uploadedById: string | null = null;
	if (email) {
		const user = await withRetry("قراءة المستخدم", () =>
			prisma.user.findUnique({ where: { email } }),
		);
		if (!user)
			console.warn(`⚠️  لا يوجد مستخدم بالبريد ${email} — سيُرفع بدون مالك.`);
		else uploadedById = user.id;
	}

	console.log(`📂 المجلد: ${rootAbs}`);
	console.log(dry ? "🔎 وضع المعاينة (دون رفع)\n" : `☁️  الحاوية: ${CONTAINER}\n`);

	let uploaded = 0;
	let skipped = 0;
	let failed = 0;
	let emptyFolders = 0;

	try {
		for (const uniFolder of await listDirs(rootAbs)) {
			if (only && uniFolder.toLowerCase() !== only) continue;
			const uniDir = path.join(rootAbs, uniFolder);

			// تجاوز المجلدات الفارغة بصمت (63 مجلد جامعة ومعظمها فارغ في البداية)
			if (!(await hasAnyFile(uniDir))) {
				emptyFolders += 1;
				continue;
			}

			const uniSlug = slugify(uniFolder);
			const university = await findUniversity(uniFolder, uniSlug);
			if (!university) {
				console.error(`❌ جامعة غير موجودة في قاعدة البيانات: "${uniFolder}"`);
				failed += 1;
				continue;
			}
			console.log(`🏛️  ${university.nameAr || university.name}  [${uniFolder}]`);

			for (const levelFolder of await listDirs(uniDir)) {
				const level = levelFolder.toUpperCase() as Level;
				if (!LEVELS.includes(level)) {
					console.error(
						`   ❌ مستوى غير صحيح: "${levelFolder}" (المسموح: ${LEVELS.join(", ")})`,
					);
					failed += 1;
					continue;
				}
				const levelDir = path.join(uniDir, levelFolder);
				if (!(await hasAnyFile(levelDir))) continue;
				console.log(`   🎓 ${level}`);
				const needsSpecialty = NEEDS_SPECIALTY.includes(level);

				// في L3/M1/M2 المستوى التالي هو التخصص، وفي L1/L2 هو الموديل مباشرة
				const specialtyFolders = needsSpecialty ? await listDirs(levelDir) : [""];

				for (const specialtyFolder of specialtyFolders) {
					let lectureSpecialtyId: string | null = null;
					let specialtySlugPart = "_";

					if (needsSpecialty && specialtyFolder && specialtyFolder !== "_") {
						const specialtySlug = `${uniSlug}-${level.toLowerCase()}-${slugify(specialtyFolder)}`;
						specialtySlugPart = slugify(specialtyFolder);
						let specialty = await withRetry("قراءة التخصص", () =>
							prisma.lectureSpecialty.findUnique({
								where: { slug: specialtySlug },
							}),
						);
						if (!specialty && !dry) {
							specialty = await withRetry("إنشاء التخصص", () =>
								prisma.lectureSpecialty.create({
									data: {
										name: specialtyFolder,
										slug: specialtySlug,
										level: level as never,
										universityId: university.id,
									},
								}),
							);
							console.log(`      ➕ تخصص جديد: ${specialtyFolder}`);
						}
						lectureSpecialtyId = specialty?.id ?? null;
						console.log(`      📚 ${specialtyFolder}`);
					}

					const specialtyDir = needsSpecialty
						? path.join(levelDir, specialtyFolder)
						: levelDir;

					for (const moduleFolder of await listDirs(specialtyDir)) {
						const moduleDir = path.join(specialtyDir, moduleFolder);
						if (!(await hasAnyFile(moduleDir))) continue;

						const parsed = parseModuleFolder(moduleFolder);
						const moduleSlug = slugify(parsed.name);
						let moduleRow = await withRetry("قراءة الموديل", () =>
							prisma.module.findFirst({
								where: {
									universityId: university.id,
									level: level as never,
									slug: moduleSlug,
									lectureSpecialtyId,
								},
							}),
						);
						if (!moduleRow && !dry) {
							moduleRow = await withRetry("إنشاء الموديل", () =>
								prisma.module.create({
									data: {
										name: parsed.name,
										slug: moduleSlug,
										level: level as never,
										semester: parsed.semester,
										universityId: university.id,
										lectureSpecialtyId,
									},
								}),
							);
							console.log(`      ➕ موديل جديد: ${parsed.name} (س${parsed.semester})`);
						}
						console.log(`      📘 ${parsed.name}`);

						// استعلام واحد لكل موديل بدل استعلام لكل ملف
						const already = new Set<string>();
						if (moduleRow) {
							const rows = await withRetry("قراءة الملفات الموجودة", () =>
								prisma.lectureResource.findMany({
									where: { moduleId: moduleRow!.id },
									select: { fileName: true, folderPath: true },
								}),
							);
							for (const row of rows) already.add(row.folderPath + "/" + row.fileName);
						}

						for (const file of await walkFiles(moduleDir)) {
							const ext = path.extname(file.fileName).toLowerCase();
							const contentType = MIME[ext] || "application/octet-stream";
							const info = await stat(file.absPath);
							const marker = file.folderPath + "/" + file.fileName;

							if (already.has(marker)) {
								skipped += 1;
								continue;
							}

							const key = [
								uniSlug,
								level.toLowerCase(),
								specialtySlugPart,
								moduleSlug,
								...(file.folderPath ? file.folderPath.split("/").map(slugify) : []),
								file.fileName,
							].join("/");

							if (dry) {
								console.log(
									`         🔎 ${key}  (${(info.size / 1048576).toFixed(1)} م.ب)`,
								);
								uploaded += 1;
								continue;
							}

							try {
								await withRetry(`رفع ${file.fileName}`, async () => {
									const container = await getContainer();
									await container.getBlockBlobClient(key).uploadFile(file.absPath, {
										blobHTTPHeaders: { blobContentType: contentType },
									});
								});
								await withRetry("تسجيل الملف", () =>
									prisma.lectureResource.create({
										data: {
											title: file.fileName.replace(/\.[^.]+$/, ""),
											type: inferType(file.fileName, file.folderPath) as never,
											folderPath: file.folderPath,
											fileUrl: publicUrl(key),
											fileName: file.fileName,
											fileSizeBytes: info.size,
											mimeType: contentType,
											moduleId: moduleRow!.id,
											uploadedById,
										},
									}),
								);
								already.add(marker);
								uploaded += 1;
								console.log(
									`         ✅ ${file.fileName} (${(info.size / 1048576).toFixed(1)} م.ب)`,
								);
							} catch (error) {
								failed += 1;
								console.error(
									`         ❌ ${file.fileName}: ${error instanceof Error ? error.message : error}`,
								);
							}
						}
					}
				}
			}
		}
	} finally {
		console.log(`\n──────────────────────────────`);
		console.log(
			`${dry ? "سيُرفع" : "تم رفع"}: ${uploaded}  |  موجود مسبقاً: ${skipped}  |  أخطاء: ${failed}  |  مجلدات فارغة: ${emptyFolders}`,
		);
		if (failed > 0 && !dry) {
			console.log(
				"↻ أعد تشغيل نفس الأمر لاحقاً — الملفات الناجحة تُتجاوز والفاشلة تُعاد فقط.",
			);
		}
	}
}

main()
	.catch((error) => {
		console.error(
			"\n❌ توقف البرنامج:",
			error instanceof Error ? error.message : error,
		);
		console.log(
			"↻ تحقّق من الإنترنت ثم أعد تشغيل نفس الأمر — سيكمل من حيث توقّف.",
		);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
