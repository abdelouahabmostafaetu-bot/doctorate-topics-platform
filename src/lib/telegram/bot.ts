// ============================================================
//  بوت تيليجرام — يعمل داخل الموقع (Webhook)
//  التدفق: السنة ← النوع ← (التخصص) ← الجامعة ← العدد ← PDF
// ============================================================
import { prisma } from "@/lib/prisma";
import { buildExamHtml } from "@/lib/pdf/exam-template";
import { renderPdf } from "@/lib/pdf/generate";
import {
	buildBulkWhere,
	BULK_ORDER,
	MAX_BULK,
	partsCount,
} from "@/lib/pdf/bulk-filters";

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
const COLS = 2; // عدد الأعمدة في قوائم الجامعات/التخصصات
const ROWS = 8; // عدد الصفوف في الصفحة الواحدة
const PAGE_SIZE = COLS * ROWS;
const LABEL_MAX = 24; // أقصى طول لاسم الزر
const COUNT_CHOICES = [5, 10, 25, 50, 100, 200];

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
	preparing: "⏳ جارٍ تجهيز الملف...",
	preparingLong: "⏳ جارٍ تجهيز الملف...\nقد يستغرق بضع دقائق.",
	noResults: "⚠️ <b>لا توجد نتائج</b>\nجرّب معايير أوسع.",
	done: "✅ <b>تم التحميل</b>",
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
	await fetch(apiBase() + "/sendDocument", { method: "POST", body: form });
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

function stripPrefix(text: string): string {
	let s = text.trim();
	for (const p of AR_PREFIXES) {
		if (s.startsWith(p)) return s.slice(p.length).trim();
	}
	const lower = s.toLowerCase();
	for (const p of FR_PREFIXES) {
		if (lower.startsWith(p)) {
			s = s.slice(p.length).trim();
			break;
		}
	}
	return s.replace(/^(de |d'|du |des |la |le |لـ|ل )/i, "").trim();
}

// يختار أقصر اسم واضح: الاسم المختصر ← الاختصار الشهير ← الولاية
function shortLabel(
	nameAr: string | null,
	name: string | null,
	city: string | null,
	slug: string,
): string {
	const raw = (nameAr || name || slug).trim();
	const stripped = stripPrefix(raw);
	if (stripped.length > 0 && stripped.length <= LABEL_MAX) return stripped;

	const source = (name || "") + " " + raw;
	const paren = source.match(/\(([A-Za-z]{2,10})\)/);
	if (paren) return paren[1].toUpperCase();
	const acronym = source.match(/\b([A-Z]{3,10})\b/);
	if (acronym) return acronym[1].toUpperCase();

	const wilaya = (city || "").trim();
	if (wilaya && wilaya.length <= LABEL_MAX) return wilaya;

	const base = stripped || raw;
	return base.length > LABEL_MAX
		? base.slice(0, LABEL_MAX - 1) + "\u2026"
		: base;
}

// ---------- البيانات ----------
type Item = { slug: string; label: string };
type Meta = { universities: Item[]; specialties: Item[]; years: number[] };

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
};

const store = globalThis as unknown as {
	__botSessions?: Map<number, Session>;
	__botMeta?: Meta;
	__botMetaAt?: number;
};
const sessions: Map<number, Session> =
	store.__botSessions ?? (store.__botSessions = new Map<number, Session>());

function newSession(): Session {
	return { step: "year", filters: {}, uPage: 0, sPage: 0, total: 0 };
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

	const specItems: Item[] = specialties.map((s) => {
		const base = stripPrefix(s.nameAr || s.name || s.slug);
		return {
			slug: s.slug,
			label:
				base.length > LABEL_MAX ? base.slice(0, LABEL_MAX - 1) + "\u2026" : base,
		};
	});

	const meta: Meta = {
		universities: uniItems,
		specialties: specItems,
		years: years.map((y) => y.year),
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

// لوحة موجزة: سطر اختيارات + مؤشر تقدم بسيط
function panel(s: Session, meta: Meta, title: string, extra?: string): string {
	const f = s.filters;
	const bits: string[] = [];
	if (f.year !== undefined) bits.push("📅 " + esc(yearLabel(f.year)));
	if (f.examType !== undefined) bits.push("📝 " + esc(typeLabel(f.examType)));
	if (f.specialty !== undefined)
		bits.push("🎯 " + esc(labelFor(meta.specialties, f.specialty)));
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

// قائمة مقسّمة إلى صفحات مع تمرير دائري ثابت الموضع
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
	rows.push([
		{ text: "⬇️ الكل (" + total + ")", callback_data: "n|*" },
	]);
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

// ---------- توليد وإرسال الملف ----------
async function handleDownload(
	chatId: number,
	s: Session,
	limit: number | null,
): Promise<void> {
	const where = buildBulkWhere(bulkParams(s.filters));
	const matched = await prisma.topic.count({ where });
	if (matched === 0) {
		await say(chatId, T.noResults);
		return;
	}

	const total = limit ? Math.min(limit, matched) : matched;
	const totalParts = partsCount(total);
	const statusId = await say(
		chatId,
		total > 60 ? T.preparingLong : T.preparing,
	);

	let ok = false;
	try {
		for (let part = 1; part <= totalParts; part++) {
			const skip = (part - 1) * MAX_BULK;
			const take = Math.min(MAX_BULK, total - skip);
			if (take <= 0) break;

			const topics = await prisma.topic.findMany({
				where,
				include: { university: true, specialty: true },
				orderBy: BULK_ORDER,
				skip,
				take,
			});
			if (topics.length === 0) break;

			const html = buildExamHtml(topics, { toc: true });
			const pdf = await renderPdf(html);
			const filename =
				totalParts > 1
					? "doctorat-" + part + "-" + totalParts + ".pdf"
					: "doctorat-" + topics.length + "-sujets.pdf";
			const caption =
				totalParts > 1
					? "📄 " + part + " / " + totalParts + " — " + total + " " + T.topics
					: "📄 " + topics.length + " " + T.topics;

			await sendDocument(
				chatId,
				toArrayBuffer(new Uint8Array(pdf)),
				filename,
				caption,
			);
			ok = true;
		}
	} catch (err) {
		console.error("telegram download error:", err);
		await say(chatId, T.error);
	} finally {
		if (statusId) {
			try {
				await tg("deleteMessage", { chat_id: chatId, message_id: statusId });
			} catch {
				// تجاهل
			}
		}
	}

	if (ok) {
		await tg("sendMessage", {
			chat_id: chatId,
			text: T.done,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [[{ text: T.restart, callback_data: "restart" }]],
			},
		});
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
		// مؤشر رقم الصفحة — بلا تأثير
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
		s.filters.examType = value;
		if (value !== "specialty") delete s.filters.specialty;
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
