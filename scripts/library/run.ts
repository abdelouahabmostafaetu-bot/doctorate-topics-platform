// مشغّل الحصاد.
//
// الاستعمال:
//   npx tsx scripts/library/run.ts --source=hal --limit=50
//   npx tsx scripts/library/run.ts --source=springer-oa --limit=50 --verify
//   npx tsx scripts/library/run.ts --all --write --verify --resume
//
// الوضع الافتراضي تجريبي: لا يكتب شيئًا، **ولا يتصل بقاعدة البيانات أصلًا**.
// لذلك يمكن تجربة أي مصدر بلا أي إعداد. الكتابة تحتاج --write صراحةً.
//
// المجموعات (جديدة تمامًا، لا تمس library_books اليدوية):
//   library_items         — الكتب المنشورة
//   library_quarantine    — ما تعذر تصنيفه، للمراجعة اليدوية
//   library_harvest_state — نقاط المتابعة

import "dotenv/config";

import { MongoClient, type Db } from "mongodb";
import { MIN_YEAR } from "./gate";
import { normalizeItem } from "./normalizeItem";
import { findSource, SOURCES } from "./sources";
import type { LibraryItem } from "./types";

const COL_ITEMS = "library_items";
const COL_QUARANTINE = "library_quarantine";
const COL_STATE = "library_harvest_state";

const BATCH_SIZE = 500;

type Args = {
	sources: string[];
	limit?: number;
	write: boolean;
	verify: boolean;
	resume: boolean;
};

function parseArgs(argv: string[]): Args {
	const get = (name: string): string | undefined => {
		const hit = argv.find((a) => a.startsWith("--" + name + "="));
		return hit ? hit.slice(name.length + 3) : undefined;
	};
	const has = (name: string): boolean => argv.includes("--" + name);

	const sourceArg = get("source");
	const sources = has("all") || !sourceArg ? SOURCES.map((s) => s.id) : sourceArg.split(",");
	const limitRaw = get("limit");

	return {
		sources,
		limit: limitRaw ? Number(limitRaw) : undefined,
		write: has("write"),
		verify: has("verify"),
		resume: has("resume"),
	};
}

async function ensureIndexes(db: Db): Promise<void> {
	const items = db.collection(COL_ITEMS);
	await items.createIndex({ canonicalKey: 1 }, { unique: true });
	await items.createIndex({ slug: 1 }, { unique: true });
	await items.createIndex({ category: 1, year: -1 });
	await items.createIndex({ level: 1, category: 1 });
	await items.createIndex({ access: 1 });
	await items.createIndex({ qualityScore: -1 });
	await items.createIndex({ pdfStatus: 1, pdfCheckedAt: 1 });
	await db.collection(COL_QUARANTINE).createIndex({ createdAt: -1 });
}

/** slug فريد: عند التعارض نلحق لاحقة من المفتاح الموحّد */
function uniqueSlug(item: LibraryItem): string {
	const suffix = item.canonicalKey.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
	return item.slug + "-" + suffix;
}

async function flush(db: Db | null, items: LibraryItem[]): Promise<void> {
	if (items.length === 0 || !db) return;

	const ops = items.map((item) => {
		const set: Record<string, unknown> = { ...item, slug: uniqueSlug(item), updatedAt: new Date() };
		// harvestedAt و sources تُدار بمعاملات أخرى — وجودها في $set يسبب تعارضًا
		delete set.harvestedAt;
		delete set.sources;

		return {
			updateOne: {
				filter: { canonicalKey: item.canonicalKey },
				update: {
					$set: set,
					$setOnInsert: { harvestedAt: new Date() },
					$addToSet: { sources: { $each: item.sources } },
				},
				upsert: true,
			},
		};
	});

	await db.collection(COL_ITEMS).bulkWrite(ops, { ordered: false });
}

/** عينة مقروءة — أسرع طريقة للحكم على جودة التصنيف */
function printSample(item: LibraryItem): void {
	console.log("  عينة من أول كتاب مقبول:");
	console.log("    العنوان  : " + item.title.slice(0, 70));
	console.log("    المؤلف  : " + (item.authors[0] ?? "—"));
	console.log("    السنة    : " + String(item.year));
	console.log("    التصنيف : " + item.category + " (" + item.classifiedBy + ")");
	console.log("    المستوى : " + (item.level ?? "غير محدد"));
	console.log("    الوصول  : " + item.access);
	console.log("    الجودة   : " + String(item.qualityScore) + "/100");
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	console.log("\n─── حصاد مكتبة الرياضيات ───");
	console.log("الوضع   : " + (args.write ? "كتابة فعلية ⚠" : "تجريبي — لا كتابة ولا اتصال بقاعدة البيانات"));
	console.log("السنة    : >= " + String(MIN_YEAR));
	console.log("المصادر  : " + args.sources.join(", "));
	console.log("التحقق   : " + (args.verify ? "روابط PDF وأغلفة (أبطأ)" : "معطّل"));
	if (args.limit) console.log("الحد       : " + String(args.limit) + " سجل لكل مصدر");
	console.log("");

	// الاتصال بقاعدة البيانات لا يحدث إلا عند الكتابة الفعلية
	let client: MongoClient | null = null;
	let db: Db | null = null;

	if (args.write) {
		const uri = process.env.DATABASE_URL;
		if (!uri) throw new Error("DATABASE_URL مفقود — مطلوب مع --write فقط");
		client = new MongoClient(uri);
		await client.connect();
		db = client.db();
		await ensureIndexes(db);
	}

	try {
		for (const id of args.sources) {
			const source = findSource(id);
			if (!source) {
				console.warn("✗ مصدر مجهول: " + id);
				continue;
			}
			if (!source.ready()) {
				console.warn("⊘ " + source.label + " — تُجاوز. " + (source.readyHint ?? ""));
				continue;
			}

			console.log("▶ " + source.label);

			const stateKey = { source: source.id };
			const saved =
				args.resume && db
					? await db.collection(COL_STATE).findOne<{ cursor?: string }>(stateKey)
					: null;
			if (saved?.cursor) console.log("  ↳ متابعة من: " + saved.cursor.slice(0, 40));

			let seen = 0;
			let accepted = 0;
			let rejected = 0;
			let quarantined = 0;
			let buffer: LibraryItem[] = [];
			let sample: LibraryItem | null = null;
			const reasons = new Map<string, number>();

			try {
				for await (const raw of source.harvest({
					limit: args.limit,
					cursor: saved?.cursor,
					minYear: MIN_YEAR,
					onCursor: async (cursor) => {
						if (db) {
							await db
								.collection(COL_STATE)
								.updateOne(stateKey, { $set: { cursor, updatedAt: new Date() } }, { upsert: true });
						}
					},
				})) {
					seen++;

					const result = await normalizeItem(raw, {
						verifyPdfLinks: args.verify,
						resolveCovers: args.verify,
					});

					if (result.ok) {
						accepted++;
						if (!sample) sample = result.item;
						buffer.push(result.item);
						if (buffer.length >= BATCH_SIZE) {
							await flush(db, buffer);
							buffer = [];
							console.log("  … " + String(seen) + " مقروء · " + String(accepted) + " مقبول");
						}
					} else if (result.action === "quarantine") {
						quarantined++;
						reasons.set("محجوز: " + result.reason, (reasons.get("محجوز: " + result.reason) ?? 0) + 1);
						if (db) {
							await db.collection(COL_QUARANTINE).insertOne({
								raw: result.raw,
								reason: result.reason,
								source: source.id,
								createdAt: new Date(),
							});
						}
					} else {
						rejected++;
						reasons.set(result.reason, (reasons.get(result.reason) ?? 0) + 1);
					}
				}

				await flush(db, buffer);
			} catch (err) {
				console.error("  ✗ توقف " + source.label + ": " + (err as Error).message);
				await flush(db, buffer);
			}

			console.log(
				"  ✓ مقروء " +
					String(seen) +
					" · مقبول " +
					String(accepted) +
					" · محجوز " +
					String(quarantined) +
					" · مرفوض " +
					String(rejected),
			);

			const top = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
			for (const [reason, count] of top) console.log("      − " + reason + ": " + String(count));

			if (sample) printSample(sample);
			console.log("");
		}

		if (!args.write) {
			console.log("وضع تجريبي: لم يُكتب شيء. أضف --write للحفظ فعلًا.\n");
		}
	} finally {
		if (client) await client.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
