// مشغّل الحصاد.
//
// الاستعمال:
//   npx tsx scripts/library/run.ts --source=springer-oa --limit=50 --dry-run
//   npx tsx scripts/library/run.ts --source=hal --limit=500 --write
//   npx tsx scripts/library/run.ts --all --write --verify
//
// الوضع الافتراضي --dry-run: لا يكتب شيئًا في قاعدة البيانات.
// يجب تمرير --write صراحةً للكتابة. حماية مقصودة.
//
// المجموعات المستعملة (جديدة تمامًا، لا تمس library_books اليدوية):
//   library_items      — الكتب المنشورة
//   library_quarantine — ما تعذر تصنيفه، للمراجعة اليدوية
//   library_harvest_state — نقاط المتابعة

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
		const hit = argv.find((a) => a.startsWith(`--${name}=`));
		return hit ? hit.slice(name.length + 3) : undefined;
	};
	const has = (name: string): boolean => argv.includes(`--${name}`);

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
	return `${item.slug}-${suffix}`;
}

async function flush(db: Db, items: LibraryItem[], write: boolean): Promise<number> {
	if (items.length === 0) return 0;
	if (!write) return items.length;

	const ops = items.map((item) => ({
		updateOne: {
			filter: { canonicalKey: item.canonicalKey },
			update: {
				$set: {
					...item,
					slug: uniqueSlug(item),
					updatedAt: new Date(),
				},
				$setOnInsert: { harvestedAt: new Date() },
				$addToSet: { sources: { $each: item.sources } },
			},
			upsert: true,
		},
	}));

	// harvestedAt في $set و $setOnInsert معًا يتعارض — ننزعه من $set
	for (const op of ops) {
		const set = op.updateOne.update.$set as Record<string, unknown>;
		delete set.harvestedAt;
		delete set.sources;
	}

	const res = await db.collection(COL_ITEMS).bulkWrite(ops, { ordered: false });
	return (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	const uri = process.env.DATABASE_URL;
	if (!uri) throw new Error("DATABASE_URL مفقود — أضفه في .env");

	console.log("\n─── حصاد مكتبة الرياضيات ───");
	console.log(`الوضع   : ${args.write ? "كتابة فعلية ⚠" : "تجريبي (لا كتابة)"}`);
	console.log(`السنة    : >= ${MIN_YEAR}`);
	console.log(`المصادر  : ${args.sources.join(", ")}`);
	console.log(`التحقق   : ${args.verify ? "روابط PDF وأغلفة (أبطأ)" : "معطّل"}`);
	if (args.limit) console.log(`الحد       : ${args.limit} سجل لكل مصدر`);
	console.log("");

	const client = new MongoClient(uri);
	await client.connect();
	const db = client.db();

	try {
		if (args.write) await ensureIndexes(db);

		for (const id of args.sources) {
			const source = findSource(id);
			if (!source) {
				console.warn(`✗ مصدر مجهول: ${id}`);
				continue;
			}
			if (!source.ready()) {
				console.warn(`⊘ ${source.label} — تُجاوز. ${source.readyHint ?? ""}`);
				continue;
			}

			console.log(`▶ ${source.label}`);

			const stateKey = { source: source.id };
			const saved = args.resume
				? await db.collection(COL_STATE).findOne<{ cursor?: string }>(stateKey)
				: null;
			if (saved?.cursor) console.log(`  ↳ متابعة من: ${saved.cursor.slice(0, 40)}`);

			let seen = 0;
			let accepted = 0;
			let rejected = 0;
			let quarantined = 0;
			let buffer: LibraryItem[] = [];
			const reasons = new Map<string, number>();

			try {
				for await (const raw of source.harvest({
					limit: args.limit,
					cursor: saved?.cursor,
					minYear: MIN_YEAR,
					onCursor: async (cursor) => {
						if (args.write) {
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
						buffer.push(result.item);
						if (buffer.length >= BATCH_SIZE) {
							await flush(db, buffer, args.write);
							buffer = [];
							console.log(`  … ${seen} مقروء · ${accepted} مقبول`);
						}
					} else if (result.action === "quarantine") {
						quarantined++;
						if (args.write) {
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

				await flush(db, buffer, args.write);
			} catch (err) {
				console.error(`  ✗ توقف ${source.label}: ${(err as Error).message}`);
				await flush(db, buffer, args.write);
			}

			console.log(`  ✓ مقروء ${seen} · مقبول ${accepted} · محجوز ${quarantined} · مرفوض ${rejected}`);

			const top = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
			for (const [reason, count] of top) console.log(`      − ${reason}: ${count}`);
			console.log("");
		}

		if (!args.write) {
			console.log("وضع تجريبي: لم يُكتب شيء. أضف --write للحفظ فعلًا.\n");
		}
	} finally {
		await client.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
