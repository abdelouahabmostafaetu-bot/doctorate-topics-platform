"use strict";

// ============================================================
//  بوت تيليجرام — منصة مواضيع دكتوراه الرياضيات
//
//  التدفق (رسالة واحدة تتحدّث في مكانها):
//    1) السنة
//    2) نوع المسابقة (عام / تخصص)
//    3) التخصص  ← يظهر فقط إذا اختار «تخصص»
//    4) الجامعة
//    5) عدد المواضيع المراد تحميلها ← ثم يصل ملف PDF
//
//  «الكل» في أي خطوة = بلا تقييد (نفس خيار الموقع)
//
//  ملاحظة: تيليجرام يحدد callback_data بـ 64 بايت، لذلك نرسل رقم
//  العنصر (index) بدل الـ slug الطويل، ونقسّم القوائم إلى صفحات.
// ============================================================

const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = (process.env.PLATFORM_API_BASE || "").replace(/\/$/, "");
const BOT_API_SECRET = process.env.BOT_API_SECRET;

if (!TOKEN) {
	console.error("❌ متغير TELEGRAM_BOT_TOKEN مفقود");
	process.exit(1);
}
if (!API_BASE) {
	console.error("❌ متغير PLATFORM_API_BASE مفقود");
	process.exit(1);
}
if (!BOT_API_SECRET) {
	console.error("❌ متغير BOT_API_SECRET مفقود");
	process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ---------- إعدادات العرض ----------
const PAGE_SIZE = 8;
const MAX_LABEL = 42;
const RULE = "───────────────────";
const COUNT_CHOICES = [5, 10, 25, 50, 100, 200];

// ---------- النصوص ----------
const T = {
	brand: "📘 <b>مواضيع دكتوراه الرياضيات</b>",
	intro:
		"مرحبًا بك 👋\nاختر معايير البحث خطوة بخطوة، وستحصل على ملف PDF جاهز للتحميل.",
	askYear: "📅 <b>اختر السنة</b>",
	askType: "📝 <b>اختر نوع المسابقة</b>",
	askSpecialty: "🎯 <b>اختر التخصص</b>",
	askUniversity: "🏛️ <b>اختر الجامعة</b>",
	askCount: "🔢 <b>كم موضوعًا تريد تحميله؟</b>",
	all: "الكل",
	allGlobe: "🌐 الكل",
	general: "📘 عام",
	specialtyType: "🎯 تخصص",
	generalPlain: "عام",
	specialtyPlain: "تخصص",
	back: "⬅️ رجوع",
	restart: "🔄 بحث جديد",
	search: "🔍 ابدأ البحث",
	labelYear: "السنة",
	labelType: "النوع",
	labelSpecialty: "التخصص",
	labelUniversity: "الجامعة",
	step: "الخطوة",
	of: "من",
	available: "المواضيع المتاحة",
	preparing: "⏳ جارٍ تجهيز الملف...",
	preparingLong:
		"⏳ جارٍ تجهيز الملف...\nقد يستغرق ذلك بضع دقائق للرزم الكبيرة، يرجى الانتظار.",
	noResults:
		"⚠️ <b>لا توجد نتائج</b>\nلم نعثر على مواضيع مطابقة لاختيارك. جرّب معايير أوسع.",
	done: "✅ <b>تم التحميل بنجاح</b>",
	error:
		"❌ <b>حدث خطأ</b>\nأعد المحاولة لاحقًا أو اكتب /start",
	useStart: "اكتب /start لبدء البحث عن المواضيع وتحميلها.",
	help:
		"ℹ️ <b>المساعدة</b>\n\n/start — بدء بحث جديد\n/help — عرض هذه الرسالة\n\nاختر: السنة ← النوع ← التخصص ← الجامعة ← العدد، ثم استلم ملف PDF.",
};

// ---------- أدوات عامة ----------
function esc(text) {
	return String(text == null ? "" : text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function truncate(text, max) {
	const t = String(text == null ? "" : text);
	return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function chunk(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

// ---------- حالة المستخدمين ----------
function newSession() {
	return { step: "year", filters: {}, uPage: 0, sPage: 0, total: null };
}
const sessions = new Map();
function getSession(chatId) {
	let s = sessions.get(chatId);
	if (!s) {
		s = newSession();
		sessions.set(chatId, s);
	}
	return s;
}

// ترتيب الخطوات — خطوة التخصص تظهر فقط عند اختيار «تخصص»
function stepList(s) {
	const arr = ["year", "type"];
	if (s.filters.examType === "specialty") arr.push("specialty");
	arr.push("university", "count");
	return arr;
}

function nextStep(s) {
	const list = stepList(s);
	const i = list.indexOf(s.step);
	return i >= 0 && i < list.length - 1 ? list[i + 1] : s.step;
}

function prevStep(s) {
	const list = stepList(s);
	const i = list.indexOf(s.step);
	return i > 0 ? list[i - 1] : list[0];
}

// ---------- الاتصال بالموقع ----------
let metaCache = null;
let metaCacheAt = 0;

async function getMeta() {
	const now = Date.now();
	if (metaCache && now - metaCacheAt < 10 * 60 * 1000) return metaCache;
	const res = await fetch(`${API_BASE}/api/bot/meta`, {
		headers: { "x-bot-secret": BOT_API_SECRET },
	});
	if (!res.ok) throw new Error("meta failed: " + res.status);
	metaCache = await res.json();
	metaCacheAt = now;
	return metaCache;
}

function filterParams(f) {
	const params = new URLSearchParams();
	if (f.university && f.university !== "*") params.set("university", f.university);
	if (f.year && f.year !== "*") params.set("year", f.year);
	if (f.specialty && f.specialty !== "*") params.set("specialty", f.specialty);
	if (f.examType && f.examType !== "*") params.set("examType", f.examType);
	return params;
}

async function getCount(f) {
	const res = await fetch(
		`${API_BASE}/api/bot/count?${filterParams(f).toString()}`,
		{ headers: { "x-bot-secret": BOT_API_SECRET } },
	);
	if (!res.ok) throw new Error("count failed: " + res.status);
	const data = await res.json();
	return Number(data.total) || 0;
}

// ---------- أسماء القيم ----------
function slugFromIndex(list, value) {
	if (value === "*") return "*";
	const item = (list || [])[Number(value)];
	return item && item.slug ? item.slug : "*";
}

function nameFor(list, slug) {
	if (!slug || slug === "*") return T.all;
	const found = (list || []).find((x) => x.slug === slug);
	return found ? found.name : slug;
}

function yearLabel(v) {
	return !v || v === "*" ? T.all : String(v);
}

function typeLabel(v) {
	if (v === "general") return T.generalPlain;
	if (v === "specialty") return T.specialtyPlain;
	return T.all;
}

// ---------- لوحة الملخص ----------
function panel(s, meta, title, extra) {
	const f = s.filters;
	const lines = [T.brand, RULE];

	const chosen = [];
	if (f.year !== undefined)
		chosen.push("📅 " + T.labelYear + ": <b>" + esc(yearLabel(f.year)) + "</b>");
	if (f.examType !== undefined)
		chosen.push("📝 " + T.labelType + ": <b>" + esc(typeLabel(f.examType)) + "</b>");
	if (f.specialty !== undefined)
		chosen.push(
			"🎯 " + T.labelSpecialty + ": <b>" + esc(nameFor(meta.specialties, f.specialty)) + "</b>",
		);
	if (f.university !== undefined)
		chosen.push(
			"🏛️ " + T.labelUniversity + ": <b>" + esc(nameFor(meta.universities, f.university)) + "</b>",
		);

	if (chosen.length) {
		for (const c of chosen) lines.push(c);
		lines.push(RULE);
	}

	const list = stepList(s);
	const n = list.indexOf(s.step) + 1;
	lines.push("<i>" + T.step + " " + n + " " + T.of + " " + list.length + "</i>");
	lines.push("");
	lines.push(title);
	if (extra) {
		lines.push("");
		lines.push(extra);
	}
	return lines.join("\n");
}

// ---------- لوحات الأزرار ----------
function backRow(s) {
	const list = stepList(s);
	if (list.indexOf(s.step) <= 0) return null;
	return [{ text: T.back, callback_data: "back" }];
}

function footerRows(s) {
	const rows = [];
	const b = backRow(s);
	if (b) rows.push(b);
	rows.push([{ text: T.restart, callback_data: "restart" }]);
	return rows;
}

// لوحة مقسمة إلى صفحات — callback_data يحمل رقم العنصر فقط
function pagedKeyboard(s, items, tag, page) {
	const list = items || [];
	const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
	let p = Number(page) || 0;
	if (p < 0) p = 0;
	if (p > totalPages - 1) p = totalPages - 1;

	const rows = [[{ text: T.allGlobe, callback_data: tag + "|*" }]];
	const start = p * PAGE_SIZE;
	const slice = list.slice(start, start + PAGE_SIZE);
	for (let i = 0; i < slice.length; i++) {
		rows.push([
			{
				text: truncate(slice[i].name, MAX_LABEL),
				callback_data: tag + "|" + (start + i),
			},
		]);
	}
	if (totalPages > 1) {
		const nav = [];
		if (p > 0) nav.push({ text: "◀️", callback_data: tag + "p|" + (p - 1) });
		nav.push({ text: p + 1 + " / " + totalPages, callback_data: "noop" });
		if (p < totalPages - 1)
			nav.push({ text: "▶️", callback_data: tag + "p|" + (p + 1) });
		rows.push(nav);
	}
	for (const r of footerRows(s)) rows.push(r);
	return { inline_keyboard: rows };
}

function yearKeyboard(s, meta) {
	const rows = [[{ text: T.allGlobe, callback_data: "y|*" }]];
	const btns = (meta.years || []).map((y) => ({
		text: String(y),
		callback_data: "y|" + y,
	}));
	for (const row of chunk(btns, 3)) rows.push(row);
	for (const r of footerRows(s)) rows.push(r);
	return { inline_keyboard: rows };
}

function typeKeyboard(s) {
	const rows = [
		[{ text: T.general, callback_data: "t|general" }],
		[{ text: T.specialtyType, callback_data: "t|specialty" }],
		[{ text: T.allGlobe, callback_data: "t|*" }],
	];
	for (const r of footerRows(s)) rows.push(r);
	return { inline_keyboard: rows };
}

function countKeyboard(s, total) {
	const opts = COUNT_CHOICES.filter((n) => n < total);
	const btns = opts.map((n) => ({ text: String(n), callback_data: "n|" + n }));
	const rows = [];
	for (const row of chunk(btns, 3)) rows.push(row);
	rows.push([
		{ text: "⬇️ تحميل الكل (" + total + ")", callback_data: "n|*" },
	]);
	for (const r of footerRows(s)) rows.push(r);
	return { inline_keyboard: rows };
}

// ---------- العرض ----------
async function showStep(chatId, messageId, s, meta) {
	let text;
	let keyboard;

	if (s.step === "year") {
		text = panel(s, meta, T.askYear);
		keyboard = yearKeyboard(s, meta);
	} else if (s.step === "type") {
		text = panel(s, meta, T.askType);
		keyboard = typeKeyboard(s);
	} else if (s.step === "specialty") {
		text = panel(s, meta, T.askSpecialty);
		keyboard = pagedKeyboard(s, meta.specialties, "s", s.sPage);
	} else if (s.step === "university") {
		text = panel(s, meta, T.askUniversity);
		keyboard = pagedKeyboard(s, meta.universities, "u", s.uPage);
	} else if (s.step === "count") {
		let total = 0;
		try {
			total = await getCount(s.filters);
		} catch (e) {
			console.error("count error", e);
		}
		s.total = total;
		if (total === 0) {
			text = panel(s, meta, T.noResults);
			keyboard = { inline_keyboard: footerRows(s) };
		} else {
			text = panel(
				s,
				meta,
				T.askCount,
				"📊 " + T.available + ": <b>" + total + "</b>",
			);
			keyboard = countKeyboard(s, total);
		}
	} else {
		return;
	}

	await render(chatId, messageId, text, keyboard);
}

async function render(chatId, messageId, text, keyboard) {
	const options = {
		parse_mode: "HTML",
		reply_markup: keyboard,
		disable_web_page_preview: true,
	};
	if (messageId) {
		try {
			await bot.editMessageText(text, {
				chat_id: chatId,
				message_id: messageId,
				...options,
			});
			return messageId;
		} catch (e) {
			// إذا فشل التعديل (محتوى مطابق أو رسالة قديمة) نرسل رسالة جديدة
		}
	}
	const sent = await bot.sendMessage(chatId, text, options);
	return sent.message_id;
}

// ---------- استخراج اسم الملف ----------
function extractFilename(res, fallback) {
	const cd = res.headers.get("content-disposition") || "";
	const m = cd.match(/filename="?([^";]+)"?/);
	return m ? m[1] : fallback;
}

// ---------- التحميل ----------
async function handleDownload(chatId, s, limit) {
	const params = filterParams(s.filters);
	if (limit) params.set("limit", String(limit));

	const wanted = limit || s.total || 0;
	const statusMsg = await bot.sendMessage(
		chatId,
		wanted > 60 ? T.preparingLong : T.preparing,
		{ parse_mode: "HTML" },
	);

	let ok = false;
	try {
		let part = 1;
		let totalParts = 1;
		while (part <= totalParts) {
			params.set("part", String(part));
			const res = await fetch(`${API_BASE}/api/bot/pdf?${params.toString()}`, {
				headers: { "x-bot-secret": BOT_API_SECRET },
			});
			if (res.status === 404) {
				if (part === 1)
					await bot.sendMessage(chatId, T.noResults, { parse_mode: "HTML" });
				break;
			}
			if (!res.ok) {
				console.error("pdf failed: " + res.status);
				await bot.sendMessage(chatId, T.error, { parse_mode: "HTML" });
				break;
			}
			totalParts = parseInt(res.headers.get("x-total-parts") || "1", 10) || 1;
			const totalTopics = res.headers.get("x-total-topics") || "?";
			const buf = Buffer.from(await res.arrayBuffer());
			const filename = extractFilename(res, `doctorat-${part}.pdf`);
			const caption =
				totalParts > 1
					? `📄 الجزء ${part} من ${totalParts} — إجمالي ${totalTopics} موضوعًا`
					: `📄 ${totalTopics} موضوعًا`;
			await bot.sendDocument(
				chatId,
				buf,
				{ caption },
				{ filename, contentType: "application/pdf" },
			);
			ok = true;
			part++;
		}
	} catch (e) {
		console.error("download error", e);
		await bot.sendMessage(chatId, T.error, { parse_mode: "HTML" });
	} finally {
		await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
	}

	if (ok) {
		await bot.sendMessage(chatId, T.done, {
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [[{ text: T.restart, callback_data: "restart" }]],
			},
		});
	}
}

// ---------- الأوامر ----------
bot.onText(/^\/start\b/, async (msg) => {
	const chatId = msg.chat.id;
	const s = newSession();
	sessions.set(chatId, s);
	try {
		const meta = await getMeta();
		const text = [T.brand, RULE, T.intro, "", T.askYear].join("\n");
		await bot.sendMessage(chatId, text, {
			parse_mode: "HTML",
			reply_markup: yearKeyboard(s, meta),
			disable_web_page_preview: true,
		});
	} catch (e) {
		console.error("start error", e);
		await bot.sendMessage(chatId, T.error, { parse_mode: "HTML" });
	}
});

bot.onText(/^\/help\b/, async (msg) => {
	await bot.sendMessage(msg.chat.id, T.help, { parse_mode: "HTML" });
});

bot.on("message", async (msg) => {
	if (!msg.text) return;
	if (msg.text.startsWith("/")) return;
	await bot.sendMessage(msg.chat.id, T.useStart);
});

// ---------- الأزرار ----------
bot.on("callback_query", async (query) => {
	const chatId = query.message.chat.id;
	const messageId = query.message.message_id;
	const data = query.data || "";
	const s = getSession(chatId);

	try {
		const meta = await getMeta();
		const sep = data.indexOf("|");
		const tag = sep === -1 ? data : data.slice(0, sep);
		const value = sep === -1 ? "" : data.slice(sep + 1);

		if (tag === "noop") {
			// زر رقم الصفحة — لا يفعل شيئًا
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
			// عند ترك مسار التخصص نمسح التخصص المختار سابقًا
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
			const limit = value === "*" ? null : Number(value) || null;
			await bot.answerCallbackQuery(query.id).catch(() => {});
			await handleDownload(chatId, s, limit);
			return;
		} else if (tag === "back") {
			const target = prevStep(s);
			// مسح قيمة الخطوة التي نعود إليها حتى يعيد اختيارها
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

		await bot.answerCallbackQuery(query.id).catch(() => {});
	} catch (e) {
		console.error("callback error", e);
		await bot
			.answerCallbackQuery(query.id, { text: "❌ حدث خطأ", show_alert: false })
			.catch(() => {});
	}
});

bot.on("polling_error", (err) => {
	console.error("polling_error:", err && err.message ? err.message : err);
});

console.log("✅ Bot is running (polling)...");
