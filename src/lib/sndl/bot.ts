// بوت تيليجرام خاص بالمالك وحده: ترسل DOI فيعيد لك ملف PDF.
import { extractDoi } from "./proxy";
import { fetchMeta, getArticlePdf, type ArticleMeta } from "./article";

export const TELEGRAM_HOST = "https://api.telegram.org";

/** حدّ يومي واقٍ — التحميل الكثيف قد يوقف اشتراك SNDL عن الجامعة كلها. */
const DAILY_LIMIT = 12;

type Quota = { day: string; used: number };
const g = globalThis as unknown as { __sndlQuota?: Quota; __sndlBusy?: boolean };

export type TgUpdate = {
	message?: {
		message_id?: number;
		text?: string;
		chat?: { id?: number };
	};
};

const T = {
	welcome:
		"📚 <b>مساعد المقالات العلمية</b>\n\nأرسل لي <b>DOI</b> أو رابطه، وأعيد لك الملف.\n\n<code>10.1016/j.jmaa.2025.130277</code>\n\nأبحث أولًا في المصادر المفتوحة، وإن لم أجد فعبر حسابك في SNDL.",
	notOwner: "⛔️ هذا البوت خاص.",
	noDoi:
		"🤔 لم أجد DOI في رسالتك.\n\nمثال:\n<code>10.1016/j.jmaa.2025.130277</code>",
	busy: "⏳ هناك طلب قيد التنفيذ — انتظر انتهاءه.",
	limit: "🚦 بلغتَ الحدّ اليومي (" + DAILY_LIMIT + " مقالًا). جرّب غدًا.",
	checking: "🔎 أتحقّق من الـ DOI…",
	searchingOa: "🌍 أبحث في المصادر المفتوحة…",
	searchingSndl: "🏛️ أدخل إلى SNDL وأجلب الملف…",
	notFound:
		"❌ لم أستطع جلب الملف.\n\nقد يكون الناشر خارج اشتراك SNDL، أو المقال غير متاح إلكترونيًا.",
	badDoi: "❌ هذا الـ DOI غير مسجَّل. تحقّق منه.",
};

function api(): string {
	const token = process.env.SNDL_BOT_TOKEN;
	if (!token) throw new Error("SNDL_BOT_TOKEN غير مضبوط");
	return TELEGRAM_HOST + "/bot" + token;
}

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

async function say(chatId: number, text: string): Promise<number | null> {
	try {
		const r = await fetch(api() + "/sendMessage", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: "HTML",
				disable_web_page_preview: true,
			}),
		});
		const j = (await r.json()) as { result?: { message_id?: number } };
		return j.result?.message_id ?? null;
	} catch {
		return null;
	}
}

async function editText(
	chatId: number,
	messageId: number | null,
	text: string,
): Promise<void> {
	if (!messageId) {
		await say(chatId, text);
		return;
	}
	try {
		await fetch(api() + "/editMessageText", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
				text,
				parse_mode: "HTML",
				disable_web_page_preview: true,
			}),
		});
	} catch {
		// تجاهل
	}
}

async function sendDocument(
	chatId: number,
	bytes: Uint8Array,
	filename: string,
	caption: string,
): Promise<void> {
	const ab = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(ab).set(bytes);
	const form = new FormData();
	form.append("chat_id", String(chatId));
	form.append("caption", caption);
	form.append("parse_mode", "HTML");
	form.append(
		"document",
		new Blob([ab], { type: "application/pdf" }),
		filename,
	);
	const r = await fetch(api() + "/sendDocument", { method: "POST", body: form });
	const j = (await r.json()) as { ok?: boolean; description?: string };
	if (j.ok !== true) {
		throw new Error(j.description ?? "تعذّر إرسال الملف");
	}
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function quotaLeft(): number {
	const d = today();
	if (!g.__sndlQuota || g.__sndlQuota.day !== d) {
		g.__sndlQuota = { day: d, used: 0 };
	}
	return DAILY_LIMIT - g.__sndlQuota.used;
}

function quotaUse(): void {
	quotaLeft();
	if (g.__sndlQuota) g.__sndlQuota.used += 1;
}

function safeName(meta: ArticleMeta | null, doi: string): string {
	const base = meta?.title ?? doi;
	const clean = base
		.replace(/[\\/:*?"<>|]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 90);
	return (clean || "article") + ".pdf";
}

function metaCard(meta: ArticleMeta): string {
	const lines = ["📄 <b>" + esc(meta.title) + "</b>"];
	if (meta.authors.length > 0) {
		lines.push("✍️ " + esc(meta.authors.join(", ")));
	}
	const bits: string[] = [];
	if (meta.journal) bits.push(esc(meta.journal));
	if (meta.year) bits.push(String(meta.year));
	if (bits.length > 0) lines.push("📚 " + bits.join(" · "));
	if (meta.publisher) lines.push("🏢 " + esc(meta.publisher));
	return lines.join("\n");
}

async function handleDoi(chatId: number, doi: string): Promise<void> {
	if (g.__sndlBusy === true) {
		await say(chatId, T.busy);
		return;
	}
	if (quotaLeft() <= 0) {
		await say(chatId, T.limit);
		return;
	}

	g.__sndlBusy = true;
	const msgId = await say(chatId, T.checking);
	try {
		const meta = await fetchMeta(doi);
		if (!meta) {
			await editText(chatId, msgId, T.badDoi);
			return;
		}

		const card = metaCard(meta);
		await editText(chatId, msgId, card + "\n\n" + T.searchingOa);

		let result = null as Awaited<ReturnType<typeof getArticlePdf>>;
		try {
			await editText(chatId, msgId, card + "\n\n" + T.searchingSndl);
			result = await getArticlePdf(doi);
		} catch (err) {
			const m = err instanceof Error ? err.message : String(err);
			await editText(chatId, msgId, card + "\n\n⚠️ " + esc(m));
			return;
		}

		if (!result) {
			await editText(chatId, msgId, card + "\n\n" + T.notFound);
			return;
		}

		const badge =
			result.source === "sndl" ? "🏛️ عبر SNDL" : "🌍 وصول مفتوح";
		const sizeMb = (result.bytes.length / (1024 * 1024)).toFixed(1);
		await sendDocument(
			chatId,
			result.bytes,
			safeName(meta, doi),
			card + "\n\n" + badge + " · " + sizeMb + " MB",
		);
		quotaUse();
		await editText(
			chatId,
			msgId,
			card + "\n\n✅ تمّ · متبقٍ اليوم: " + quotaLeft(),
		);
	} catch (err) {
		const m = err instanceof Error ? err.message : String(err);
		await editText(chatId, msgId, "❌ " + esc(m));
	} finally {
		g.__sndlBusy = false;
	}
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
	const msg = update.message;
	const chatId = msg?.chat?.id;
	if (typeof chatId !== "number") return;

	const owner = process.env.SNDL_OWNER_ID;
	if (!owner || String(chatId) !== owner.trim()) {
		await say(chatId, T.notOwner);
		return;
	}

	const text = (msg?.text ?? "").trim();
	if (text === "/start" || text === "/help") {
		await say(chatId, T.welcome);
		return;
	}
	if (text === "/quota") {
		await say(
			chatId,
			"🚦 متبقٍ اليوم: <b>" + quotaLeft() + "</b> من " + DAILY_LIMIT,
		);
		return;
	}

	const doi = extractDoi(text);
	if (!doi) {
		await say(chatId, T.noDoi);
		return;
	}
	await handleDoi(chatId, doi);
}
