"use strict";
// بوت SNDL الخاص — يعمل على حاسوبك داخل الجزائر.
// أرسل DOI في تيليجرام ← يعود لك بملف PDF.

const { existsSync } = require("node:fs");

const TOKEN = (process.env.SNDL_BOT_TOKEN || "").trim();
const OWNER = (process.env.SNDL_OWNER_ID || "").trim();
const SNDL_USER = (process.env.SNDL_USER || "").trim();
const SNDL_PASS = process.env.SNDL_PASS || "";
const MAILTO = process.env.UNPAYWALL_EMAIL || "contact@docmathdz.dev";
const DAILY_LIMIT = Number(process.env.SNDL_DAILY_LIMIT || "30");

if (!TOKEN) {
	console.error("❌ SNDL_BOT_TOKEN مفقود في ملف .env");
	process.exit(1);
}
if (!OWNER) {
	console.error("❌ SNDL_OWNER_ID مفقود في ملف .env");
	process.exit(1);
}
if (!SNDL_USER || !SNDL_PASS) {
	console.error("❌ SNDL_USER أو SNDL_PASS مفقود في ملف .env");
	process.exit(1);
}

const API = "https://api.telegram.org/bot" + TOKEN;
const SUFFIX = ".www.sndl1.arn.dz";
const LOGIN_URL = "https://www.sndl.cerist.dz/login.php";
const UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SESSION_TTL = 25 * 60 * 1000;

const T = {
	welcome:
		"📚 <b>مساعد المقالات العلمية</b>\n\nأرسل لي DOI أو رابطاً، وأعيد لك الملف.\n\n<code>10.1016/j.jmaa.2025.130277</code>\n\nأبحث أولاً في المصادر المفتوحة، ثم في SNDL.",
	notOwner: "🔒 هذا بوت خاص.",
	noDoi:
		"❓ لم أجد DOI في رسالتك.\nمثال: <code>10.1016/j.jmaa.2025.130277</code>",
	busy: "⏳ أعالج طلباً آخر الآن، انتظر قليلاً.",
	limit: "🚫 بلغت الحد اليومي. جرّب غداً.",
	checking: "🔎 أبحث عن المقال…",
	open: "🌍 أجرّب المصادر المفتوحة…",
	sndl: "🏛️ أدخل إلى SNDL… (قد يأخذ دقيقة)",
	notFound:
		"❌ لم أتمكّن من جلب الملف.\nربما الناشر غير مشترَك في SNDL.",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) =>
	String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- تيليجرام ----------

async function api(method, payload) {
	try {
		const res = await fetch(API + "/" + method, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload || {}),
		});
		return await res.json();
	} catch (err) {
		return { ok: false, description: String(err) };
	}
}

async function say(chatId, text) {
	const r = await api("sendMessage", {
		chat_id: chatId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: true,
	});
	return r && r.result ? r.result.message_id : null;
}

async function editText(chatId, messageId, text) {
	if (!messageId) return;
	await api("editMessageText", {
		chat_id: chatId,
		message_id: messageId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: true,
	});
}

async function sendDoc(chatId, bytes, filename, caption) {
	const form = new FormData();
	form.append("chat_id", String(chatId));
	form.append("caption", caption);
	form.append("parse_mode", "HTML");
	form.append(
		"document",
		new Blob([bytes], { type: "application/pdf" }),
		filename,
	);
	const res = await fetch(API + "/sendDocument", { method: "POST", body: form });
	const json = await res.json().catch(() => null);
	if (!json || json.ok !== true) {
		throw new Error(
			"فشل إرسال الملف: " + ((json && json.description) || res.status),
		);
	}
}

// ---------- أدوات SNDL ----------

function proxify(raw) {
	try {
		const u = new URL(raw);
		if (u.hostname.endsWith("sndl1.arn.dz")) return u.toString();
		u.hostname = u.hostname.replace(/\./g, "-") + SUFFIX;
		return u.toString();
	} catch {
		return raw;
	}
}

const doiProxyUrl = (doi) => "https://doi-org" + SUFFIX + "/" + doi;

function extractDoi(text) {
	const m = String(text || "").match(/10\.\d{4,9}\/[^\s"'<>,;)\]]+/);
	if (!m) return null;
	return m[0].replace(/[.,;]+$/, "");
}

function looksLikePdf(buf) {
	return (
		buf &&
		buf.length > 1024 &&
		buf[0] === 0x25 &&
		buf[1] === 0x50 &&
		buf[2] === 0x44 &&
		buf[3] === 0x46
	);
}

function safeName(doi) {
	return doi.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 90) + ".pdf";
}

async function fetchMeta(doi) {
	try {
		const res = await fetch(
			"https://api.crossref.org/works/" +
				encodeURIComponent(doi) +
				"?mailto=" +
				encodeURIComponent(MAILTO),
			{ headers: { "user-agent": "sndl-bot/1.0 (mailto:" + MAILTO + ")" } },
		);
		if (!res.ok) return null;
		const json = await res.json();
		const m = json && json.message;
		if (!m) return null;
		const authors = Array.isArray(m.author)
			? m.author
					.slice(0, 6)
					.map((a) => [a.given, a.family].filter(Boolean).join(" "))
					.filter(Boolean)
			: [];
		const dateParts =
			(m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) || [];
		return {
			doi,
			title: Array.isArray(m.title) ? m.title[0] : m.title || "",
			journal: Array.isArray(m["container-title"])
				? m["container-title"][0]
				: "",
			publisher: m.publisher || "",
			year: dateParts[0] || "",
			authors,
		};
	} catch {
		return null;
	}
}

function metaCard(doi, meta) {
	if (!meta) return "📄 <code>" + esc(doi) + "</code>";
	const lines = ["📄 <b>" + esc(meta.title || doi) + "</b>"];
	if (meta.authors.length) lines.push("👤 " + esc(meta.authors.join(", ")));
	if (meta.journal)
		lines.push("📖 " + esc(meta.journal) + (meta.year ? " · " + meta.year : ""));
	if (meta.publisher) lines.push("🏢 " + esc(meta.publisher));
	return lines.join("\n");
}

async function unpaywallPdfUrl(doi) {
	try {
		const res = await fetch(
			"https://api.unpaywall.org/v2/" +
				encodeURIComponent(doi) +
				"?email=" +
				encodeURIComponent(MAILTO),
		);
		if (!res.ok) return null;
		const json = await res.json();
		const best = json && json.best_oa_location;
		if (best && best.url_for_pdf) return best.url_for_pdf;
		const locs = (json && json.oa_locations) || [];
		for (const l of locs) if (l && l.url_for_pdf) return l.url_for_pdf;
		return null;
	} catch {
		return null;
	}
}

async function plainDownload(url) {
	try {
		const res = await fetch(url, { headers: { "user-agent": UA } });
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		return looksLikePdf(buf) ? buf : null;
	} catch {
		return null;
	}
}

function guessPdfUrls(landingUrl, doi) {
	const out = [];
	try {
		const u = new URL(landingUrl);
		const host = u.hostname;
		const pii = landingUrl.match(/\/pii\/([A-Z0-9]+)/i);
		if (pii) {
			const base = u.origin + "/science/article/pii/" + pii[1];
			out.push(base + "/pdfft?download=true");
			out.push(base + "/pdf");
		}
		if (host.indexOf("link-springer") >= 0)
			out.push(u.origin + "/content/pdf/" + doi + ".pdf");
		if (host.indexOf("nature-com") >= 0) out.push(landingUrl + ".pdf");
		if (host.indexOf("onlinelibrary-wiley") >= 0) {
			out.push(u.origin + "/doi/pdfdirect/" + doi + "?download=true");
			out.push(u.origin + "/doi/pdf/" + doi);
		}
		if (host.indexOf("tandfonline") >= 0)
			out.push(u.origin + "/doi/pdf/" + doi + "?download=true");
	} catch {
		// تجاهل
	}
	return out;
}

// ---------- المتصفح ----------

function findChrome() {
	if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH))
		return process.env.CHROME_PATH;
	const list =
		process.platform === "win32"
			? [
					"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
					"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
					"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
					"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
				]
			: [
					"/usr/bin/google-chrome",
					"/usr/bin/google-chrome-stable",
					"/usr/bin/chromium",
					"/usr/bin/chromium-browser",
				];
	for (const p of list) if (existsSync(p)) return p;
	return null;
}

let session = null; // { browser, at }

async function launchBrowser() {
	const puppeteer = require("puppeteer-core");
	const exe = findChrome();
	if (!exe) {
		throw new Error(
			"لم أجد Chrome أو Edge على الجهاز. أضف CHROME_PATH في ملف .env",
		);
	}
	return puppeteer.launch({
		executablePath: exe,
		headless: process.env.SNDL_SHOW_BROWSER === "1" ? false : true,
		args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"],
		timeout: 90000,
		protocolTimeout: 300000,
	});
}

async function login(browser) {
	const page = await browser.newPage();
	try {
		await page.setUserAgent(UA);
		await page.setViewport({ width: 1366, height: 900 });
		await page.goto(LOGIN_URL, {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		await sleep(1000);
		const filled = await page.evaluate(
			(u, p) => {
				const inputs = Array.from(document.querySelectorAll("input"));
				const pass = inputs.find((i) => i.type === "password");
				const text = inputs.find(
					(i) => (i.type === "text" || i.type === "email") && !!i.offsetParent,
				);
				if (!pass || !text) return false;
				text.value = u;
				pass.value = p;
				text.dispatchEvent(new Event("input", { bubbles: true }));
				pass.dispatchEvent(new Event("input", { bubbles: true }));
				return true;
			},
			SNDL_USER,
			SNDL_PASS,
		);
		if (!filled) throw new Error("لم أجد حقول الدخول في صفحة SNDL");

		const nav = page
			.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 })
			.catch(() => null);
		await page.evaluate(() => {
			const btn = document.querySelector(
				'input[type="submit"], button[type="submit"]',
			);
			if (btn) btn.click();
			else {
				const f = document.querySelector("form");
				if (f) f.submit();
			}
		});
		await nav;
		await sleep(2000);

		const body = await page
			.evaluate(() => document.body.innerText || "")
			.catch(() => "");
		if (/en dehors de l'Algerie/i.test(body)) {
			throw new Error(
				"SNDL يرفض الاتصال — تأكّد أنك متصل من داخل الجزائر",
			);
		}
		const stillLogin = await page
			.evaluate(() => !!document.querySelector('input[type="password"]'))
			.catch(() => true);
		if (stillLogin && !/D\u00e9connexion/i.test(body)) {
			throw new Error("فشل تسجيل الدخول — تحقّق من SNDL_USER و SNDL_PASS");
		}
		console.log("🏛️  تمّ تسجيل الدخول إلى SNDL");
	} finally {
		await page.close().catch(() => undefined);
	}
}

async function getBrowser() {
	if (session) {
		const fresh = Date.now() - session.at < SESSION_TTL;
		let alive = false;
		try {
			alive = session.browser.connected;
		} catch {
			alive = false;
		}
		if (fresh && alive) return session.browser;
		try {
			await session.browser.close();
		} catch {
			// تجاهل
		}
		session = null;
	}
	const browser = await launchBrowser();
	try {
		await login(browser);
	} catch (err) {
		await browser.close().catch(() => undefined);
		throw err;
	}
	session = { browser, at: Date.now() };
	return browser;
}

async function fetchViaSndl(doi) {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		await page.setUserAgent(UA);
		await page.setViewport({ width: 1366, height: 900 });
		await page.goto(doiProxyUrl(doi), {
			waitUntil: "domcontentloaded",
			timeout: 90000,
		});
		await sleep(2500);
		const landing = page.url();
		const metaPdf = await page
			.evaluate(() => {
				const m = document.querySelector('meta[name="citation_pdf_url"]');
				return m ? m.getAttribute("content") : null;
			})
			.catch(() => null);

		const candidates = [];
		if (metaPdf) candidates.push(proxify(metaPdf));
		for (const c of guessPdfUrls(landing, doi)) candidates.push(c);

		for (const url of candidates) {
			const b64 = await page
				.evaluate(async (target) => {
					try {
						const r = await fetch(target, { credentials: "include" });
						if (!r.ok) return null;
						const buf = new Uint8Array(await r.arrayBuffer());
						if (buf.length < 1024) return null;
						let s = "";
						const CH = 0x8000;
						for (let i = 0; i < buf.length; i += CH) {
							s += String.fromCharCode.apply(
								null,
								Array.from(buf.subarray(i, i + CH)),
							);
						}
						return btoa(s);
					} catch {
						return null;
					}
				}, url)
				.catch(() => null);
			if (!b64) continue;
			const bytes = Buffer.from(b64, "base64");
			if (looksLikePdf(bytes)) return { bytes, source: "sndl" };
		}
		return null;
	} finally {
		await page.close().catch(() => undefined);
	}
}

// ---------- المنطق ----------

let busy = false;
const quota = { day: "", used: 0 };

function today() {
	return new Date().toISOString().slice(0, 10);
}

function quotaLeft() {
	if (quota.day !== today()) {
		quota.day = today();
		quota.used = 0;
	}
	return Math.max(0, DAILY_LIMIT - quota.used);
}

async function handleDoi(chatId, doi) {
	if (busy) {
		await say(chatId, T.busy);
		return;
	}
	if (quotaLeft() <= 0) {
		await say(chatId, T.limit);
		return;
	}
	busy = true;
	const statusId = await say(chatId, T.checking);
	try {
		const meta = await fetchMeta(doi);
		const card = metaCard(doi, meta);
		await editText(chatId, statusId, card + "\n\n" + T.open);

		let bytes = null;
		let source = "";
		const oa = await unpaywallPdfUrl(doi);
		if (oa) {
			bytes = await plainDownload(oa);
			if (bytes) source = "🌍 وصول مفتوح";
		}
		if (!bytes) {
			await editText(chatId, statusId, card + "\n\n" + T.sndl);
			const viaSndl = await fetchViaSndl(doi);
			if (viaSndl) {
				bytes = viaSndl.bytes;
				source = "🏛️ عبر SNDL";
			}
		}
		if (!bytes) {
			await editText(chatId, statusId, card + "\n\n" + T.notFound);
			return;
		}

		const mb = (bytes.length / (1024 * 1024)).toFixed(1);
		await sendDoc(
			chatId,
			bytes,
			safeName(doi),
			card + "\n\n" + source + " · " + mb + " ميجا",
		);
		quota.used += 1;
		await editText(
			chatId,
			statusId,
			"✅ تمّ · متبقٍ اليوم: " + quotaLeft(),
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("❌", msg);
		await editText(chatId, statusId, "⚠️ " + esc(msg));
	} finally {
		busy = false;
	}
}

async function handleUpdate(update) {
	const msg = update && update.message;
	if (!msg || !msg.text) return;
	const chatId = msg.chat.id;
	if (String(chatId) !== OWNER) {
		await say(chatId, T.notOwner);
		return;
	}
	const text = msg.text.trim();
	if (text === "/start" || text === "/help") {
		await say(chatId, T.welcome);
		return;
	}
	if (text === "/quota") {
		await say(chatId, "📊 متبقٍ اليوم: " + quotaLeft() + " / " + DAILY_LIMIT);
		return;
	}
	const doi = extractDoi(text);
	if (!doi) {
		await say(chatId, T.noDoi);
		return;
	}
	await handleDoi(chatId, doi);
}

async function main() {
	await api("deleteWebhook", { drop_pending_updates: true });
	const me = await api("getMe", {});
	const name = me && me.result ? "@" + me.result.username : "البوت";
	console.log("✅ " + name + " يعمل الآن — أرسل DOI في تيليجرام");
	console.log("   للإيقاف: Ctrl + C");

	let offset = 0;
	for (;;) {
		try {
			const res = await api("getUpdates", { timeout: 30, offset });
			const list = (res && res.result) || [];
			for (const u of list) {
				offset = u.update_id + 1;
				await handleUpdate(u);
			}
		} catch (err) {
			console.error("⚠️", err instanceof Error ? err.message : err);
			await sleep(3000);
		}
	}
}

process.on("SIGINT", async () => {
	console.log("\n👋 إيقاف…");
	if (session) await session.browser.close().catch(() => undefined);
	process.exit(0);
});

main();
