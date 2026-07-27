/**
 * تصفير قسم المحاضرات بالكامل — الإبقاء فقط على الـ 62 جامعة الرسمية.
 *
 * ماذا يفعل:
 *   1. يحذف كل ملفات المحاضرات (LectureResource) + كل المقاييس (Module)
 *      + كل التخصصات (LectureSpecialty).
 *   2. يضبط الجامعات على القائمة الرسمية (62): يصحح الاسم/الاسم العربي/
 *      الرمز/المدينة، وينشئ الناقص، ويحذف الزائد إن لم تكن له مواضيع دكتوراه
 *      (الجامعات المرتبطة بمواضيع تُترك حتى لا ينكسر قسم الامتحانات — لكنها
 *      لن تظهر في /lectures لأن الصفحة أصبحت تعرض الرسمية فقط).
 *   3. يضع شعاراً لكل جامعة (أيقونة الموقع الرسمي للجامعة).
 *
 * الاستعمال (من جذر المشروع):
 *   npx tsx scripts/lectures-drop/reset-univs-only.ts                ← معاينة فقط
 *   npx tsx scripts/lectures-drop/reset-univs-only.ts --apply        ← تنفيذ فعلي
 *   npx tsx scripts/lectures-drop/reset-univs-only.ts --apply --force-logos
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// تحميل متغيرات البيئة
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

const APPLY = process.argv.includes("--apply");
const FORCE_LOGOS = process.argv.includes("--force-logos");

type UniversityRow = {
	slug: string;
	name: string;
	nameAr: string;
	city: string;
	website?: string;
};

function logoFor(u: UniversityRow): string | null {
	if (!u.website) return null;
	return "https://www.google.com/s2/favicons?domain=" + u.website + "&sz=128";
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
	const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
	const officials: UniversityRow[] = data.universities;
	console.log(`القائمة الرسمية: ${officials.length} جامعة\n`);

	// ========== 1) حذف كل محتوى المحاضرات ==========
	const nRes = await prisma.lectureResource.count();
	const nMod = await prisma.module.count();
	const nSpec = await prisma.lectureSpecialty.count();
	console.log(
		`سيُحذف: ${nRes} ملف — ${nMod} مقياس — ${nSpec} تخصص`,
	);
	if (APPLY) {
		await prisma.lectureResource.deleteMany({});
		await prisma.module.deleteMany({});
		await prisma.lectureSpecialty.deleteMany({});
		console.log("✓ تم حذف كل محتوى المحاضرات (ملفات + مقاييس + تخصصات)\n");
	}

	// ========== 2) مطابقة الجامعات مع القائمة الرسمية ==========
	const dbUnis = await prisma.university.findMany();
	const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

	const matchedIds = new Set<string>();
	const pairs: { official: UniversityRow; dbId: string | null }[] = [];
	for (const o of officials) {
		const hit =
			dbUnis.find((d) => norm(d.slug) === norm(o.slug) && !matchedIds.has(d.id)) ??
			dbUnis.find((d) => norm(d.name) === norm(o.name) && !matchedIds.has(d.id)) ??
			dbUnis.find((d) => norm(d.nameAr) === norm(o.nameAr) && !matchedIds.has(d.id));
		if (hit) matchedIds.add(hit.id);
		pairs.push({ official: o, dbId: hit?.id ?? null });
	}

	// ========== 3) حذف الجامعات الزائدة (غير الرسمية) ==========
	const extras = dbUnis.filter((d) => !matchedIds.has(d.id));
	let extraDeleted = 0;
	let extraKept = 0;
	for (const e of extras) {
		const topics = await prisma.topic.count({ where: { universityId: e.id } });
		if (topics > 0) {
			extraKept++;
			console.log(
				`⚠ تُترك (مرتبطة بـ ${topics} موضوع دكتوراه): ${e.nameAr || e.name} — لن تظهر في /lectures`,
			);
		} else {
			extraDeleted++;
			console.log(`− حذف جامعة زائدة: ${e.nameAr || e.name} (${e.slug})`);
			if (APPLY) await prisma.university.delete({ where: { id: e.id } });
		}
	}

	// ========== 4) تصحيح/إنشاء الـ 62 الرسمية + الشعارات ==========
	let fixed = 0;
	let created = 0;
	let logosSet = 0;
	for (const { official: o, dbId } of pairs) {
		const logo = logoFor(o);
		if (!dbId) {
			created++;
			if (logo) logosSet++;
			console.log(`+ إنشاء: ${o.nameAr} (${o.slug})`);
			if (APPLY)
				await prisma.university.create({
					data: {
						name: o.name,
						nameAr: o.nameAr,
						slug: o.slug,
						city: o.city,
						logoUrl: logo,
					},
				});
			continue;
		}
		const cur = dbUnis.find((d) => d.id === dbId)!;
		const patch: Record<string, string> = {};
		if (cur.name !== o.name) patch.name = o.name;
		if (cur.nameAr !== o.nameAr) patch.nameAr = o.nameAr;
		if (cur.slug !== o.slug) patch.slug = o.slug;
		if ((cur.city ?? "") !== o.city) patch.city = o.city;
		if (logo && (FORCE_LOGOS || !cur.logoUrl?.trim())) {
			patch.logoUrl = logo;
			logosSet++;
		}
		if (Object.keys(patch).length) {
			fixed++;
			console.log(
				`~ تصحيح: ${o.nameAr} (${Object.keys(patch).join(", ")})`,
			);
			if (APPLY) {
				try {
					await prisma.university.update({
						where: { id: dbId },
						data: patch,
					});
				} catch (err) {
					// تعارض في name/slug الفريدين — نحاول بدونهما
					console.log(
						`  ⚠ تعذر تحديث كامل لـ ${o.slug} (تعارض فرادة) — تحديث جزئي`,
					);
					delete patch.name;
					delete patch.slug;
					if (Object.keys(patch).length)
						await prisma.university.update({
							where: { id: dbId },
							data: patch,
						});
				}
			}
		}
	}

	console.log("\n===== الحصيلة =====");
	console.log(`محذوف: ${nRes} ملف — ${nMod} مقياس — ${nSpec} تخصص`);
	console.log(
		`جامعات: ${created} مُنشأة — ${fixed} مُصححة — ${extraDeleted} محذوفة — ${extraKept} متروكة (لها مواضيع)`,
	);
	console.log(`شعارات مضبوطة: ${logosSet}`);
	if (!APPLY)
		console.log(
			"\n⚠ وضع المعاينة فقط — لم يُكتب ولم يُحذف شيء. أضف --apply للتنفيذ.",
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
