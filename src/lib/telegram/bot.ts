// ============================================================
//  بوت تيليجرام — يعمل داخل الموقع (Webhook)
//  التدفق: السنة ← النوع ← (التخصص) ← الجامعة ← العدد ← PDF
//  عام = تخصص «الرياضيات» (مثل الموقع)
// ============================================================
import { prisma } from "@/lib/prisma";
import { buildExamHtml } from "@/lib/pdf/exam-template";
import { renderPdf } from "@/lib/pdf/generate";
import { buildBulkWhere, BULK_ORDER } from "@/lib/pdf/bulk-filters";

// ---------- أنواع تيليجرام ----------
type TgChat = { id: number };
type TgMessage = { message_id: number; chat: TgChat; text?: string };
type TgCallbackQuery = { id: string; data?: string; message?: TgMessage };
export type TgUpdate = { message?: TgMessage; callback_query?: TgCallbackQuery };

type Button = { text: string; callback_data: string };
type Keyboard = { inline_keyboard: Button[][] };
type TgResponse = { ok: boolean; result?: { message_id?: number } };

// ---------- إعدادات العرض ----------
export const TELEGRAM_HOST = "https://api.telegram.org";
const COLS = 2;
const ROWS = 8;
const PAGE_SIZE = COLS * ROWS;
const LABEL_MAX = 24;
const COUNT_CHOICES = [5, 10, 25, 50, 100, 200];

// عدد المواضيع في ملف PDF واحد — صغير لينجح على خادم محدود الذاكرة
const CHUNK = 12;
// إن فشل جزء، نقسّمه تلقائيًا حتى هذا الحد
const MIN_CHUNK = 2;

const T = {
	brand: "📘 <b>مواضيع دكتوراه الرياضيات</b>",
	askYear: "📅 <b>اختر السنة</b>",
	askType: "📝 <b>اختر النوع</b>",
	askSpecialty: "🎯 <b>اختر التخصص</b>",
	askUniversity: "🏛️ <b>اختر الجامعة</b>",
	askCount: "🔢 <b>كم موضوعًا تريد؟</b>",
	all: "الكل",
	allBtn: "🌐 الكل",
	general: "📘 عام",
	specialtyType: "🎯 تخصص",
	generalPlain: "عام",
	specialtyPlain: "تخصص",
	back: "⬅️ رجوع",
	restart: "🔄 جديد",
	available: "متاح",
	topics: "موضوعًا",
	noResults: "⚠️ <b>لا توجد نتائج</b>\nجرّب معايير أوسع.",
	done: "✅ <b>تم التحميل</b>",
	partial: "⚠️ <b>تم تحميل جزء فقط</b>",
	failed: "❌ <b>تعذّر تجهيز الملف</b>\nجرّب عددًا أقل.",
	error: "❌ <b>حدث خطأ</b>\nاكتب /start للمحاولة مجددًا.",
	useStart: "اكتب /start للبدء.",
	help: "ℹ️ /start — بحث جديد\nℹ️ /help — هذه الرسالة",
};

// ---------- نداءات Telegram API ----------
function apiBase(): string {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
	return TELEGRAM_HOST + "/bot" + token;
}

async function tg(
	method: string,
	payload: Record<string, unknown>,
): Promise<TgResponse> {
	const res = await fetch(apiBase() + "/" + method, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	return (await res.json()) as TgResponse;
}

async function sendDocument(
	chatId: number,
	data: ArrayBuffer,
	filename: string,
	caption: string,
): Promise<void> {
	const form = new FormData();
	form.append("chat_id", String(chatId));
	form.append("caption", caption);
	form.append(
		"document",
		new Blob([data], { type: "application/pdf" }),
		filename,
	);
	const res = await fetch(apiBase() + "/sendDocument", {
		method: "POST",
		body: form,
	});
	const json = (await res.json()) as { ok?: boolean; description?: string };
	if (!json.ok) {
		throw new Error("sendDocument failed: " + (json.description ?? "unknown"));
	}
}

function toArrayBuffer(input: Uint8Array): ArrayBuffer {
	const out = new ArrayBuffer(input.byteLength);
	new Uint8Array(out).set(input);
	return out;
}

async function say(chatId: number, text: string): Promise<number | undefined> {
	const r = await tg("sendMessage", {
		chat_id: chatId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: true,
	});
	return r.result?.message_id;
}

async function editText(
	chatId: number,
	messageId: number | undefined,
	text: string,
): Promise<void> {
	if (!messageId) return;
	try {
		await tg("editMessageText", {
			chat_id: chatId,
			message_id: messageId,
			text,
			parse_mode: "HTML",
			disable_web_page_preview: true,
		});
	} catch {
		// تجاهل
	}
}

// ---------- اختصار أسماء الجامعات ----------
const AR_PREFIXES = [
	"المدرسة الوطنية العليا للأساتذة ",
	"المدرسة العليا للأساتذة ",
	"المدرسة الوطنية العليا ",
	"المدرسة العليا ",
	"المركز الجامعي ",
	"المدرسة العليا للإعلام الآلي ",
	"جامعة ",
	"الجامعة ",
];

const FR_PREFIXES = [
	"universite des sciences et de la technologie ",
	"universit\u00e9 des sciences et de la technologie ",
	"ecole nationale superieure ",
	"\u00e9cole nationale sup\u00e9rieure ",
	"ecole normale superieure ",
	"\u00e9cole normale sup\u00e9rieure ",
	"centre universitaire ",
	"ecole superieure ",
	"\u00e9cole sup\u00e9rieure ",
	"universite ",
	"universit\u00e9 ",
];

const UNI_SHORT: Record<string, string> = {
	"ens-kouba": "ENS قبة",
	ensm: "ENSM",
	usthb: "USTHB",
	usto: "USTO",
	"universite-des-sciences-et-de-la-technologie-d-oran-usto": "USTO",
	"ecole-nationale-superieure-de-statistique-et-d-economie-appliquee-enssea":
		"ENSSEA",
	"ecole-normale-superieure-d-enseignement-technologique-de-skikda-enset-skikda":
		"ENSET سكيكدة",
	"ecole-nationale-superieure-de-mathematiques": "ENSM",
	"ens-mathematiques": "ENSM",
};

function stripPrefix(text: string): string {
	let s = text.trim();
	for (const p of AR_PREFIXES) {
		if (s.startsWith(p)) {
			s = s.slice(p.length).trim();
			break;
		}
	}
	const lower = s.toLowerCase();
	for (const p of FR_PREFIXES) {
		if (lower.startsWith(p)) {
			s = s.slice(p.length).trim();
			break;
		}
	}
	return s.replace(/^(de |d'|du |des |la |le |لـ|لل|ل )/i, "").trim();
}

function shortLabel(
	nameAr: string | null,
	name: string | null,
	city: string | null,
	slug: string,
): string {
	const known = UNI_SHORT[slug.toLowerCase()];
	if (known) return known;

	const raw = (nameAr || name || slug).trim();
	const stripped = stripPrefix(raw);

	const tooGeneric =
		!stripped ||
		stripped === "الرياضيات" ||
		stripped === "رياضيات" ||
		stripped.toLowerCase() === "mathematics" ||
		stripped.toLowerCase() === "mathematiques";

	if (!tooGeneric && stripped.length <= LABEL_MAX) return stripped;

	const source = (name || "") + " " + raw + " " + slug;
	const paren = source.match(/\(([A-Za-z]{2,12})\)/);
	if (paren) return paren[1].toUpperCase();
	const acronym = source.match(/\b([A-Z]{3,12})\b/);
	if (acronym) return acronym[1].toUpperCase();

	const wilaya = (city || "").trim();
	if (wilaya && wilaya.length <= LABEL_MAX) return wilaya;

	const base = !tooGeneric ? stripped : raw;
	return base.length > LABEL_MAX
		? base.slice(0, LABEL_MAX - 1) + "\u2026"
		: base;
}

// ---------- تخصص الرياضيات (عام في الموقع) ----------
function isMathGeneralSpecialty(s: {
	slug: string;
	nameAr: string | null;
	name: string | null;
}): boolean {
	const ar = (s.nameAr || "").trim();
	const en = (s.name || "").trim().toLowerCase();
	const slug = s.slug.toLowerCase();
	return (
		ar === "الرياضيات" ||
		ar === "رياضيات" ||
		en === "mathematics" ||
		en === "mathématiques" ||
		en === "mathematiques" ||
		slug === "mathematics" ||
		slug === "math" ||
		slug === "mathematiques"
	);
}

function specialtyLabel(
	nameAr: string | null,
	name: string | null,
	slug: string,
): string {
	let base = (nameAr || name || slug).trim();

	base = base
		.replace(/الرياضيات\s*/g, "")
		.replace(/رياضيات\s*/g, "")
		.replace(/\bmathematics\b/gi, "")
		.replace(/\bmath[ée]matiques\b/gi, "")
		.replace(/\bmath\b/gi, "")
		.replace(/[-–—,:|/]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	base = base.replace(/^(في|de|d'|du|des|of)\s+/i, "").trim();

	if (!base) base = name || slug;

	return base.length > LABEL_MAX
		? base.slice(0, LABEL_MAX - 1) + "\u2026"
		: base;
}

// ---------- البيانات ----------
type Item = { slug: string; label: string };
type Meta = {
	universities: Item[];
	specialties: Item[];
	years: number[];
	mathSlug: string | null;
};

type Filters = {
	year?: string;
	examType?: string;
	specialty?: string;
	university?: string;
};
type Step = "year" | "type" | "specialty" | "university" | "count";
type Session = {
	step: Step;
	filters: Filters;
	uPage: number;
	sPage: number;
	total: number;
	busy: boolean;
};

const store = globalThis as unknown as {
	__botSessions?: Map<number, Session>;
	__botMeta?: Meta;
	__botMetaAt?: number;
};
const sessions: Map<number, Session> =
	store.__botSessions ?? (store.__botSessions = new Map<number, Session>());

function newSession(): Session {
	return { step: "year", filters: {}, uPage: 0, sPage: 0, total: 0, busy: false };
}

function getSession(chatId: number): Session {
	let s = sessions.get(chatId);
	if (!s) {
		s = newSession();
		sessions.set(chatId, s);
	}
	return s;
}

async function getMeta(): Promise<Meta> {
	const now = Date.now();
	if (store.__botMeta && now - (store.__botMetaAt ?? 0) < 10 * 60 * 1000) {
		return store.__botMeta;
	}
	const [universities, specialties, years] = await Promise.all([
		prisma.university.findMany({
			orderBy: { nameAr: "asc" },
			select: { slug: true, nameAr: true, name: true, city: true },
		}),
		prisma.specialty.findMany({
			orderBy: { nameAr: "asc" },
			select: { slug: true, nameAr: true, name: true },
		}),
		prisma.topic.findMany({
			where: { status: "published" },
			distinct: ["year"],
			orderBy: { year: "desc" },
			select: { year: true },
		}),
	]);

	const uniItems: Item[] = universities.map((u) => ({
		slug: u.slug,
		label: shortLabel(u.nameAr, u.name, u.city, u.slug),
	}));
	uniItems.sort((a, b) => a.label.localeCompare(b.label, "ar"));

	const math = specialties.find(isMathGeneralSpecialty) ?? null;
	const mathSlug = math ? math.slug : null;

	const specItems: Item[] = specialties
		.filter((s) => !isMathGeneralSpecialty(s))
		.map((s) => ({
			slug: s.slug,
			label: specialtyLabel(s.nameAr, s.name, s.slug),
		}))
		.filter((s) => s.label.length > 0);
	specItems.sort((a, b) => a.label.localeCompare(b.label, "ar"));

	const meta: Meta = {
		universities: uniItems,
		specialties: specItems,
		years: years.map((y) => y.year),
		mathSlug,
	};
	store.__botMeta = meta;
	store.__botMetaAt = now;
	return meta;
}

function bulkParams(f: Filters) {
	return {
		university:
			f.university && f.university !== "*" ? f.university : undefined,
		specialty: f.specialty && f.specialty !== "*" ? f.specialty : undefined,
		year: f.year && f.year !== "*" ? f.year : undefined,
		examType: f.examType && f.examType !== "*" ? f.examType : undefined,
	};
}

// ---------- أدوات ----------
function esc(text: unknown): string {
	return String(text ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function chunk<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

function stepList(s: Session): Step[] {
	const arr: Step[] = ["year", "type"];
	if (s.filters.examType === "specialty") arr.push("specialty");
	arr.push("university", "count");
	return arr;
}

function nextStep(s: Session): Step {
	const list = stepList(s);
	const i = list.indexOf(s.step);
	return i >= 0 && i < list.length - 1 ? list[i + 1] : s.step;
}

function prevStep(s: Session): Step {
	const list = stepList(s);
	const i = list.indexOf(s.step);
	return i > 0 ? list[i - 1] : list[0];
}

function slugFromIndex(list: Item[], value: string): string {
	if (value === "*") return "*";
	const item = list[Number(value)];
	return item ? item.slug : "*";
}

function labelFor(list: Item[], slug?: string): string {
	if (!slug || slug === "*") return T.all;
	const found = list.find((x) => x.slug === slug);
	return found ? found.label : slug;
}

function yearLabel(v?: string): string {
	return !v || v === "*" ? T.all : v;
}

function typeLabel(v?: string): string {
	if (v === "general") return T.generalPlain;
	if (v === "specialty") return T.specialtyPlain;
	return T.all;
}

function panel(s: Session, meta: Meta, title: string, extra?: string): string {
	const f = s.filters;
	const bits: string[] = [];
	if (f.year !== undefined) bits.push("📅 " + esc(yearLabel(f.year)));
	if (f.examType !== undefined) {
		if (f.examType === "general") {
			bits.push("📘 " + T.generalPlain);
		} else if (f.examType === "specialty") {
			bits.push("📝 " + T.specialtyPlain);
		} else {
			bits.push("📝 " + esc(typeLabel(f.examType)));
		}
	}
	if (
		f.specialty !== undefined &&
		f.examType === "specialty" &&
		f.specialty !== meta.mathSlug
	) {
		bits.push("🎯 " + esc(labelFor(meta.specialties, f.specialty)));
	}
	if (f.university !== undefined)
		bits.push("🏛️ " + esc(labelFor(meta.universities, f.university)));

	const list = stepList(s);
	const idx = Math.max(0, list.indexOf(s.step));
	const dots = "●".repeat(idx) + "○".repeat(list.length - idx);

	const lines: string[] = [];
	lines.push(bits.length ? bits.join("  ·  ") : T.brand);
	lines.push("<code>" + dots + "</code>");
	lines.push("");
	lines.push(title);
	if (extra) {
		lines.push("");
		lines.push(extra);
	}
	return lines.join("\n");
}

function footerRow(s: Session): Button[][] {
	const row: Button[] = [];
	if (stepList(s).indexOf(s.step) > 0)
		row.push({ text: T.back, callback_data: "back" });
	row.push({ text: T.restart, callback_data: "restart" });
	return [row];
}

function pagedKeyboard(
	s: Session,
	items: Item[],
	tag: string,
	page: number,
): Keyboard {
	const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
	const p = Math.min(Math.max(page, 0), totalPages - 1);

	const rows: Button[][] = [];
	const start = p * PAGE_SIZE;
	const slice = items.slice(start, start + PAGE_SIZE);
	const buttons: Button[] = slice.map((item, i) => ({
		text: item.label,
		callback_data: tag + "|" + (start + i),
	}));
	for (const row of chunk(buttons, COLS)) rows.push(row);

	if (totalPages > 1) {
		const prev = (p - 1 + totalPages) % totalPages;
		const next = (p + 1) % totalPages;
		rows.push([
			{ text: "◀️", callback_data: tag + "p|" + prev },
			{ text: p + 1 + " / " + totalPages, callback_data: "noop" },
			{ text: "▶️", callback_data: tag + "p|" + next },
		]);
	}

	rows.push([{ text: T.allBtn, callback_data: tag + "|*" }]);
	for (const r of footerRow(s)) rows.push(r);
	return { inline_keyboard: rows };
}

function yearKeyboard(s: Session, meta: Meta): Keyboard {
	const btns: Button[] = meta.years.map((y) => ({
		text: String(y),
		callback_data: "y|" + y,
	}));
	const rows: Button[][] = chunk(btns, 3);
	rows.push([{ text: T.allBtn, callback_data: "y|*" }]);
	for (const r of footerRow(s)) rows.push(r);
	return { inline_keyboard: rows };
}

function typeKeyboard(s: Session): Keyboard {
	const rows: Button[][] = [
		[
			{ text: T.general, callback_data: "t|general" },
			{ text: T.specialtyType, callback_data: "t|specialty" },
		],
		[{ text: T.allBtn, callback_data: "t|*" }],
	];
	for (const r of footerRow(s)) rows.push(r);
	return { inline_keyboard: rows };
}

function countKeyboard(s: Session, total: number): Keyboard {
	const btns: Button[] = COUNT_CHOICES.filter((n) => n < total).map((n) => ({
		text: String(n),
		callback_data: "n|" + n,
	}));
	const rows: Button[][] = chunk(btns, 3);
	rows.push([{ text: "⬇️ الكل (" + total + ")", callback_data: "n|*" }]);
	for (const r of footerRow(s)) rows.push(r);
	return { inline_keyboard: rows };
}

async function render(
	chatId: number,
	messageId: number | undefined,
	text: string,
	keyboard: Keyboard,
): Promise<void> {
	if (messageId) {
		const r = await tg("editMessageText", {
			chat_id: chatId,
			message_id: messageId,
			text,
			parse_mode: "HTML",
			disable_web_page_preview: true,
			reply_markup: keyboard,
		});
		if (r.ok) return;
	}
	await tg("sendMessage", {
		chat_id: chatId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: true,
		reply_markup: keyboard,
	});
}

async function showStep(
	chatId: number,
	messageId: number | undefined,
	s: Session,
	meta: Meta,
): Promise<void> {
	if (s.step === "year") {
		await render(
			chatId,
			messageId,
			panel(s, meta, T.askYear),
			yearKeyboard(s, meta),
		);
	} else if (s.step === "type") {
		await render(chatId, messageId, panel(s, meta, T.askType), typeKeyboard(s));
	} else if (s.step === "specialty") {
		if (meta.specialties.length === 0) {
			s.filters.specialty = "*";
			s.step = "university";
			await showStep(chatId, messageId, s, meta);
			return;
		}
		await render(
			chatId,
			messageId,
			panel(s, meta, T.askSpecialty),
			pagedKeyboard(s, meta.specialties, "s", s.sPage),
		);
	} else if (s.step === "university") {
		await render(
			chatId,
			messageId,
			panel(s, meta, T.askUniversity),
			pagedKeyboard(s, meta.universities, "u", s.uPage),
		);
	} else {
		const total = await prisma.topic.count({
			where: buildBulkWhere(bulkParams(s.filters)),
		});
		s.total = total;
		if (total === 0) {
			await render(chatId, messageId, panel(s, meta, T.noResults), {
				inline_keyboard: footerRow(s),
			});
		} else {
			await render(
				chatId,
				messageId,
				panel(
					s,
					meta,
					T.askCount,
					"📊 " + T.available + ": <b>" + total + "</b> " + T.topics,
				),
				countKeyboard(s, total),
			);
		}
	}
}

// ---------- توليد وإرسال الملفات ----------
type WhereInput = ReturnType<typeof buildBulkWhere>;

type SendCtx = { fileIndex: number; sent: number };

function progressText(sent: number, total: number): string {
	const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
	const filled = Math.round(pct / 10);
	const bar = "█".repeat(filled) + "░".repeat(10 - filled);
	return (
		"⏳ <b>جارٍ التجهيز</b>\n" +
		"<code>" +
		bar +
		"</code> " +
		pct +
		"%\n" +
		"📄 " +
		sent +
		" / " +
		total
	);
}

// يولّد ملفًا لمجموعة مواضيع، وإن فشل يقسّمها تلقائيًا إلى نصفين
async function sendRange(
	chatId: number,
	where: WhereInput,
	skip: number,
	take: number,
	ctx: SendCtx,
): Promise<number> {
	if (take <= 0) return 0;
	try {
		const topics = await prisma.topic.findMany({
			where,
			include: { university: true, specialty: true },
			orderBy: BULK_ORDER,
			skip,
			take,
		});
		if (topics.length === 0) return 0;

		const html = buildExamHtml(topics, { toc: true });
		const pdf = await renderPdf(html);

		ctx.fileIndex += 1;
		await sendDocument(
			chatId,
			toArrayBuffer(new Uint8Array(pdf)),
			"doctorat-" + ctx.fileIndex + ".pdf",
			"📄 " + topics.length + " " + T.topics,
		);
		return topics.length;
	} catch (err) {
		console.error("pdf part failed", { skip, take, err });
		if (take > MIN_CHUNK) {
			const half = Math.ceil(take / 2);
			const a = await sendRange(chatId, where, skip, half, ctx);
			const b = await sendRange(chatId, where, skip + half, take - half, ctx);
			return a + b;
		}
		return 0;
	}
}

async function handleDownload(
	chatId: number,
	s: Session,
	limit: number | null,
): Promise<void> {
	if (s.busy) return;
	s.busy = true;

	const statusId = await say(chatId, progressText(0, limit ?? 0));

	try {
		const where = buildBulkWhere(bulkParams(s.filters));
		const matched = await prisma.topic.count({ where });
		if (matched === 0) {
			await editText(chatId, statusId, T.noResults);
			return;
		}

		const total = limit ? Math.min(limit, matched) : matched;
		const ctx: SendCtx = { fileIndex: 0, sent: 0 };
		await editText(chatId, statusId, progressText(0, total));

		for (let skip = 0; skip < total; skip += CHUNK) {
			const take = Math.min(CHUNK, total - skip);
			const got = await sendRange(chatId, where, skip, take, ctx);
			ctx.sent += got;
			await editText(chatId, statusId, progressText(ctx.sent, total));
		}

		if (statusId) {
			try {
				await tg("deleteMessage", { chat_id: chatId, message_id: statusId });
			} catch {
				// تجاهل
			}
		}

		let finalText: string;
		if (ctx.sent === 0) finalText = T.failed;
		else if (ctx.sent < total)
			finalText =
				T.partial + "\n📄 " + ctx.sent + " / " + total + " " + T.topics;
		else finalText = T.done + "\n📄 " + ctx.sent + " " + T.topics;

		await tg("sendMessage", {
			chat_id: chatId,
			text: finalText,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [[{ text: T.restart, callback_data: "restart" }]],
			},
		});
	} catch (err) {
		console.error("telegram download error:", err);
		await editText(chatId, statusId, T.error);
	} finally {
		s.busy = false;
	}
}

// ---------- معالجة التحديثات ----------
async function handleMessage(msg: TgMessage): Promise<void> {
	const chatId = msg.chat.id;
	const text = (msg.text || "").trim();

	if (text.startsWith("/start")) {
		const s = newSession();
		sessions.set(chatId, s);
		const meta = await getMeta();
		await tg("sendMessage", {
			chat_id: chatId,
			text: panel(s, meta, T.askYear),
			parse_mode: "HTML",
			disable_web_page_preview: true,
			reply_markup: yearKeyboard(s, meta),
		});
		return;
	}

	if (text.startsWith("/help")) {
		await say(chatId, T.help);
		return;
	}

	if (text) await say(chatId, T.useStart);
}

async function handleCallback(query: TgCallbackQuery): Promise<void> {
	const msg = query.message;
	if (!msg) return;
	const chatId = msg.chat.id;
	const messageId = msg.message_id;
	const data = query.data || "";
	const s = getSession(chatId);
	const meta = await getMeta();

	const sep = data.indexOf("|");
	const tag = sep === -1 ? data : data.slice(0, sep);
	const value = sep === -1 ? "" : data.slice(sep + 1);

	if (tag === "noop") {
		// مؤشر الصفحة
	} else if (tag === "up") {
		s.uPage = Number(value) || 0;
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "sp") {
		s.sPage = Number(value) || 0;
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "y") {
		s.filters.year = value;
		s.step = nextStep(s);
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "t") {
		if (value === "general") {
			s.filters.examType = "general";
			if (meta.mathSlug) s.filters.specialty = meta.mathSlug;
			else delete s.filters.specialty;
		} else if (value === "specialty") {
			s.filters.examType = "specialty";
			delete s.filters.specialty;
		} else {
			s.filters.examType = "*";
			delete s.filters.specialty;
		}
		s.sPage = 0;
		s.step = nextStep(s);
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "s") {
		s.filters.specialty = slugFromIndex(meta.specialties, value);
		s.step = nextStep(s);
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "u") {
		s.filters.university = slugFromIndex(meta.universities, value);
		s.step = nextStep(s);
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "n") {
		await tg("answerCallbackQuery", { callback_query_id: query.id });
		const limit = value === "*" ? null : Number(value) || null;
		await handleDownload(chatId, s, limit);
		return;
	} else if (tag === "back") {
		const target = prevStep(s);
		if (target === "year") delete s.filters.year;
		if (target === "type") {
			delete s.filters.examType;
			delete s.filters.specialty;
		}
		if (target === "specialty") delete s.filters.specialty;
		if (target === "university") delete s.filters.university;
		s.step = target;
		await showStep(chatId, messageId, s, meta);
	} else if (tag === "restart") {
		const fresh = newSession();
		sessions.set(chatId, fresh);
		await showStep(chatId, messageId, fresh, meta);
	}

	await tg("answerCallbackQuery", { callback_query_id: query.id });
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
	try {
		if (update.callback_query) {
			await handleCallback(update.callback_query);
		} else if (update.message) {
			await handleMessage(update.message);
		}
	} catch (err) {
		console.error("telegram update error:", err);
		const chatId =
			update.callback_query?.message?.chat.id ?? update.message?.chat.id;
		if (chatId) {
			try {
				await say(chatId, T.error);
			} catch {
				// تجاهل
			}
		}
	}
}
