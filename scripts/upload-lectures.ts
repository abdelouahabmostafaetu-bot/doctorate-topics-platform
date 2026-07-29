// رفع المحاضرات من مجلد محلّي مباشرة إلى Azure Blob + تسجيلها في قاعدة البيانات.
//
// الاستخدام:
//   npm run upload-lectures -- ./lectures
//   npm run upload-lectures -- ./lectures --dry        (معاينة دون رفع)
//   npm run upload-lectures -- ./lectures --email=you@mail.com
//
// بنية المجلدات المطلوبة:
//
//   lectures/
//     <الجامعة>/            ← كما هي مسجّلة في الموقع (عربي أو لاتيني أو slug)
//       L1/  L2/                ← مباشرة مجلدات الموديلات
//         <الموديل>/
//           [مجلدات فرعية...]/  ← تُحفط في folderPath
//             fichier.pdf
//       L3/  M1/  M2/           ← مجلد التخصص أولاً ثم الموديل
//         <التخصص>/
//           <الموديل>/
//             fichier.pdf
//
// ملاحظات:
//   • للسداسي الثاني سمّ مجلد الموديل: "Analyse 2 S2" أو "Analyse 2 (S2)".
//   • في L3 إن لم يكن هناك تخصص استعمل مجلداً باسم "_" مكان التخصص.
//   • النوع (cours/td/tp/resume/book/exam) يُستنتج من اسم الملف أو المجلد الفرعي.
//   • الملفات المرفوعة سابقاً تُتجاوز تلقائياً — فأعد تشغيل الأمر كلما أضفت ملفات جديدة.

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
	return ORIGIN + "/" + CONTAINER + "/" + key.split("/").map(encodeURIComponent).join("/");
}

async function main() {
	const args = process.argv.slice(2);
	const root = args.find((value) => !value.startsWith("--")) ?? "./lectures";
	const dry = args.includes("--dry");
	const emailArg = args.find((value) => value.startsWith("--email="));
	const email = emailArg ? emailArg.slice("--email=".length) : "";

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
		if (!user) console.warn(`⚠️  لا يوجد مستخدم بالبريد ${email} — سيُرفع بدون مالك.`);
		else uploadedById = user.id;
	}

	console.log(`📂 المجلد: ${rootAbs}`);
	console.log(dry ? "🔎 وضع المعاينة (دون رفع)\n" : `☁️  الحاوية: ${CONTAINER}\n`);

	let uploaded = 0;
	let skipped = 0;
	let failed = 0;

	for (const uniFolder of await listDirs(rootAbs)) {
		const uniSlug = slugify(uniFolder);
		const university = await prisma.university.findFirst({
			where: {
				OR: [
					{ nameAr: { equals: uniFolder, mode: "insensitive" } },
					{ name: { equals: uniFolder, mode: "insensitive" } },
					{ slug: uniSlug },
				],
			},
		});
		if (!university) {
			const all = await prisma.university.findMany({ select: { nameAr: true, name: true } });
			console.error(`❌ جامعة غير معروفة: "${uniFolder}"`);
			console.error("   الجامعات المتاحة: " + all.map((u) => u.nameAr || u.name).join(" | "));
			failed += 1;
			continue;
		}
		console.log(`🏛️  ${university.nameAr || university.name}`);

		for (const levelFolder of await listDirs(path.join(rootAbs, uniFolder))) {
			const level = levelFolder.toUpperCase() as Level;
			if (!LEVELS.includes(level)) {
				console.error(`   ❌ مستوى غير صحيح: "${levelFolder}" (المسموح: ${LEVELS.join(", ")})`);
				failed += 1;
				continue;
			}
			console.log(`   🎓 ${level}`);
			const levelDir = path.join(rootAbs, uniFolder, levelFolder);
			const needsSpecialty = NEEDS_SPECIALTY.includes(level);

			// في L3/M1/M2 المستوى التالي هو التخصص، وفي L1/L2 هو الموديل مباشرة
			const specialtyFolders = needsSpecialty ? await listDirs(levelDir) : [""];

			for (const specialtyFolder of specialtyFolders) {
				let lectureSpecialtyId: string | null = null;
				let specialtySlugPart = "_";

				if (needsSpecialty && specialtyFolder && specialtyFolder !== "_") {
					const specialtySlug = `${uniSlug}-${level.toLowerCase()}-${slugify(specialtyFolder)}`;
					specialtySlugPart = slugify(specialtyFolder);
					let specialty = await prisma.lectureSpecialty.findUnique({ where: { slug: specialtySlug } });
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

				const specialtyDir = needsSpecialty ? path.join(levelDir, specialtyFolder) : levelDir;

				for (const moduleFolder of await listDirs(specialtyDir)) {
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

					const files = await walkFiles(path.join(specialtyDir, moduleFolder));
					for (const file of files) {
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
								console.log(`         ⏭️  موجود: ${file.fileName}`);
								continue;
							}
						}

						const keyParts = [
							uniSlug,
							level.toLowerCase(),
							specialtySlugPart,
							moduleSlug,
							...(file.folderPath ? file.folderPath.split("/").map(slugify) : []),
							file.fileName,
						];
						const key = keyParts.join("/");

						if (dry) {
							console.log(`         🔎 ${key}  (${(info.size / 1048576).toFixed(1)} م.ب)`);
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
							console.log(`         ✅ ${file.fileName} (${(info.size / 1048576).toFixed(1)} م.ب)`);
						} catch (error) {
							failed += 1;
							console.error(`         ❌ ${file.fileName}: ${error instanceof Error ? error.message : error}`);
						}
					}
				}
			}
		}
	}

	console.log(`\n─────────────────────`);
	console.log(`${dry ? "سيُرفع" : "تم رفع"}: ${uploaded}  |  متجاوز: ${skipped}  |  أخطاء: ${failed}`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
