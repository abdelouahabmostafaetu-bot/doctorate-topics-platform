/**
 * استيراد جماعي للمحاضرات من مواقع e-learning الجامعية (Moodle)
 * يعمل مع كل مواقع الجامعات الجزائرية (كلها Moodle)
 *
 * أسرع طريقة — أمر واحد يستورد كل المستويات تلقائيًا (استعمل رابط تصنيف التخصص الرئيسي مثل Mathématiques):
 *   npx tsx scripts/import-moodle.ts --url "https://elearning.univ-mila.dz/a2026/course/index.php?categoryid=18" --univ mila --all --download
 *
 * أوامر أخرى:
 *  1) استكشاف فقط (لا يكتب شيئًا):
 *     npx tsx scripts/import-moodle.ts --url "...categoryid=18"
 *  2) استيراد مستوى واحد محدد:
 *     npx tsx scripts/import-moodle.ts --url "...categoryid=XX" --univ mila --level L1 --download
 *  3) إذا كانت الملفات تتطلب تسجيل دخول: سجّل دخولك في المتصفح، انسخ قيمة
 *     الكوكي MoodleSession (F12 > Application > Cookies) وأضف:
 *     --cookie "MoodleSession=abc123"
 *
 * خيارات:
 *   --all                (اكتشاف كل المستويات L1..M2 من التصنيفات الفرعية واستيرادها كلها)
 *   --download           (تحميل الملفات ورفعها إلى R2)
 *   --semester 1|2       (إذا لم يُحدد، يُكتشف تلقائيًا من S1/S2 في اسم الدرس، وإلا 1)
 *   --specialty <slug>   (ربط الموديلات بتخصص محاضرات موجود — مع --level فقط)
 *   --dry                (عرض ما سيحدث دون كتابة أي شيء)
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ---------- تحميل .env يدويًا (tsx لا يحمّله تلقائيًا) ----------
for (const f of [".env.local", ".env"]) {
	const p = path.join(process.cwd(), f);
	if (!fs.existsSync(p)) continue;
	for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		let v = m[2];
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		if (!process.env[m[1]]) process.env[m[1]] = v;
	}
}

// ---------- قراءة الخيارات ----------
function arg(name: string): string | undefined {
	const i = process.argv.indexOf("--" + name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes("--" + name);

const URL_ARG = arg("url");
const UNIV_SLUG = arg("univ");
const LEVEL = (arg("level") || "").toUpperCase();
const SEMESTER_ARG = arg("semester");
const SPECIALTY_SLUG = arg("specialty");
const COOKIE = arg("cookie");
const DOWNLOAD = flag("download");
const ALL = flag("all");
const DRY = flag("dry");
const MAX_FILE = 80 * 1024 * 1024; // 80 م.ب للملف الواحد
const LEVELS_OK = ["L1", "L2", "L3", "M1", "M2"] as const;
type LevelKey = (typeof LEVELS_OK)[number];

if (!URL_ARG) {
	console.log('❗ مرر رابط التصنيف: --url "https://elearning.univ-xxx.dz/.../course/index.php?categoryid=NN"');
	process.exit(1);
}

// ---------- أدوات HTML ----------
function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
		.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const HEADERS: Record<string, string> = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
	"Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
	...(COOKIE ? { Cookie: COOKIE } : {}),
};

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
	const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
	return { html: await res.text(), finalUrl: res.url };
}

// ---------- تحليل صفحة تصنيف Moodle ----------
type Course = { id: string; name: string; url: string };
type SubCat = { id: string; name: string; url: string };

function parseCategoryPage(html: string, baseUrl: string, currentCatId: string) {
	const courses = new Map<string, Course>();
	const subcats = new Map<string, SubCat>();
	const linkRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
	let m: RegExpExecArray | null;
	while ((m = linkRe.exec(html))) {
		const href = decodeEntities(m[1]);
		const text = stripTags(m[2]);
		if (!text) continue;
		const cm = href.match(/course\/view\.php\?id=(\d+)/);
		if (cm) {
			const abs = new URL(href, baseUrl).toString();
			if (!courses.has(cm[1])) courses.set(cm[1], { id: cm[1], name: text, url: abs });
			continue;
		}
		const sm = href.match(/course\/index\.php\?categoryid=(\d+)/);
		if (sm && sm[1] !== currentCatId && !href.includes("lang=") && !href.includes("page=")) {
			const abs = new URL(href, baseUrl).toString();
			if (!subcats.has(sm[1])) subcats.set(sm[1], { id: sm[1], name: text, url: abs });
		}
	}
	// أرقام الصفحات (pagination)
	let maxPage = 0;
	const pageRe = /categoryid=\d+(?:&amp;|&)[^"]*page=(\d+)/g;
	while ((m = pageRe.exec(html))) maxPage = Math.max(maxPage, Number(m[1]));
	return { courses, subcats, maxPage };
}

/** جلب تصنيف كاملًا (مع كل صفحاته) */
async function fetchCategory(url: string) {
	const catId = (url.match(/categoryid=(\d+)/) || [])[1] || "0";
	const first = await fetchHtml(url);
	const r = parseCategoryPage(first.html, first.finalUrl, catId);
	for (let p = 1; p <= r.maxPage; p++) {
		const sep = url.includes("?") ? "&" : "?";
		const pg = await fetchHtml(`${url}${sep}page=${p}`);
		const more = parseCategoryPage(pg.html, pg.finalUrl, catId);
		for (const [k, v] of more.courses) if (!r.courses.has(k)) r.courses.set(k, v);
	}
	return r;
}

/** جمع كل دروس تصنيف + تصنيفاته الفرعية (حتى عمق 2) */
async function collectCoursesDeep(url: string, depth = 0, seen = new Set<string>()): Promise<Map<string, Course>> {
	const catId = (url.match(/categoryid=(\d+)/) || [])[1] || "0";
	if (seen.has(catId)) return new Map();
	seen.add(catId);
	const { courses, subcats } = await fetchCategory(url);
	if (depth < 2) {
		for (const s of subcats.values()) {
			const inner = await collectCoursesDeep(s.url, depth + 1, seen);
			for (const [k, v] of inner) if (!courses.has(k)) courses.set(k, v);
		}
	}
	return courses;
}

// ---------- تخمين المستوى والنوع والسداسي ----------
function detectLevel(raw: string): LevelKey | null {
	const n = raw.toLowerCase();
	const tok = n.match(/\b(l\s*[123]|m\s*[12])\b/);
	if (tok) return tok[1].replace(/\s+/g, "").toUpperCase() as LevelKey;
	const isMaster = /master|ماستر/.test(n);
	const isLicence = /licence|ليسانس|ann[eé]e|سنة/.test(n);
	const d = n.match(/[123]/)?.[0];
	if (!d) return null;
	if (isMaster) return d === "2" ? "M2" : "M1";
	if (isLicence) return ("L" + d) as LevelKey;
	return null;
}
function guessType(name: string): string {
	const n = name.toLowerCase();
	if (/\btd\b|s[eé]rie|سلسلة/.test(n)) return "td";
	if (/\btp\b/.test(n)) return "tp";
	if (/exam|contr[oô]le|\bemd\b|rattrapage|امتحان/.test(n)) return "exam";
	if (/r[eé]sum[eé]|ملخص/.test(n)) return "resume";
	if (/livre|book|كتاب/.test(n)) return "book";
	return "cours";
}
function guessSemester(name: string): number | null {
	if (/\bs\s*[135]\b|semestre\s*[135]|السداسي\s*[135]/i.test(name)) return 1;
	if (/\bs\s*[246]\b|semestre\s*[246]|السداسي\s*[246]/i.test(name)) return 2;
	return null;
}
function slugify(input: string): string {
	return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "module";
}

// ---------- تحليل صفحة درس: روابط الملفات ----------
function parseCourseResources(html: string, baseUrl: string): Array<{ url: string; name: string }> {
	const out = new Map<string, { url: string; name: string }>();
	const re = /<a[^>]+href="([^"]*mod\/resource\/view\.php\?id=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		const name = stripTags(m[3]).replace(/\s*(Fichier|File|ملف)\s*$/i, "").trim();
		if (!out.has(m[2])) out.set(m[2], { url: new URL(decodeEntities(m[1]), baseUrl).toString(), name: name || "file" });
	}
	return [...out.values()];
}

// ---------- رفع إلى R2 ----------
function s3() {
	return new S3Client({
		region: "auto",
		endpoint: process.env.STORAGE_ENDPOINT,
		// مهم مع R2: بدونه SDK يبني رابطًا بنموذج bucket.endpoint الذي لا تدعمه R2 (يسبّب ENOTFOUND).
		forcePathStyle: true,
		credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "", secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "" },
	});
}

/** يعيد محاولة دالة async عند انقطاع الاتّصال (مثل انقطاع MongoDB المؤقت) بدلاً من إيقاف البرنامج كاملًا. */
async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
	let lastErr: unknown;
	for (let i = 1; i <= retries; i++) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			const msg = e instanceof Error ? e.message : String(e);
			console.log(`   ⚠️ محاولة ${i}/${retries} فشلت (${label}): ${msg.slice(0, 140)}`);
			if (i < retries) await new Promise((r) => setTimeout(r, 1500 * i));
		}
	}
	throw lastErr;
}
function publicUrlForKey(key: string): string {
	const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
	return base ? `${base}/${key}` : `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${key}`;
}

// ---------- استيراد مجموعة دروس لمستوى معين ----------
type Totals = { createdModules: number; skippedModules: number; uploadedFiles: number; lockedCourses: number };

async function importCourses(
	prisma: PrismaClient,
	universityId: string,
	adminId: string,
	level: LevelKey,
	courses: Map<string, Course>,
	lectureSpecialtyId: string | null,
	totals: Totals,
) {
	for (const course of courses.values()) {
	  try {
		const semester = Number(SEMESTER_ARG) === 2 ? 2 : Number(SEMESTER_ARG) === 1 ? 1 : (guessSemester(course.name) ?? 1);
		const existing = await withRetry(
			() => prisma.module.findFirst({ where: { universityId, level: level as never, name: course.name.slice(0, 120) } }),
			`findFirst ${course.name}`,
		);
		let moduleId = existing?.id ?? "";
		if (existing) {
			totals.skippedModules++;
			console.log(`⏭️  [${level}] موجود مسبقًا: ${course.name}`);
		} else if (DRY) {
			console.log(`🔍 [dry] [${level}] سيُنشأ موديل: ${course.name} (س${semester})`);
		} else {
			const mod = await withRetry(
				() =>
					prisma.module.create({
						data: {
							name: course.name.slice(0, 120),
							slug: `${slugify(course.name)}-${course.id}`,
							level: level as never,
							semester,
							universityId,
							lectureSpecialtyId,
						},
					}),
				`create ${course.name}`,
			);
			moduleId = mod.id;
			totals.createdModules++;
			console.log(`✅ [${level}] موديل جديد: ${course.name} (س${semester})`);
		}

		if (!DOWNLOAD || DRY || !moduleId) continue;

		// محاولة جلب ملفات الدرس
		const coursePage = await fetchHtml(course.url);
		if (/login\/index\.php|enrol\/index\.php/.test(coursePage.finalUrl)) {
			totals.lockedCourses++;
			console.log(`   🔒 يتطلب تسجيل دخول — جرب --cookie "MoodleSession=..."`);
			continue;
		}
		const resources = parseCourseResources(coursePage.html, coursePage.finalUrl);
		for (const r of resources) {
			try {
				const res = await fetch(r.url, { headers: HEADERS, redirect: "follow" });
				const ct = res.headers.get("content-type") || "";
				if (!res.ok || ct.includes("text/html")) { console.log(`   🔒 مقفل: ${r.name}`); continue; }
				const buf = Buffer.from(await res.arrayBuffer());
				if (buf.length === 0 || buf.length > MAX_FILE) { console.log(`   ⚠️ حجم غير مناسب: ${r.name}`); continue; }
				const urlName = decodeURIComponent((res.url.split("/").pop() || "").split("?")[0]) || `${r.name}.pdf`;
				const dup = await withRetry(
					() => prisma.lectureResource.findFirst({ where: { moduleId, title: r.name.slice(0, 150) } }),
					`dup-check ${r.name}`,
				);
				if (dup) { console.log(`   ⏭️ ملف موجود: ${r.name}`); continue; }
				const safe = urlName.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80);
				const key = `lectures/moodle/${course.id}-${Date.now()}-${safe}`;
				await withRetry(
					() => s3().send(new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET!, Key: key, Body: buf, ContentType: ct || "application/octet-stream" })),
					`upload ${r.name}`,
				);
				await withRetry(
					() =>
						prisma.lectureResource.create({
							data: {
								title: r.name.slice(0, 150),
								type: guessType(r.name) as never,
								moduleId,
								fileUrl: publicUrlForKey(key),
								fileName: urlName.slice(0, 200),
								fileSizeBytes: buf.length,
								mimeType: ct.split(";")[0] || undefined,
								uploadedById: adminId,
							},
						}),
					`save-record ${r.name}`,
				);
				totals.uploadedFiles++;
				console.log(`   📦 رُفع: ${r.name} (${(buf.length / 1048576).toFixed(1)} م.ب)`);
			} catch (e) {
				console.log(`   ⚠️ خطأ في ${r.name}: ${e instanceof Error ? e.message : e}`);
			}
		}
	  } catch (e) {
		console.log(`⚠️ تعذّر معالجة درس "${course.name}" (سيتم تجاوزه والمتابعة): ${e instanceof Error ? e.message : e}`);
		continue;
	  }
	}
}

// ---------- البرنامج الرئيسي ----------
async function main() {
	console.log(`\n🌐 جلب التصنيف ...`);
	const root = await fetchCategory(URL_ARG!);

	console.log(`\n📂 تصنيفات فرعية (${root.subcats.size}):`);
	for (const s of root.subcats.values()) {
		const lvl = detectLevel(s.name);
		console.log(`   [${s.id}] ${s.name}${lvl ? `  → ${lvl}` : ""}\n        ${s.url}`);
	}
	console.log(`\n📖 دروس مباشرة في هذه الصفحة (${root.courses.size}):`);
	for (const c of root.courses.values()) console.log(`   [${c.id}] ${c.name}`);

	if (!UNIV_SLUG || (!LEVEL && !ALL)) {
		console.log(`\nℹ️  وضع الاستكشاف فقط — لم يُكتب شيء.`);
		console.log(`   لاستيراد كل المستويات دفعة واحدة: أضف --univ <slug> --all --download`);
		console.log(`   لمستوى واحد فقط: أضف --univ <slug> --level L1|L2|L3|M1|M2 --download`);
		return;
	}
	if (!ALL && !LEVELS_OK.includes(LEVEL as LevelKey)) {
		console.log(`❗ مستوى غير صالح: ${LEVEL} — استعمل L1 أو L2 أو L3 أو M1 أو M2`);
		return;
	}

	const prisma = new PrismaClient();
	try {
		const university = await prisma.university.findUnique({ where: { slug: UNIV_SLUG } });
		if (!university) {
			const all = await prisma.university.findMany({ select: { slug: true, nameAr: true }, orderBy: { slug: "asc" } });
			console.log(`❗ لا توجد جامعة بالمعرف "${UNIV_SLUG}". المعرفات المتاحة:`);
			for (const u of all) console.log(`   ${u.slug}  (${u.nameAr ?? ""})`);
			return;
		}
		let lectureSpecialtyId: string | null = null;
		if (SPECIALTY_SLUG && !ALL) {
			const sp = await prisma.lectureSpecialty.findUnique({ where: { slug: SPECIALTY_SLUG } });
			if (!sp) { console.log(`❗ لا يوجد تخصص محاضرات بالمعرف "${SPECIALTY_SLUG}"`); return; }
			lectureSpecialtyId = sp.id;
		}
		const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
		if (!admin) { console.log("❗ لا يوجد حساب SUPER_ADMIN في قاعدة البيانات."); return; }

		const totals: Totals = { createdModules: 0, skippedModules: 0, uploadedFiles: 0, lockedCourses: 0 };

		if (ALL) {
			// وضع كل المستويات: اكتشاف المستوى من اسم كل تصنيف فرعي ثم استيراده كاملًا
			const unmatched: string[] = [];
			for (const s of root.subcats.values()) {
				const lvl = detectLevel(s.name);
				if (!lvl) { unmatched.push(`[${s.id}] ${s.name}`); continue; }
				console.log(`\n🚀 استيراد «${s.name}» كمستوى ${lvl} ...`);
				const courses = await collectCoursesDeep(s.url);
				console.log(`   📖 ${courses.size} درس`);
				await importCourses(prisma, university.id, admin.id, lvl, courses, null, totals);
			}
			if (root.courses.size > 0) console.log(`\nℹ️  ${root.courses.size} درس في التصنيف الرئيسي بلا مستوى واضح — استوردها يدويًا بـ --level`);
			if (unmatched.length > 0) {
				console.log(`\n⚠️ تصنيفات لم أتعرف على مستواها (استوردها يدويًا بـ --level):`);
				for (const u of unmatched) console.log(`   ${u}`);
			}
		} else {
			if (root.courses.size === 0 && root.subcats.size > 0) {
				console.log(`\n❗ لا توجد دروس مباشرة هنا — أجمع أيضًا من التصنيفات الفرعية ...`);
				const deep = await collectCoursesDeep(URL_ARG!);
				await importCourses(prisma, university.id, admin.id, LEVEL as LevelKey, deep, lectureSpecialtyId, totals);
			} else {
				await importCourses(prisma, university.id, admin.id, LEVEL as LevelKey, root.courses, lectureSpecialtyId, totals);
			}
		}

		console.log(`\n🎯 النتيجة: ${totals.createdModules} موديل جديد · ${totals.skippedModules} موجود مسبقًا · ${totals.uploadedFiles} ملف مرفوع · ${totals.lockedCourses} درس مقفل`);
		if (totals.lockedCourses > 0 && !COOKIE) console.log(`💡 لفتح الدروس المقفلة: سجّل دخولك في الموقع بالمتصفح ثم أضف --cookie "MoodleSession=القيمة"`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((e) => { console.error(e); process.exit(1); });
