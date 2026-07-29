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
	const exact = await prisma.university.findFirst({
		where: {
			OR: [
				{ slug: folderSlug },
				{ slug: folderName },
				{ nameAr: { equals: folderName, mode: "insensitive" } },
				{ name: { equals: folderName, mode: "insensitive" } },
			],
		},
	});
	if (exact) return exact;
	// تطابق جزئي: slug طويل من نوع universite-...-mila
	const partial = await prisma.university.findMany({
		where: {
			OR: [
				{ slug: { contains: folderSlug, mode: "insensitive" } },
				{ name: { contains: folderName, mode: "insensitive" } },
				{ nameAr: { contains: folderName, mode: "insensitive" } },
			],
		},
		take: 2,
	});
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
		const user = await prisma.user.findUnique({ where: { email } });
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
					let specialty = await prisma.lectureSpecialty.findUnique({
						where: { slug: specialtySlug },
					});
					if (!specialty && !dry) {
						specialty = await prisma.lectureSpecialty.create({
							data: {
								name: specialtyFolder,
								slug: specialtySlug,
								level: level as never,
								universityId: university.id,
							},
						});
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
					let moduleRow = await prisma.module.findFirst({
						where: {
							universityId: university.id,
							level: level as never,
							slug: moduleSlug,
							lectureSpecialtyId,
						},
					});
					if (!moduleRow && !dry) {
						moduleRow = await prisma.module.create({
							data: {
								name: parsed.name,
								slug: moduleSlug,
								level: level as never,
								semester: parsed.semester,
								universityId: university.id,
								lectureSpecialtyId,
							},
						});
						console.log(`      ➕ موديل جديد: ${parsed.name} (س${parsed.semester})`);
					}
					console.log(`      📘 ${parsed.name}`);

					for (const file of await walkFiles(moduleDir)) {
						const ext = path.extname(file.fileName).toLowerCase();
						const contentType = MIME[ext] || "application/octet-stream";
						const info = await stat(file.absPath);

						if (moduleRow) {
							const exists = await prisma.lectureResource.findFirst({
								where: {
									moduleId: moduleRow.id,
									fileName: file.fileName,
									folderPath: file.folderPath,
								},
							});
							if (exists) {
								skipped += 1;
								continue;
							}
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
							const container = await getContainer();
							await container.getBlockBlobClient(key).uploadFile(file.absPath, {
								blobHTTPHeaders: { blobContentType: contentType },
							});
							await prisma.lectureResource.create({
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
							});
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

	console.log(`\n──────────────────────────────`);
	console.log(
		`${dry ? "سيُرفع" : "تم رفع"}: ${uploaded}  |  موجود مسبقاً: ${skipped}  |  أخطاء: ${failed}  |  مجلدات فارغة: ${emptyFolders}`,
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
