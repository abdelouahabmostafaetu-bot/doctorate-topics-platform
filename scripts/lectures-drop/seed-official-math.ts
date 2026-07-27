/**
 * زرع البيانات الرسمية لقسم المحاضرات — شعبتا الرياضيات والرياضيات التطبيقية.
 * المصدر: scripts/lectures-drop/official/math-programs.json
 * (مبني على الإطار الوطني للمؤهلات والشهادات CNC — cnc.mesrs.dz)
 *
 * يزرع:
 *   1. كل الجامعات والمراكز الجامعية (بدون تكرار: يطابق slug أو name أو nameAr)
 *   2. تخصصات L3 وM1 وM2 الرسمية لكل جامعة
 *   3. (اختياري --with-modules) المقاييس الرسمية لكل مستوى وتخصص
 *
 * الاستعمال (من جذر المشروع):
 *   npx tsx scripts/lectures-drop/seed-official-math.ts                    ← معاينة فقط (dry)
 *   npx tsx scripts/lectures-drop/seed-official-math.ts --apply
 *   npx tsx scripts/lectures-drop/seed-official-math.ts --apply --with-modules
 *   npx tsx scripts/lectures-drop/seed-official-math.ts --apply --univ usthb
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
const WITH_MODULES = process.argv.includes("--with-modules");
const ONLY_UNIV = arg("univ")?.toLowerCase();

type Level = "L1" | "L2" | "L3" | "M1" | "M2";

type UniversityRow = {
	slug: string;
	name: string;
	nameAr: string;
	city: string;
};

type L3Specialty = {
	filiere: string;
	name: string;
	aliases?: string[];
	semesters: Record<string, string[]>;
};

type MasterSpecialty = {
	filiere: string;
	name: string;
	aliases?: string[];
	M1: string[];
	M2: string[];
};

type Dataset = {
	universities: UniversityRow[];
	licence: {
		L1: { semesters: Record<string, string[]> };
		L2: { semesters: Record<string, string[]> };
		L3: { specialties: L3Specialty[] };
	};
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

	// خطط التخصصات: L3 + M1 + M2 (المقاييس مرفقة مع رقم السداسي)
	type SpecPlan = {
		level: Level;
		name: string;
		modules: { name: string; semester: number }[];
	};
	const specPlans: SpecPlan[] = [];
	for (const s of data.licence.L3.specialties) {
		const modules: { name: string; semester: number }[] = [];
		for (const [sem, mods] of Object.entries(s.semesters)) {
			for (const m of mods) modules.push({ name: m, semester: Number(sem) });
		}
		specPlans.push({ level: "L3", name: s.name, modules });
	}
	for (const sp of data.masters) {
		specPlans.push({
			level: "M1",
			name: sp.name,
			modules: sp.M1.map((m) => ({ name: m, semester: 1 })),
		});
		specPlans.push({
			level: "M2",
			name: sp.name,
			modules: sp.M2.map((m) => ({ name: m, semester: 3 })),
		});
	}

	// مقاييس الجذع المشترك (بدون تخصص): L1 + L2
	const commonModules: { level: Level; name: string; semester: number }[] = [];
	for (const [level, block] of [
		["L1", data.licence.L1],
		["L2", data.licence.L2],
	] as const) {
		for (const [sem, mods] of Object.entries(block.semesters)) {
			for (const m of mods)
				commonModules.push({ level, name: m, semester: Number(sem) });
		}
	}

	let uniCreated = 0;
	let uniUpdated = 0;
	let specCreated = 0;
	let modCreated = 0;

	const universities = data.universities.filter(
		(u) => !ONLY_UNIV || u.slug === ONLY_UNIV,
	);
	if (!universities.length) {
		console.error(`لا توجد جامعة بالرمز: ${ONLY_UNIV}`);
		process.exit(1);
	}

	for (const u of universities) {
		// 1) الجامعة — مطابقة بالرمز أو الاسم الفرنسي أو العربي حتى لا نكرر
		let uni = await prisma.university.findFirst({
			where: {
				OR: [{ slug: u.slug }, { name: u.name }, { nameAr: u.nameAr }],
			},
		});
		if (!uni) {
			uniCreated++;
			console.log(`+ جامعة: ${u.nameAr} (${u.slug})`);
			if (APPLY) {
				uni = await prisma.university.create({
					data: {
						name: u.name,
						nameAr: u.nameAr,
						slug: u.slug,
						city: u.city,
					},
				});
			}
		} else {
			const patch: { nameAr?: string; city?: string } = {};
			if (!uni.nameAr?.trim() && u.nameAr) patch.nameAr = u.nameAr;
			if (!uni.city?.trim() && u.city) patch.city = u.city;
			if (Object.keys(patch).length) {
				uniUpdated++;
				console.log(`~ تحديث جامعة: ${uni.name}`);
				if (APPLY)
					await prisma.university.update({
						where: { id: uni.id },
						data: patch,
					});
			}
		}

		const uniId = uni?.id ?? null;

		// 2) التخصصات الرسمية L3 / M1 / M2
		for (const plan of specPlans) {
			let spec =
				uniId &&
				(await prisma.lectureSpecialty.findFirst({
					where: {
						universityId: uniId,
						level: plan.level as never,
						name: plan.name,
					},
				}));
			if (!spec) {
				specCreated++;
				if (APPLY && uniId) {
					const base = `${u.slug}-${plan.level.toLowerCase()}-${slugify(plan.name)}`;
					let slug = base;
					let n = 2;
					while (
						await prisma.lectureSpecialty.findUnique({ where: { slug } })
					) {
						slug = `${base}-${n++}`;
					}
					spec = await prisma.lectureSpecialty.create({
						data: {
							name: plan.name,
							slug,
							level: plan.level as never,
							universityId: uniId,
						},
					});
				}
			}

			// 3) مقاييس التخصص (اختياري)
			if (WITH_MODULES && uniId) {
				for (const m of plan.modules) {
					const exists = spec
						? await prisma.module.findFirst({
								where: {
									universityId: uniId,
									level: plan.level as never,
									name: m.name,
									lectureSpecialtyId: spec.id,
								},
							})
						: null;
					if (!exists) {
						modCreated++;
						if (APPLY && spec) {
							await prisma.module.create({
								data: {
									name: m.name,
									slug: `${u.slug}-${plan.level.toLowerCase()}-s${m.semester}-${slugify(m.name)}`,
									level: plan.level as never,
									semester: m.semester,
									universityId: uniId,
									lectureSpecialtyId: spec.id,
								},
							});
						}
					}
				}
			}
		}

		// 4) مقاييس الجذع المشترك L1 / L2 (اختياري)
		if (WITH_MODULES && uniId) {
			for (const m of commonModules) {
				const exists = await prisma.module.findFirst({
					where: {
						universityId: uniId,
						level: m.level as never,
						name: m.name,
						lectureSpecialtyId: null,
					},
				});
				if (!exists) {
					modCreated++;
					if (APPLY) {
						await prisma.module.create({
							data: {
								name: m.name,
								slug: `${u.slug}-${m.level.toLowerCase()}-s${m.semester}-${slugify(m.name)}`,
								level: m.level as never,
								semester: m.semester,
								universityId: uniId,
							},
						});
					}
				}
			}
		}
	}

	console.log("\n===== الحصيلة =====");
	console.log(`جامعات جديدة: ${uniCreated} — محدّثة: ${uniUpdated}`);
	console.log(`تخصصات جديدة: ${specCreated}`);
	if (WITH_MODULES) console.log(`مقاييس جديدة: ${modCreated}`);
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
