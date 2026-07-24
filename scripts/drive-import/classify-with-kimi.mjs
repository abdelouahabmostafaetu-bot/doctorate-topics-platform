/**
 * يمرّ مجلدًا بمجلد ويستدعي Kimi K2.6 (Azure) لتصنيف الملفات الفوضوية.
 * node scripts/drive-import/classify-with-kimi.mjs [--limit 5] [--min-confidence 0.55]
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
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
}
loadEnv();

function arg(name) {
	const i = process.argv.indexOf("--" + name);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

const LIMIT = Number(arg("limit") || 0) || 0;
const MIN_CONF = Number(arg("min-confidence") || 0.45);
const outDir = path.join(process.cwd(), "scripts/drive-import/out");
const treePath = path.join(outDir, "tree.json");
const uniPath = path.join(outDir, "universities.json");

if (!fs.existsSync(treePath)) {
	console.error("missing tree.json — run scan-tree first");
	process.exit(1);
}
if (!fs.existsSync(uniPath)) {
	console.error("missing universities.json — run export-universities first");
	process.exit(1);
}

const tree = JSON.parse(fs.readFileSync(treePath, "utf8"));
const uniData = JSON.parse(fs.readFileSync(uniPath, "utf8"));

const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
const deployment =
	process.env.AZURE_OPENAI_DEPLOYMENT_KIMI ||
	process.env.AZURE_OPENAI_DEPLOYMENT ||
	"";

if (!endpoint || !apiKey || !deployment) {
	console.error(
		"Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_KIMI in .env",
	);
	process.exit(1);
}

const univList = (uniData.universities || [])
	.map(
		(u) =>
			`- slug=${u.slug} | name=${u.name} | ar=${u.nameAr || ""} | city=${u.city || ""}`,
	)
	.join("\n");

const specList = (uniData.lectureSpecialties || [])
	.slice(0, 400)
	.map(
		(s) =>
			`- slug=${s.slug} | name=${s.name} | level=${s.level} | univ=${s.university?.slug || s.universityId}`,
	)
	.join("\n");

const SYSTEM = `You are a careful data-labeler for DocMath DZ lecture library (Algerian math universities).
Map messy Google-Drive folder/file names into structured lecture metadata.

Rules:
- universitySlug MUST be one of the provided university slugs when possible. If truly unknown, null.
- level must be one of: L1, L2, L3, M1, M2, or null.
- type must be one of: cours, td, tp, resume, book, exam, other.
- specialtyName: only for L3/M1/M2 when a track exists; else null. Prefer matching an existing specialty name/slug.
- module: clean course/module name (e.g. "Analyse Fonctionnelle"), not the raw file name.
- title: clean human title for the file (Arabic or French/English OK).
- semester: 1 or 2 when guessable, else 1.
- confidence: 0..1 how sure you are for THIS file.
- skip: true only if the file is clearly not a lecture resource (random junk).
- Do NOT invent universities outside the list unless confidence is high and name is obvious; still prefer nearest slug.
- Return ONLY valid JSON (no markdown fences). Shape:
{
  "files": [
    {
      "relPath": "exact relPath from input",
      "universitySlug": "usthb" | null,
      "level": "L1" | null,
      "specialtyName": string | null,
      "specialtySlug": string | null,
      "module": string,
      "semester": 1,
      "type": "cours",
      "title": string,
      "confidence": 0.0,
      "skip": false,
      "notes": string
    }
  ]
}`;

async function callKimi(userContent) {
	const res = await fetch(endpoint + "/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"api-key": apiKey,
		},
		body: JSON.stringify({
			model: deployment,
			temperature: 0.1,
			max_tokens: 4000,
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: userContent },
			],
		}),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`Kimi HTTP ${res.status}: ${text.slice(0, 400)}`);
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error("Invalid JSON from Azure: " + text.slice(0, 200));
	}
	const content = data.choices?.[0]?.message?.content || "";
	return content;
}

function extractJson(s) {
	const t = String(s || "").trim();
	const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const body = fence ? fence[1] : t;
	const start = body.indexOf("{");
	const end = body.lastIndexOf("}");
	if (start < 0 || end < start) throw new Error("No JSON object in model output");
	return JSON.parse(body.slice(start, end + 1));
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

// نمر فقط على المجلدات التي فيها ملفات (folder-by-folder)
let work = (tree.folders || []).filter((f) => (f.files || []).length > 0);
if (LIMIT > 0) work = work.slice(0, LIMIT);

/** @type {any[]} */
const catalog = [];
let folderIdx = 0;

for (const folder of work) {
	folderIdx++;
	console.log(
		`\n[${folderIdx}/${work.length}] folder: ${folder.relDir} (${folder.files.length} files)`,
	);

	// دفعات صغيرة حتى لا يتجاوز سياق النموذج
	const batchSize = 18;
	for (let i = 0; i < folder.files.length; i += batchSize) {
		const batch = folder.files.slice(i, i + batchSize);
		const userContent = [
			"KNOWN UNIVERSITIES (match universitySlug to slug):",
			univList || "(none)",
			"",
			"EXISTING LECTURE SPECIALTIES (optional match):",
			specList || "(none)",
			"",
			`CURRENT FOLDER relDir: ${folder.relDir}`,
			`FOLDER NAME: ${folder.name}`,
			`SUBDIRS HERE: ${(folder.subdirs || []).join(", ") || "(none)"}`,
			"",
			"FILES IN THIS FOLDER (classify each; keep relPath exact):",
			...batch.map(
				(f, idx) =>
					`${idx + 1}. relPath=${f.relPath} | name=${f.name} | size=${f.size}`,
			),
		].join("\n");

		let parsed = null;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const raw = await callKimi(userContent);
				parsed = extractJson(raw);
				break;
			} catch (e) {
				console.log(
					`  ⚠️ Kimi attempt ${attempt}/3 failed: ${e instanceof Error ? e.message : e}`,
				);
				await sleep(1200 * attempt);
			}
		}

		if (!parsed?.files || !Array.isArray(parsed.files)) {
			console.log("  ⚠️ no files array — heuristic fallback for batch");
			for (const f of batch) {
				catalog.push(heuristic(f, folder.relDir));
			}
			continue;
		}

		const byPath = new Map(parsed.files.map((x) => [x.relPath, x]));
		for (const f of batch) {
			const hit = byPath.get(f.relPath);
			if (!hit) {
				catalog.push(heuristic(f, folder.relDir));
				continue;
			}
			const conf = Number(hit.confidence ?? 0.5);
			const row = {
				relPath: f.relPath,
				sourceName: f.name,
				size: f.size,
				universitySlug: hit.universitySlug || null,
				level: normalizeLevel(hit.level),
				specialtyName: hit.specialtyName || null,
				specialtySlug: hit.specialtySlug || null,
				module: String(hit.module || guessModule(folder.relDir, f.name)).slice(0, 120),
				semester: Number(hit.semester) === 2 ? 2 : 1,
				type: normalizeType(hit.type, f.name),
				title: String(hit.title || cleanTitle(f.name)).slice(0, 150),
				confidence: conf,
				skip: Boolean(hit.skip) || conf < MIN_CONF,
				notes: hit.notes || (conf < MIN_CONF ? "low confidence" : ""),
				folder: folder.relDir,
			};
			catalog.push(row);
			const mark = row.skip ? "skip" : "ok";
			console.log(
				`  · ${mark} [${row.confidence.toFixed(2)}] ${row.universitySlug || "?"}/${row.level || "?"}/${row.module} · ${row.type} · ${row.title}`,
			);
		}
		await sleep(400);
	}
}

const out = path.join(outDir, "catalog.json");
fs.writeFileSync(
	out,
	JSON.stringify(
		{
			createdAt: new Date().toISOString(),
			model: deployment,
			minConfidence: MIN_CONF,
			root: tree.root,
			total: catalog.length,
			ready: catalog.filter((x) => !x.skip).length,
			skipped: catalog.filter((x) => x.skip).length,
			items: catalog,
		},
		null,
		2,
	),
	"utf8",
);
console.log(`\nDONE catalog items=${catalog.length} → ${out}`);

function normalizeLevel(v) {
	const s = String(v || "")
		.toUpperCase()
		.replace(/\s+/g, "");
	if (["L1", "L2", "L3", "M1", "M2"].includes(s)) return s;
	return null;
}

function normalizeType(v, fileName) {
	const s = String(v || "").toLowerCase();
	const ok = ["cours", "td", "tp", "resume", "book", "exam", "other"];
	if (ok.includes(s)) return s;
	return guessType(fileName);
}

function guessType(name) {
	const n = String(name).toLowerCase();
	if (/\btd\b|s[eé]rie|سلسلة/.test(n)) return "td";
	if (/\btp\b/.test(n)) return "tp";
	if (/exam|contr[oô]le|\bemd\b|rattrapage|امتحان/.test(n)) return "exam";
	if (/r[eé]sum[eé]|ملخص/.test(n)) return "resume";
	if (/livre|book|كتاب/.test(n)) return "book";
	return "cours";
}

function cleanTitle(name) {
	return String(name)
		.replace(/\.[a-z0-9]+$/i, "")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 150);
}

function guessModule(relDir, fileName) {
	const parts = String(relDir)
		.split("/")
		.filter((p) => p && p !== ".");
	// آخر جزء ليس cours/td/tp غالبًا هو اسم المقياس
	for (let i = parts.length - 1; i >= 0; i--) {
		const p = parts[i];
		if (/^(cours|td|tp|exam|exams|resume|book|books|pdf|files?)$/i.test(p)) continue;
		if (/^(l[123]|m[12])$/i.test(p)) continue;
		return p.slice(0, 120);
	}
	return cleanTitle(fileName).slice(0, 120) || "Module";
}

function heuristic(f, relDir) {
	const parts = String(relDir).split("/").filter(Boolean);
	let level = null;
	for (const p of parts) {
		const lv = normalizeLevel(p);
		if (lv) level = lv;
	}
	return {
		relPath: f.relPath,
		sourceName: f.name,
		size: f.size,
		universitySlug: null,
		level,
		specialtyName: null,
		specialtySlug: null,
		module: guessModule(relDir, f.name),
		semester: 1,
		type: guessType(f.name),
		title: cleanTitle(f.name),
		confidence: 0.35,
		skip: true,
		notes: "heuristic fallback — review manually",
		folder: relDir,
	};
}
