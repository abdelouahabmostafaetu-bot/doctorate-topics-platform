/**
 * import-exams-bulk.mjs — استيراد مجمّع (Bulk) لعدة امتحانات في تشغيل واحد.
 *
 * الاستخدام:
 *   node scripts/import-exams-bulk.mjs                       # كل ملفات data/exams/*.json
 *   node scripts/import-exams-bulk.mjs data/exams/us-ou      # مجلد محدد
 *   node scripts/import-exams-bulk.mjs a.json b.json         # ملفات محددة
 *   node scripts/import-exams-bulk.mjs --dry-run             # تحقق فقط بدون أي كتابة في قاعدة البيانات
 *   node scripts/import-exams-bulk.mjs --status=draft        # حالة النشر (published افتراضيًا)
 *
 * الخصائص:
 * - آمن لإعادة التشغيل (idempotent): يتخطى أي امتحان إذا كان slug موجودًا مسبقًا.
 * - ينشئ الجامعة/التخصص تلقائيًا إن لم يكونا موجودين (upsert) مع تخزين مؤقت داخل نفس التشغيل.
 * - تسلسلي دائمًا (ملف بعد ملف) لتفادي خطأ `universities_name_key` عند إنشاء نفس الجامعة بالتوازي.
 * - عزل الأخطاء: ملف واحد فاسد لا يوقف بقية الملفات.
 * - يرفض كتابة أي `remark` يبدأ بـ "Source:" — سياسة الموقع: المصدر يوضع في `source` وليس في الملاحظة.
 * - تقرير نهائي: مستورد / موجود مسبقًا / فاشل + عدد التمارين + روابط الامتحانات.
 *
 * صيغة ملف JSON: انظر docs/EXAM-JSON-FORMAT.md
 */
import { config } from "dotenv"
config({ path: ".env" })

import dns from "node:dns"
dns.setServers(["8.8.8.8", "1.1.1.1"])

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve, basename } from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ALLOWED_STATUS = ["draft", "published", "needs_completion"]
const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"]
const DEFAULT_DIR = "data/exams"

function slugify(input) {
	return String(input)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

// ---------- قراءة المعطيات من سطر الأوامر ----------
const argv = process.argv.slice(2)
const DRY_RUN = argv.includes("--dry-run")
const statusFlag = argv.find((a) => a.startsWith("--status="))
const STATUS = statusFlag ? statusFlag.split("=")[1].trim() : "published"
if (!ALLOWED_STATUS.includes(STATUS)) {
	console.error(`❌ حالة غير صالحة: ${STATUS} — المسموح: ${ALLOWED_STATUS.join(" | ")}`)
	process.exit(1)
}
const inputs = argv.filter((a) => !a.startsWith("--"))
const targets = inputs.length ? inputs : [DEFAULT_DIR]

function collectFiles(list) {
	const files = []
	for (const p of list) {
		const abs = resolve(p)
		let st
		try {
			st = statSync(abs)
		} catch {
			console.warn(`⚠️ مسار غير موجود، تم تخطيه: ${p}`)
			continue
		}
		if (st.isDirectory()) {
			for (const name of readdirSync(abs).sort()) {
				if (name.toLowerCase().endsWith(".json")) files.push(join(abs, name))
			}
		} else if (abs.toLowerCase().endsWith(".json")) {
			files.push(abs)
		} else {
			console.warn(`⚠️ ليس ملف JSON، تم تخطيه: ${p}`)
		}
	}
	return [...new Set(files)]
}

// ---------- تخزين مؤقت للجامعات والتخصصات ----------
const uniCache = new Map()
const specCache = new Map()

async function resolveUniversity(data) {
	const name = String(data.university?.name ?? "").trim()
	if (!name) throw new Error("حقل university.name مطلوب في ملف JSON")
	if (uniCache.has(name)) return uniCache.get(name)

	const wanted = {
		name,
		nameAr: data.university?.nameAr ?? name,
		slug: data.university?.slug ?? slugify(name),
	}

	let record
	if (DRY_RUN) {
		record = (await prisma.university.findUnique({ where: { name } })) ?? {
			id: "(dry-run)",
			...wanted,
			__willCreate: true,
		}
	} else {
		record = await prisma.university.upsert({
			where: { name },
			update: {},
			create: wanted,
		})
	}
	uniCache.set(name, record)
	return record
}

async function resolveSpecialty(data) {
	const name = String(data.specialty?.name ?? "Mathematics").trim()
	if (specCache.has(name)) return specCache.get(name)

	const wanted = {
		name,
		nameAr: data.specialty?.nameAr ?? name,
		slug: data.specialty?.slug ?? slugify(name),
	}

	let record
	if (DRY_RUN) {
		record = (await prisma.specialty.findUnique({ where: { name } })) ?? {
			id: "(dry-run)",
			...wanted,
			__willCreate: true,
		}
	} else {
		record = await prisma.specialty.upsert({
			where: { name },
			update: {},
			create: wanted,
		})
	}
	specCache.set(name, record)
	return record
}

// ---------- تنظيف الملاحظات ----------
// سياسة الموقع: لا يُكتب المصدر داخل remark أبدًا (يُعرض للزوار). المصدر يوضع في source.
function cleanRemark(raw, warnings, label) {
	if (!raw) return null
	const text = String(raw).trim()
	if (!text) return null
	if (/^source\s*:/i.test(text) || /^المصدر\s*:/.test(text)) {
		warnings.push(`${label}: تم حذف ملاحظة "Source: …" (سياسة الملاحظات)`)
		return null
	}
	return text
}

// ---------- استيراد ملف واحد ----------
async function importFile(file) {
	const warnings = []
	const raw = readFileSync(file, "utf8")
	let data
	try {
		data = JSON.parse(raw)
	} catch (e) {
		throw new Error(`JSON غير صالح: ${e.message}`)
	}

	const year = Number(data.year)
	if (!Number.isFinite(year)) throw new Error("حقل year مطلوب (رقم)")

	const examType = data.examType === "specialty" ? "specialty" : "general"
	const examNumber = Number(data.examNumber) || 1
	const paddedNumber = String(examNumber).padStart(2, "0")

	const university = await resolveUniversity(data)
	const specialty = await resolveSpecialty(data)
	const uniName = university.name

	const slug =
		data.slug ?? `${university.slug}-${year}-${examType}-${paddedNumber}`

	const existing = await prisma.topic.findUnique({ where: { slug } })
	if (existing) return { status: "skipped", slug, warnings }

	const rawProblems = Array.isArray(data.problems) ? data.problems : []
	if (!rawProblems.length) throw new Error("لا توجد تمارين في ملف JSON")

	const problems = rawProblems.map((p, i) => {
		const problemNumber = Number(p.problemNumber) || i + 1
		const statement = String(p.statement ?? "").trim()
		if (!statement) {
			throw new Error(`التمرين رقم ${problemNumber}: حقل statement فارغ`)
		}
		const solution = p.solution ? String(p.solution) : null
		return {
			problemNumber,
			title: String(p.title ?? `تمرين ${i + 1}`),
			difficulty: ALLOWED_DIFFICULTY.includes(p.difficulty) ? p.difficulty : "medium",
			tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
			statement,
			solution,
			remark: cleanRemark(p.remark, warnings, `تمرين ${problemNumber}`),
			hasSolution: Boolean(solution && solution.trim()),
		}
	})

	const seen = new Set()
	for (const p of problems) {
		if (seen.has(p.problemNumber)) {
			warnings.push(`تكرار في problemNumber = ${p.problemNumber}`)
		}
		seen.add(p.problemNumber)
	}

	const payload = {
		slug,
		title:
			data.title ??
			`Concours Doctorat ${year} — ${uniName} — Épreuve N°${paddedNumber}`,
		examType,
		year,
		universityId: university.id,
		specialtyId: specialty.id,
		source: String(data.source ?? ""),
		examNumber,
		coefficient: data.coefficient ?? null,
		durationMinutes: data.durationMinutes ?? null,
		problems,
		files: [],
		status: data.status && ALLOWED_STATUS.includes(data.status) ? data.status : STATUS,
	}

	if (DRY_RUN) {
		return {
			status: "dry-run",
			slug,
			count: problems.length,
			topicStatus: payload.status,
			warnings,
		}
	}

	const topic = await prisma.topic.create({ data: payload })
	return {
		status: "imported",
		slug: topic.slug,
		count: problems.length,
		topicStatus: payload.status,
		warnings,
	}
}

// ---------- التشغيل ----------
async function main() {
	const files = collectFiles(targets)
	if (!files.length) {
		console.error(`❌ لا توجد ملفات JSON في: ${targets.join(", ")}`)
		process.exit(1)
	}

	console.log(
		`${DRY_RUN ? "🧪 تشغيل تجريبي (لا كتابة في قاعدة البيانات)" : "🚀 استيراد فعلي"} — ${files.length} ملف — الحالة الافتراضية: ${STATUS}\n`,
	)

	const imported = []
	const skipped = []
	const failed = []
	const allWarnings = []
	let totalProblems = 0

	// تسلسلي إلزاميًا: التوازي يسبب Unique constraint failed على universities_name_key
	for (const [i, file] of files.entries()) {
		const label = `[${i + 1}/${files.length}] ${basename(file)}`
		try {
			const res = await importFile(file)
			for (const w of res.warnings ?? []) allWarnings.push(`${basename(file)} → ${w}`)

			if (res.status === "skipped") {
				skipped.push(res.slug)
				console.log(`${label} ⏭️ موجود مسبقًا: ${res.slug}`)
			} else {
				imported.push({ slug: res.slug, count: res.count, topicStatus: res.topicStatus })
				totalProblems += res.count
				console.log(
					`${label} ${DRY_RUN ? "🧪 جاهز" : "✅ استُورد"}: ${res.slug} (${res.count} تمارين، ${res.topicStatus})`,
				)
			}
		} catch (e) {
			failed.push({ file: basename(file), error: e.message })
			console.error(`${label} ❌ ${e.message}`)
		}
	}

	console.log("\n──────── التقرير النهائي ────────")
	console.log(`${DRY_RUN ? "جاهز للاستيراد" : "مستورد"} : ${imported.length}`)
	console.log(`موجود مسبقًا     : ${skipped.length}`)
	console.log(`فاشل             : ${failed.length}`)
	console.log(`مجموع التمارين   : ${totalProblems}`)

	if (allWarnings.length) {
		console.log(`\n⚠️ تنبيهات (${allWarnings.length}):`)
		for (const w of allWarnings) console.log(`   - ${w}`)
	}

	if (failed.length) {
		console.log("\n❌ ملفات فاشلة:")
		for (const f of failed) console.log(`   - ${f.file}: ${f.error}`)
	}

	if (imported.length) {
		console.log("\n🔗 الروابط:")
		for (const t of imported) {
			console.log(`   https://www.docmathdz.dev/topics/${t.slug}`)
		}
	}

	if (failed.length) process.exitCode = 1
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => prisma.$disconnect())
