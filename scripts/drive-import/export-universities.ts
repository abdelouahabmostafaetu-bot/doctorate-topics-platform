/**
 * يصدّر جامعات + تخصصات المحاضرات من قاعدة الموقع حتى يستخدمها Kimi للمطابقة.
 * تشغيل: npx tsx scripts/drive-import/export-universities.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

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

const outDir = path.join(process.cwd(), "scripts/drive-import/out");
fs.mkdirSync(outDir, { recursive: true });

const prisma = new PrismaClient();

async function main() {
	const universities = await prisma.university.findMany({
		orderBy: { name: "asc" },
		select: {
			id: true,
			name: true,
			nameAr: true,
			slug: true,
			city: true,
		},
	});
	const lectureSpecialties = await prisma.lectureSpecialty.findMany({
		orderBy: { name: "asc" },
		select: {
			id: true,
			name: true,
			slug: true,
			level: true,
			universityId: true,
			university: { select: { slug: true, name: true, nameAr: true } },
		},
	});
	const modules = await prisma.module.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
			level: true,
			semester: true,
			university: { select: { slug: true } },
			lectureSpecialty: { select: { slug: true, name: true } },
		},
		take: 2000,
	});

	const payload = {
		exportedAt: new Date().toISOString(),
		universities,
		lectureSpecialties,
		existingModules: modules.map((m) => ({
			name: m.name,
			slug: m.slug,
			level: m.level,
			semester: m.semester,
			universitySlug: m.university.slug,
			specialtySlug: m.lectureSpecialty?.slug ?? null,
			specialtyName: m.lectureSpecialty?.name ?? null,
		})),
	};

	const out = path.join(outDir, "universities.json");
	fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
	console.log(
		`OK universities=${universities.length} specialties=${lectureSpecialties.length} modules=${modules.length}`,
	);
	console.log(out);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
