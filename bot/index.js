"use strict";

// ============================================================
//  بوت تيليجرام — منصة مواضيع دكتوراه الرياضيات
//  التدفق: الجامعة ← السنة ← التخصص ← نوع المسابقة ← تحميل PDF
//  «الكل» في أي خطوة = عدم التقييد (نفس خيار الموقع لتحميل الكل)
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

// ---------- النصوص العربية ----------
const T = {
	welcome:
		"👋 أهلاً بك في بوت مواضيع دكتوراه الرياضيات.\n\nاختر الجامعة أو اضغط زر «الكل» لتصفح كل الجامعات:",
	chooseUniversity: "🏛️ اختر الجامعة:",
	chooseYear: "📅 اختر السنة:",
	chooseSpecialty: "📚 اختر التخصص:",
	chooseExamType: "📝 اختر نوع المسابقة:",
	all: "الكل 🌐",
	general: "عام (général)",
	specialtyType: "تخصص (spécialité)",
	back: "⬅️ رجوع",
	restart: "🔄 من البداية",
	download: "⬇️ تحميل PDF",
	generating:
		"⏳ جارٍ تجهيز الملف... قد يستغرق ذلك دقائق للرزم الكبيرة.",
	noResults:
		"⚠️ لا توجد مواضيع مطابقة للفلاتر المختارة.",
	done: "✅ تم التحميل. لبحث جديد:",
	error:
		"❌ حدث خطأ. أعد المحاولة لاحقًا أو اكتب /start.",
	useStart:
		"اكتب /start لبدء اختيار المواضيع وتحميلها.",
	summaryTitle: "🔎 اختيارك:",
	labelUniversity: "الجامعة",
	labelYear: "السنة",
	labelSpecialty: "التخصص",
	labelExamType: "النوع",
};

// ---------- حالة المستخدمين ----------
const sessions = new Map();
function getSession(chatId) {
	let s = sessions.get(chatId);
	if (!s) {
		s = { step: "university", filters: {} };
		sessions.set(chatId, s);
	}
	return s;
}

// ---------- تخزين مؤقت للفلاتر ----------
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

// ---------- أدوات لوحة الأزرار ----------
function chunk(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

function universityKeyboard(meta) {
	const rows = [[{ text: T.all, callback_data: "u|*" }]];
	const btns = (meta.universities || []).map((u) => ({
		text: u.name,
		callback_data: "u|" + u.slug,
	}));
	for (const row of chunk(btns, 2)) rows.push(row);
	return { inline_keyboard: rows };
}

function yearKeyboard(meta) {
	const rows = [[{ text: T.all, callback_data: "y|*" }]];
	const btns = (meta.years || []).map((y) => ({
		text: String(y),
		callback_data: "y|" + y,
	}));
	for (const row of chunk(btns, 3)) rows.push(row);
	rows.push([{ text: T.back, callback_data: "back|university" }]);
	return { inline_keyboard: rows };
}

function specialtyKeyboard(meta) {
	const rows = [[{ text: T.all, callback_data: "s|*" }]];
	const btns = (meta.specialties || []).map((s) => ({
		text: s.name,
		callback_data: "s|" + s.slug,
	}));
	for (const row of chunk(btns, 2)) rows.push(row);
	rows.push([{ text: T.back, callback_data: "back|year" }]);
	return { inline_keyboard: rows };
}

function examTypeKeyboard() {
	return {
		inline_keyboard: [
			[{ text: T.all, callback_data: "e|*" }],
			[
				{ text: T.general, callback_data: "e|general" },
				{ text: T.specialtyType, callback_data: "e|specialty" },
			],
			[{ text: T.back, callback_data: "back|specialty" }],
		],
	};
}

function summaryKeyboard() {
	return {
		inline_keyboard: [
			[{ text: T.download, callback_data: "dl" }],
			[{ text: T.back, callback_data: "back|examType" }],
			[{ text: T.restart, callback_data: "restart" }],
		],
	};
}

function nameFor(list, slug) {
	if (!slug || slug === "*") return T.all;
	const found = (list || []).find((x) => x.slug === slug);
	return found ? found.name : slug;
}

function examTypeLabel(v) {
	if (!v || v === "*") return T.all;
	if (v === "general") return T.general;
	if (v === "specialty") return T.specialtyType;
	return v;
}

function summaryText(s, meta) {
	const f = s.filters;
	return (
		T.summaryTitle +
		"\n\n• " + T.labelUniversity + ": " + nameFor(meta.universities, f.university) +
		"\n• " + T.labelYear + ": " + (!f.year || f.year === "*" ? T.all : f.year) +
		"\n• " + T.labelSpecialty + ": " + nameFor(meta.specialties, f.specialty) +
		"\n• " + T.labelExamType + ": " + examTypeLabel(f.examType) +
		"\n\n" + T.download + " ⤴️"
	);
}

async function editView(chatId, messageId, text, keyboard) {
	try {
		await bot.editMessageText(text, {
			chat_id: chatId,
			message_id: messageId,
			reply_markup: keyboard,
		});
	} catch (e) {
		// تجاهل message is not modified وإرسال رسالة جديدة عند الحاجة
		try {
			await bot.sendMessage(chatId, text, { reply_markup: keyboard });
		} catch (_) {}
	}
}

function extractFilename(res, fallback) {
	const cd = res.headers.get("content-disposition") || "";
	const m = cd.match(/filename="?([^";]+)"?/);
	return m ? m[1] : fallback;
}

// ---------- التحميل ----------
async function handleDownload(chatId, s) {
	const f = s.filters;
	const params = new URLSearchParams();
	if (f.university && f.university !== "*") params.set("university", f.university);
	if (f.year && f.year !== "*") params.set("year", f.year);
	if (f.specialty && f.specialty !== "*") params.set("specialty", f.specialty);
	if (f.examType && f.examType !== "*") params.set("examType", f.examType);

	const statusMsg = await bot.sendMessage(chatId, T.generating);
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
				await bot.sendMessage(chatId, T.noResults);
				break;
			}
			if (!res.ok) {
				await bot.sendMessage(chatId, T.error);
				break;
			}
			totalParts = parseInt(res.headers.get("x-total-parts") || "1", 10) || 1;
			const totalTopics = res.headers.get("x-total-topics") || "?";
			const buf = Buffer.from(await res.arrayBuffer());
			const filename = extractFilename(res, `doctorat-part-${part}.pdf`);
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
		await bot.sendMessage(chatId, T.error);
	} finally {
		await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
	}

	if (ok) {
		await bot.sendMessage(chatId, T.done, {
			reply_markup: {
				inline_keyboard: [[{ text: T.restart, callback_data: "restart" }]],
			},
		});
	}
}

// ---------- الأوامر ----------
bot.onText(/^\/start\b/, async (msg) => {
	const chatId = msg.chat.id;
	sessions.set(chatId, { step: "university", filters: {} });
	try {
		const meta = await getMeta();
		await bot.sendMessage(chatId, T.welcome, {
			reply_markup: universityKeyboard(meta),
		});
	} catch (e) {
		console.error(e);
		await bot.sendMessage(chatId, T.error);
	}
});

bot.onText(/^\/help\b/, async (msg) => {
	await bot.sendMessage(msg.chat.id, T.useStart);
});

// أي نص آخر
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
		const idx = data.indexOf("|");
		const tag = idx === -1 ? data : data.slice(0, idx);
		const value = idx === -1 ? "" : data.slice(idx + 1);

		if (tag === "u") {
			s.filters.university = value;
			s.step = "year";
			await editView(chatId, messageId, T.chooseYear, yearKeyboard(meta));
		} else if (tag === "y") {
			s.filters.year = value;
			s.step = "specialty";
			await editView(chatId, messageId, T.chooseSpecialty, specialtyKeyboard(meta));
		} else if (tag === "s") {
			s.filters.specialty = value;
			s.step = "examType";
			await editView(chatId, messageId, T.chooseExamType, examTypeKeyboard());
		} else if (tag === "e") {
			s.filters.examType = value;
			s.step = "ready";
			await editView(chatId, messageId, summaryText(s, meta), summaryKeyboard());
		} else if (tag === "back") {
			if (value === "university") {
				s.step = "university";
				await editView(chatId, messageId, T.chooseUniversity, universityKeyboard(meta));
			} else if (value === "year") {
				s.step = "year";
				await editView(chatId, messageId, T.chooseYear, yearKeyboard(meta));
			} else if (value === "specialty") {
				s.step = "specialty";
				await editView(chatId, messageId, T.chooseSpecialty, specialtyKeyboard(meta));
			} else if (value === "examType") {
				s.step = "examType";
				await editView(chatId, messageId, T.chooseExamType, examTypeKeyboard());
			}
		} else if (tag === "restart") {
			s.filters = {};
			s.step = "university";
			await editView(chatId, messageId, T.chooseUniversity, universityKeyboard(meta));
		} else if (tag === "dl") {
			await handleDownload(chatId, s);
		}
		await bot.answerCallbackQuery(query.id).catch(() => {});
	} catch (e) {
		console.error("callback error", e);
		await bot.answerCallbackQuery(query.id, { text: T.error }).catch(() => {});
	}
});

bot.on("polling_error", (err) => {
	console.error("polling_error:", err && err.message ? err.message : err);
});

console.log("✅ Bot is running (polling)...");
