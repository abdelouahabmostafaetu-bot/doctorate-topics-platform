// ضغط ملفات PDF في مكتبة المحاضرات قبل رفعها (يحتاج Ghostscript).
//
// الاستخدام:
//   npm run compress-pdfs -- "D:/lectures-library" --dry        (معاينة دون تغيير)
//   npm run compress-pdfs -- "D:/lectures-library"
//   npm run compress-pdfs -- "D:/lectures-library" --min=2 --quality=screen
//   npm run compress-pdfs -- "D:/lectures-library/mila" --keep
//
// تثبيت Ghostscript على ويندوز (مرة واحدة):
//   winget install --id ArtifexSoftware.GhostScript
//
// الجودات:
//   screen  = 72 نقطة/إنش  → أصغر حجم (قراءة على الهاتف)
//   ebook   = 150 نقطة/إنش → الافتراضي، توازن ممتاز
//   printer = 300 نقطة/إنش → جودة طباعة
//
// الأمان:
//   • لا يُستبدل أي ملف إلا إن صغر بأكثر من 5% — وإلا يُترك كما هو.
//   • --keep يحفظ الأصل باسم name.orig.pdf
//   • ملفات *.orig.pdf تُتجاوز دائماً، ولا يرفعها سكريبت الرفع إن أضفتها للاستثناء.
//   • شغّل --dry أولاً لرؤية التوفير المتوقّع.

import { readdir, stat, rename, unlink, copyFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const QUALITY: Record<string, string> = {
	screen: "/screen",
	ebook: "/ebook",
	printer: "/printer",
	prepress: "/prepress",
};

function mb(bytes: number): string {
	return (bytes / 1048576).toFixed(1);
}

/** يجرّب أسماء Ghostscript على ويندوز ولينكس وماك. */
async function findGhostscript(): Promise<string | null> {
	for (const bin of ["gswin64c", "gswin32c", "gs"]) {
		try {
			await run(bin, ["--version"]);
			return bin;
		} catch {
			// جرّب التالي
		}
	}
	return null;
}

async function walkPdfs(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const out: string[] = [];
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
		if (entry.name.startsWith(".")) continue;
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await walkPdfs(abs)));
		} else if (
			entry.isFile() &&
			/\.pdf$/i.test(entry.name) &&
			!/\.orig\.pdf$/i.test(entry.name) &&
			!/\.gstmp\.pdf$/i.test(entry.name)
		) {
			out.push(abs);
		}
	}
	return out;
}

async function main() {
	const args = process.argv.slice(2);
	const root = args.find((value) => !value.startsWith("--")) ?? "";
	const dry = args.includes("--dry");
	const keep = args.includes("--keep");
	const minArg = args.find((value) => value.startsWith("--min="));
	const minMb = minArg ? Number(minArg.slice("--min=".length)) || 0 : 5;
	const qualityArg = args.find((value) => value.startsWith("--quality="));
	const qualityKey = (
		qualityArg ? qualityArg.slice("--quality=".length) : "ebook"
	).toLowerCase();
	const quality = QUALITY[qualityKey] ?? "/ebook";

	if (!root) {
		console.error(
			'❌ حدّد المجلد:  npm run compress-pdfs -- "D:/lectures-library"',
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

	const gs = await findGhostscript();
	if (!gs) {
		console.error("❌ Ghostscript غير مُثبّت. نصّبه بأمر واحد:");
		console.error("   winget install --id ArtifexSoftware.GhostScript");
		console.error("ثم أغلق النافذة وافتحها من جديد ليُعرف الأمر.");
		process.exit(1);
	}

	const pdfs = await walkPdfs(rootAbs);
	console.log(`📂 المجلد: ${rootAbs}`);
	console.log(
		`🔧 Ghostscript: ${gs}  |  الجودة: ${qualityKey}  |  الحد الأدنى: ${minMb} م.ب`,
	);
	console.log(
		dry
			? `🔎 وضع المعاينة — لن يتغير أي ملف  (${pdfs.length} ملف PDF)\n`
			: `⚙️  معالجة ${pdfs.length} ملف PDF\n`,
	);

	let before = 0;
	let after = 0;
	let changed = 0;
	let skipped = 0;
	let failed = 0;

	for (const file of pdfs) {
		const rel = path.relative(rootAbs, file);
		const info = await stat(file);

		if (info.size < minMb * 1048576) {
			skipped += 1;
			continue;
		}

		// الملف المؤقت بجانب الأصل لتجنّب النقل بين أقراص مختلفة
		const tmp = file.replace(/\.pdf$/i, ".gstmp.pdf");

		try {
			await run(
				gs,
				[
					"-sDEVICE=pdfwrite",
					"-dCompatibilityLevel=1.5",
					`-dPDFSETTINGS=${quality}`,
					"-dNOPAUSE",
					"-dQUIET",
					"-dBATCH",
					"-dDetectDuplicateImages=true",
					"-dCompressFonts=true",
					"-dSubsetFonts=true",
					`-sOutputFile=${tmp}`,
					file,
				],
				{ maxBuffer: 64 * 1024 * 1024 },
			);

			const outInfo = await stat(tmp);
			const gain = 1 - outInfo.size / info.size;
			before += info.size;

			// توفير مهمل أو ملف ناتج أكبر → أبقِ الأصل
			if (gain < 0.05 || outInfo.size < 1024) {
				after += info.size;
				skipped += 1;
				await unlink(tmp).catch(() => {});
				console.log(`⏭️  ${rel} (${mb(info.size)} م.ب) — مضغوط أصلاً`);
				continue;
			}

			after += outInfo.size;
			const pct = Math.round(gain * 100);

			if (dry) {
				await unlink(tmp).catch(() => {});
				changed += 1;
				console.log(
					`🔎 ${rel}: ${mb(info.size)} → ${mb(outInfo.size)} م.ب  (-${pct}%)`,
				);
				continue;
			}

			if (keep) {
				await rename(file, file.replace(/\.pdf$/i, ".orig.pdf"));
			}

			try {
				await rename(tmp, file);
			} catch {
				await copyFile(tmp, file);
				await unlink(tmp).catch(() => {});
			}

			changed += 1;
			console.log(
				`✅ ${rel}: ${mb(info.size)} → ${mb(outInfo.size)} م.ب  (-${pct}%)`,
			);
		} catch (error) {
			failed += 1;
			before += info.size;
			after += info.size;
			await unlink(tmp).catch(() => {});
			const message =
				error instanceof Error ? error.message.split("\n")[0] : String(error);
			console.error(`❌ ${rel}: ${message}`);
		}
	}

	const savedPct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
	console.log(`\n──────────────────────────────`);
	console.log(
		`${dry ? "سيُضغط" : "تم ضغط"}: ${changed}  |  تُجاوز: ${skipped}  |  أخطاء: ${failed}`,
	);
	if (before > 0) {
		console.log(
			`الحجم: ${mb(before)} → ${mb(after)} م.ب  (توفير ${savedPct}% ≈ ${mb(before - after)} م.ب)`,
		);
	}
	if (dry && changed > 0) {
		console.log("↻ أعد الأمر بدون --dry لتطبيق الضغط فعلياً.");
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
