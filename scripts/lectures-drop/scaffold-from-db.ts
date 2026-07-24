/**
 * يقرأ جامعات الموقع من MongoDB/Prisma وينشئ:
 *   <root>/<univ-slug>/{L1,L2,L3,M1,M2}/
 * المجلدات الناقصة فقط — لا يمس ملفاتك الموجودة.
 *
 * npx tsx scripts/lectures-drop/scaffold-from-db.ts --root "D:\lectures-library"
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

function arg(name: string): string | undefined {
	const i = process.argv.indexOf("--" + name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

const LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;
const ROOT = arg("root") || path.join(process.cwd(), "lectures-library");

const prisma = new PrismaClient();

async function main() {
	fs.mkdirSync(ROOT, { recursive: true });
	const universities = await prisma.university.findMany({
		orderBy: { slug: "asc" },
		select: { slug: true, name: true, nameAr: true, city: true },
	});
	if (!universities.length) {
		console.error("لا توجد جامعات في قاعدة البيانات.");
		process.exit(1);
	}

	const outDir = path.join(process.cwd(), "scripts/lectures-drop/out");
	fs.mkdirSync(outDir, { recursive: true });
	fs.writeFileSync(
		path.join(outDir, "universities.json"),
		JSON.stringify({ exportedAt: new Date().toISOString(), universities }, null, 2),
		"utf8",
	);

	// فهرس مقروء داخل المكتبة
	const indexLines = [
		"# DocMath DZ — lectures-library",
		"# folder name = university slug on the website",
		"# inside each univ: L1 L2 L3 M1 M2",
		"# put files as: LEVEL / [Specialty]/ Module / [type]/ file.pdf",
		"",
	];
	let createdDirs = 0;
	for (const u of universities) {
		const slug = String(u.slug || "")
			.trim()
			.toLowerCase();
		if (!slug) continue;
		const uniDir = path.join(ROOT, slug);
		if (!fs.existsSync(uniDir)) {
			fs.mkdirSync(uniDir, { recursive: true });
			createdDirs++;
		}
		// README صغير داخل كل جامعة
		const uniReadme = path.join(uniDir, "_UNIVERSITY.txt");
		if (!fs.existsSync(uniReadme)) {
			fs.writeFileSync(
				uniReadme,
				[
					`slug: ${slug}`,
					`name: ${u.name}`,
					`nameAr: ${u.nameAr || ""}`,
					`city: ${u.city || ""}`,
					"",
					"Put PDFs under L1 / L2 / L3 / M1 / M2",
					"Example: L1/Analyse 1/cours/ch01.pdf",
					"Example L3: L3/My Specialty/My Module/td/serie1.pdf",
				].join("\n"),
				"utf8",
			);
		}
		for (const lv of LEVELS) {
			const d = path.join(uniDir, lv);
			if (!fs.existsSync(d)) {
				fs.mkdirSync(d, { recursive: true });
				createdDirs++;
			}
		}
		indexLines.push(
			`- ${slug}  |  ${u.nameAr || u.name}${u.city ? "  (" + u.city + ")" : ""}`,
		);
	}

	fs.writeFileSync(path.join(ROOT, "UNIVERSITIES.txt"), indexLines.join("\n") + "\n", "utf8");
	fs.writeFileSync(
		path.join(ROOT, "HOW_TO_ADD.txt"),
		[
			"How to add files (incremental)",
			"==============================",
			"",
			"1) Open the university folder (slug name).",
			"2) Open level: L1 L2 L3 M1 M2",
			"3) Create module folder, e.g. Analyse 1",
			"4) Optional type folder: cours | td | tp | resume | book | exam | other",
			"5) Drop PDF/ZIP inside",
			"",
			"With specialty (L3 / Master):",
			"  L3/Analyse Mathematique/Analyse Fonctionnelle/cours/file.pdf",
			"",
			"Then run:",
			'  npx tsx scripts/lectures-drop/import-drop.ts --root "D:\\lectures-library"',
			"",
			"Re-run anytime. Duplicates are skipped automatically.",
			"",
		].join("\n"),
		"utf8",
	);

	console.log(`OK root=${ROOT}`);
	console.log(`universities=${universities.length}  newDirs≈${createdDirs}`);
	console.log(`index: ${path.join(ROOT, "UNIVERSITIES.txt")}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
