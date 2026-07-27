/**
 * زرع تخصصات الرياضيات الرسمية (L3 / M1 / M2) لـ كل الجامعات الموجودة في
 * قاعدة البيانات (وليس فقط جامعات ملف JSON).
 *
 * - لا ينشئ جامعات جديدة.
 * - لا ينشئ مقاييس (المقاييس تُنشأ تلقائياً عند رفع الملفات عبر import-drop).
 * - آمن لإعادة التشغيل: لا يكرر التخصصات الموجودة.
 *
 * الاستعمال (من جذر المشروع):
 *   npx tsx scripts/lectures-drop/seed-specialties-all.ts                 ← معاينة فقط
 *   npx tsx scripts/lectures-drop/seed-specialties-all.ts --apply         ← تنفيذ فعلي
 *   npx tsx scripts/lectures-drop/seed-specialties-all.ts --apply --univ jijel
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// تحميل متغيرات البيئة (نفس طريقة import-drop.ts)
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
const APPLY = process.argv.includes("--apply");
const ONLY_UNIV = arg("univ")?.toLowerCase();

type Level = "L3" | "M1" | "M2";

type L3Specialty = { filiere: string; name: string };
type MasterSpecialty = { filiere: string; name: string; M1: string[]; M2: string[] };
type Dataset = {
	licence: { L3: { specialties: L3Specialty[] } };
	masters: MasterSpecialty[];
};

function slugify(input: string): string {
	return (
		input
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 60) || "x"
	);
}

const prisma = new PrismaClient();

async function main() {
	const dataPath = path.join(
		process.cwd(),
		"scripts",
		"lectures-drop",
		"official",
		"math-programs.json",
	);
	const data: Dataset = JSON.parse(fs.readFileSync(dataPath, "utf8"));

	// خطط التخصصات الرسمية (بدون مقاييس): L3 + M1 + M2
	const specPlans: { level: Level; name: string }[] = [];
	for (const s of data.licence.L3.specialties)
		specPlans.push({ level: "L3", name: s.name });
	for (const sp of data.masters) {
		specPlans.push({ level: "M1", name: sp.name });
		specPlans.push({ level: "M2", name: sp.name });
	}

	// كل الجامعات الموجودة في قاعدة البيانات
	const universities = await prisma.university.findMany({
		where: ONLY_UNIV ? { slug: ONLY_UNIV } : undefined,
		orderBy: { name: "asc" },
	});
	if (!universities.length) {
		console.error(
			ONLY_UNIV
				? `لا توجد جامعة بالرمز: ${ONLY_UNIV}`
				: "لا توجد جامعات في قاعدة البيانات.",
		);
		process.exit(1);
	}

	let specCreated = 0;
	let specExisting = 0;
	let uniTouched = 0;

	for (const uni of universities) {
		const baseSlug = uni.slug?.trim() || slugify(uni.name);
		const uName = uni.nameAr?.trim() || uni.name;
		let addedForUni = 0;

		for (const plan of specPlans) {
			const existing = await prisma.lectureSpecialty.findFirst({
				where: {
					universityId: uni.id,
					level: plan.level as never,
					name: plan.name,
				},
			});
			if (existing) {
				specExisting++;
				continue;
			}
			specCreated++;
			addedForUni++;
			if (APPLY) {
				const base = `${baseSlug}-${plan.level.toLowerCase()}-${slugify(plan.name)}`;
				let slug = base;
				let n = 2;
				while (
					await prisma.lectureSpecialty.findUnique({ where: { slug } })
				) {
					slug = `${base}-${n++}`;
				}
				await prisma.lectureSpecialty.create({
					data: {
						name: plan.name,
						slug,
						level: plan.level as never,
						universityId: uni.id,
					},
				});
			}
		}

		if (addedForUni) {
			uniTouched++;
			console.log(`+ ${uName} (${uni.slug}): ${addedForUni} تخصص`);
		}
	}

	console.log("\n===== الحصيلة =====");
	console.log(`الجامعات المفحوصة: ${universities.length}`);
	console.log(`جامعات أُضيفت لها تخصصات: ${uniTouched}`);
	console.log(`تخصصات جديدة: ${specCreated} — موجودة مسبقاً: ${specExisting}`);
	if (!APPLY)
		console.log(
			"\n⚠ وضع المعاينة فقط — لم يُكتب شيء. أضف --apply للتنفيذ الفعلي.",
		);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
