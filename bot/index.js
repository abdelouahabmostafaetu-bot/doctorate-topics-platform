"use strict";

// ============================================================
//  بوت تيليجرام — منصة مواضيع دكتوراه الرياضيات
//  التدفق: الجامعة ← السنة ← التخصص ← نوع المسابقة ← تحميل PDF
//  "الكل" في أي خطوة = عدم التقييد (نفس خيار الموقع لتحميل الكل)
// ============================================================

const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = (process.env.PLATFORM_API_BASE || "").replace(/\/$/, "");
const BOT_API_SECRET = process.env.BOT_API_SECRET;

if (!TOKEN) {
	console.error("\u274C \u0645\u062A\u063A\u064A\u0631 TELEGRAM_BOT_TOKEN \u0645\u0641\u0642\u0648\u062F");
	process.exit(1);
}
if (!API_BASE) {
	console.error("\u274C \u0645\u062A\u063A\u064A\u0631 PLATFORM_API_BASE \u0645\u0641\u0642\u0648\u062F");
	process.exit(1);
}
if (!BOT_API_SECRET) {
	console.error("\u274C \u0645\u062A\u063A\u064A\u0631 BOT_API_SECRET \u0645\u0641\u0642\u0648\u062F");
	process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ---------- \u0627\u0644\u0646\u0635\u0648\u0635 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 ----------
const T = {
	welcome:
		"\uD83D\uDC4B \u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0628\u0648\u062A \u0645\u0648\u0627\u0636\u064A\u0639 \u062F\u0643\u062A\u0648\u0631\u0627\u0647 \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A.\n\n\u0627\u062E\u062A\u0631 \u0627\u0644\u062C\u0627\u0645\u0639\u0629 \u0623\u0648 \u0627\u0636\u063A\u0637 \"\u0627\u0644\u0643\u0644\" \u0644\u062A\u0635\u0641\u062D \u0643\u0644 \u0627\u0644\u062C\u0627\u0645\u0639\u0627\u062A:",
	chooseUniversity: "\uD83C\uDFDB\uFE0F \u0627\u062E\u062A\u0631 \u0627\u0644\u062C\u0627\u0645\u0639\u0629:",
	chooseYear: "\uD83D\uDCC5 \u0627\u062E\u062A\u0631 \u0627\u0644\u0633\u0646\u0629:",
	chooseSpecialty: "\uD83D\uDCDA \u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u062E\u0635\u0635:",
	chooseExamType: "\uD83D\uDCDD \u0627\u062E\u062A\u0631 \u0646\u0648\u0639 \u0627\u0644\u0645\u0633\u0627\u0628\u0642\u0629:",
	all: "\u0627\u0644\u0643\u0644 \uD83C\uDF10",
	general: "\u0639\u0627\u0645 (g\u00E9n\u00E9ral)",
	specialtyType: "\u062A\u062E\u0635\u0635 (sp\u00E9cialit\u00E9)",
	back: "\u2B05\uFE0F \u0631\u062C\u0648\u0639",
	restart: "\uD83D\uDD04 \u0645\u0646 \u0627\u0644\u0628\u062F\u0627\u064A\u0629",
	download: "\u2B07\uFE0F \u062A\u062D\u0645\u064A\u0644 PDF",
	generating:
		"\u23F3 \u062C\u0627\u0631\u064D \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0645\u0644\u0641... \u0642\u062F \u064A\u0633\u062A\u063A\u0631\u0642 \u0630\u0644\u0643 \u062F\u0642\u0627\u0626\u0642 \u0644\u0644\u0631\u0632\u0645 \u0627\u0644\u0643\u0628\u064A\u0631\u0629.",
	noResults:
		"\u26A0\uFE0F \u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0648\u0627\u0636\u064A\u0639 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0641\u0644\u0627\u062A\u0631 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629.",
	done: "\u2705 \u062A\u0645 \u0627\u0644\u062A\u062D\u0645\u064A\u0644. \u0644\u0628\u062D\u062B \u062C\u062F\u064A\u062F:",
	error:
		"\u274C \u062D\u062F\u062B \u062E\u0637\u0623. \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u064B\u0627 \u0623\u0648 \u0627\u0643\u062A\u0628 /start.",
	useStart:
		"\u0627\u0643\u062A\u0628 /start \u0644\u0628\u062F\u0621 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0636\u064A\u0639 \u0648\u062A\u062D\u0645\u064A\u0644\u0647\u0627.",
	summaryTitle: "\uD83D\uDD0E \u0627\u062E\u062A\u064A\u0627\u0631\u0643:",
	labelUniversity: "\u0627\u0644\u062C\u0627\u0645\u0639\u0629",
	labelYear: "\u0627\u0644\u0633\u0646\u0629",
	labelSpecialty: "\u0627\u0644\u062A\u062E\u0635\u0635",
	labelExamType: "\u0627\u0644\u0646\u0648\u0639",
};

// ---------- \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 ----------
const sessions = new Map();
function getSession(chatId) {
	let s = sessions.get(chatId);
	if (!s) {
		s = { step: "university", filters: {} };
		sessions.set(chatId, s);
	}
	return s;
}

// ---------- \u062A\u062E\u0632\u064A\u0646 \u0645\u0624\u0642\u062A \u0644\u0644\u0641\u0644\u0627\u062A\u0631 ----------
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

// ---------- \u0623\u062F\u0648\u0627\u062A \u0644\u0648\u062D\u0629 \u0627\u0644\u0623\u0632\u0631\u0627\u0631 ----------
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
		"\n\n\u2022 " + T.labelUniversity + ": " + nameFor(meta.universities, f.university) +
		"\n\u2022 " + T.labelYear + ": " + (!f.year || f.year === "*" ? T.all : f.year) +
		"\n\u2022 " + T.labelSpecialty + ": " + nameFor(meta.specialties, f.specialty) +
		"\n\u2022 " + T.labelExamType + ": " + examTypeLabel(f.examType) +
		"\n\n" + T.download + " \u2934\uFE0F"
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
		// \u062A\u062C\u0627\u0647\u0644 \"message is not modified\" \u0648\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629
		try {
			await bot.sendMessage(chatId, text, { reply_markup: keyboard });
		} catch (_) {}
	}
}

function extractFilename(res, fallback) {
	const cd = res.headers.get("content-disposition") || "";
	const m = cd.match(/filename=\"?([^\";]+)\"?/);
	return m ? m[1] : fallback;
}

// ---------- \u0627\u0644\u062A\u062D\u0645\u064A\u0644 ----------
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
					? `\uD83D\uDCC4 \u0627\u0644\u062C\u0632\u0621 ${part} \u0645\u0646 ${totalParts} \u2014 \u0625\u062C\u0645\u0627\u0644\u064A ${totalTopics} \u0645\u0648\u0636\u0648\u0639\u064B\u0627`
					: `\uD83D\uDCC4 ${totalTopics} \u0645\u0648\u0636\u0648\u0639\u064B\u0627`;
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

// ---------- \u0627\u0644\u0623\u0648\u0627\u0645\u0631 ----------
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

// \u0623\u064A \u0646\u0635 \u0622\u062E\u0631\nbot.on("message", async (msg) => {
	if (!msg.text) return;
	if (msg.text.startsWith("/")) return;
	await bot.sendMessage(msg.chat.id, T.useStart);
});

// ---------- \u0627\u0644\u0623\u0632\u0631\u0627\u0631 ----------
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

console.log("\u2705 Bot is running (polling)...");
