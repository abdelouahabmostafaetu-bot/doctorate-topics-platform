/**
 * إنشاء شجرة مجلدات فارغة (مكتبة المحاضرات) من المرجع الرسمي
 * scripts/lectures-drop/official/math-programs.json — بدون قاعدة بيانات ولا إنترنت.
 *
 * البنية الناتجة (متوافقة مع import-drop.ts):
 *   <root>/<univSlug>/<L1|L2>/<Module>/
 *   <root>/<univSlug>/<L3|M1|M2>/<Specialty>/<Module>/
 *
 * الاستعمال:
 *   node scripts/lectures-drop/scaffold-official.mjs --root "D:\lectures-library"
 *   node scripts/lectures-drop/scaffold-official.mjs --root "D:\lectures-library" --univ usthb
 */
import fs from "node:fs";
import path from "node:path";

function arg(name) {
	const i = process.argv.indexOf("--" + name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

const ROOT = arg("root") || "D:\\lectures-library";
const ONLY_UNIV = (arg("univ") || "").toLowerCase();

const dataPath = path.join(
	process.cwd(),
	"scripts",
	"lectures-drop",
	"official",
	"math-programs.json",
);
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

/** تنظيف اسم المجلد ليكون صالحا على Windows */
function safeDir(name) {
	return name
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/[. ]+$/g, "");
}

let dirs = 0;
function mk(...parts) {
	const p = path.join(ROOT, ...parts.map(safeDir));
	fs.mkdirSync(p, { recursive: true });
	dirs++;
	return p;
}

fs.mkdirSync(ROOT, { recursive: true });

const L1 = Object.values(data.licence.L1.semesters).flat();
const L2 = Object.values(data.licence.L2.semesters).flat();

const univs = data.universities.filter(
	(u) => !ONLY_UNIV || u.slug === ONLY_UNIV,
);

for (const u of univs) {
	mk(u.slug);
	fs.writeFileSync(
		path.join(ROOT, u.slug, "_UNIVERSITY.txt"),
		`${u.name}\n${u.nameAr}\n${u.city}\n`,
		"utf8",
	);

	// L1 / L2 : مقاييس مباشرة تحت المستوى (جذع مشترك)
	for (const m of L1) mk(u.slug, "L1", m);
	for (const m of L2) mk(u.slug, "L2", m);

	// L3 : تخصص / مقياس
	for (const s of data.licence.L3.specialties) {
		const mods = Object.values(s.semesters).flat();
		for (const m of mods) mk(u.slug, "L3", s.name, m);
	}

	// M1 / M2 : تخصص / مقياس
	for (const sp of data.masters) {
		for (const m of sp.M1) mk(u.slug, "M1", sp.name, m);
		for (const m of sp.M2) mk(u.slug, "M2", sp.name, m);
	}
}

fs.writeFileSync(
	path.join(ROOT, "UNIVERSITIES.txt"),
	data.universities.map((u) => `${u.slug}\t${u.name}\t${u.nameAr}`).join("\n") + "\n",
	"utf8",
);
fs.writeFileSync(
	path.join(ROOT, "HOW_TO_ADD.txt"),
	[
		"ضع ملفات PDF داخل مجلد المقياس المناسب:",
		"  <جامعة>/<L1|L2>/<المقياس>/ملف.pdf",
		"  <جامعة>/<L3|M1|M2>/<التخصص>/<المقياس>/ملف.pdf",
		"يمكنك إنشاء مجلدات فرعية داخل المقياس (مثل cours أو td أو exam) وستُحفظ كما هي.",
		"ثم نفّذ من مجلد المشروع:",
		'  npx tsx scripts/lectures-drop/import-drop.ts --root "D:\\lectures-library" --dry',
		'  npx tsx scripts/lectures-drop/import-drop.ts --root "D:\\lectures-library"',
	].join("\n"),
	"utf8",
);

console.log(`✓ تم إنشاء ${dirs} مجلدا لـ ${univs.length} جامعة في: ${ROOT}`);
