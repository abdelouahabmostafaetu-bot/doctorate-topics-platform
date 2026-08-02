"use strict";
// مساعد الرياضيات — بحث عالمي + تحميل (arXiv · OpenAlex · Unpaywall · S2 · CORE · SNDL)
// يعمل على حاسوبك داخل الجزائر.

const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const TOKEN = (process.env.SNDL_BOT_TOKEN || "").trim();
const OWNER = (process.env.SNDL_OWNER_ID || "").trim();
const SNDL_USER = (process.env.SNDL_USER || "").trim();
const SNDL_PASS = process.env.SNDL_PASS || "";
const MAILTO = process.env.UNPAYWALL_EMAIL || "contact@docmathdz.dev";
const DAILY_LIMIT = Number(process.env.SNDL_DAILY_LIMIT || "50");
const CORE_KEY = (process.env.CORE_API_KEY || "").trim();
const DEBUG = process.env.BOT_DEBUG === "1";

if (!TOKEN) {
	console.error("❌ SNDL_BOT_TOKEN مفقود في ملف .env");
	process.exit(1);
}
if (!OWNER) {
	console.error("❌ SNDL_OWNER_ID مفقود في ملف .env");
	process.exit(1);
}

const API = "https://api.telegram.org/bot" + TOKEN;
const SUFFIX = ".www.sndl1.arn.dz";
const LOGIN_URL = "https://www.sndl.cerist.dz/login.php";
const UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SESSION_TTL = 25 * 60 * 1000;
const MATH_FIELD = "fields/26"; // Mathematics في OpenAlex (أدق من concepts)
const PER_PAGE = 5;
const STATE_FILE = path.join(__dirname, ".state.json");

let mathOnly = process.env.MATH_ONLY !== "0";

const WELCOME =
	"🧮 <b>مساعد الرياضيات</b>\n\n" +
	"أرسل أي شيء ممّا يلي:\n\n" +
	"🔹 <b>DOI</b> — <code>10.1016/j.jmaa.2025.130277</code>\n" +
	"🔹 <b>arXiv</b> — <code>2401.12345</code>\n" +
	"🔹 <b>ISBN</b> — <code>978-3-540-76349-8</code>\n" +
	"🔹 <b>رابط</b> — ScienceDirect / Springer…\n" +
	"🔹 <b>اسم مؤلف</b> — <code>Xing Fu</code>\n" +
	"🔹 <b>عنوان أو موضوع</b> — <code>Wolff potentials elliptic</code>\n\n" +
	"<b>أوامر دقيقة</b>\n" +
	"<code>/a Xing Fu</code> — بحث باسم مؤلف\n" +
	"<code>/t elliptic equations</code> — بحث بعنوان/موضوع\n" +
	"<code>/mode</code> · <code>/quota</code> · <code>/help</code>";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) =>
	String(s == null ? "" : s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
const cut = (s, n) => {
	const t = String(s == null ? "" : s);
	return t.length > n ? t.slice(0, n - 1) + "\u2026" : t;
};
const enc = encodeURIComponent;

// ================= تيليجرام =================

async function api(method, payload) {
	try {
		const res = await fetch(API + "/" + method, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload || {}),
		});
		const json = await res.json();
		if (!json.ok && DEBUG) console.log("tg!", method, json.description);
		return json;
	} catch (err) {
		console.error("tg✗", method, String(err));
		return { ok: false, description: String(err) };
	}
}

async function say(chatId, text, keyboard) {
	const payload = {
		chat_id: chatId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: true,
	};
	if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
	const r = await api("sendMessage", payload);
	return r && r.result ? r.result.message_id : null;
}

async function editText(chatId, messageId, text, keyboard) {
	if (!messageId) return;
	const payload = {
		chat_id: chatId,
		message_id: messageId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: true,
	};
	if (keyboard) payload.reply_markup = { inline_keyboard: keyboard };
	await api("editMessageText", payload);
}

async function ackCb(id, text) {
	await api("answerCallbackQuery", {
		callback_query_id: id,
		text: text || "",
		cache_time: 0,
	});
}

async function sendDoc(chatId, bytes, filename, caption) {
	const form = new FormData();
	form.append("chat_id", String(chatId));
	form.append("caption", cut(caption, 1000));
	form.append("parse_mode", "HTML");
	form.append(
		"document",
		new Blob([bytes], { type: "application/pdf" }),
		filename,
	);
	const res = await fetch(API + "/sendDocument", { method: "POST", body: form });
	const json = await res.json().catch(() => null);
	if (!json || json.ok !== true)
		throw new Error(
			"فشل إرسال الملف: " + ((json && json.description) || res.status),
		);
}

// ================= أدوات =================

async function httpJson(url, headers) {
	try {
		const res = await fetch(url, {
			headers: Object.assign(
				{ "user-agent": "math-bot/3.0 (mailto:" + MAILTO + ")" },
				headers || {},
			),
		});
		if (!res.ok) {
			if (DEBUG) console.log("http!", res.status, cut(url, 120));
			return null;
		}
		return await res.json();
	} catch (err) {
		if (DEBUG) console.log("http✗", String(err));
		return null;
	}
}

async function httpText(url) {
	try {
		const res = await fetch(url, { headers: { "user-agent": UA } });
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	}
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

async function plainDownload(url) {
	if (!url) return null;
	try {
		const res = await fetch(url, {
			headers: { "user-agent": UA, accept: "application/pdf,*/*" },
			redirect: "follow",
		});
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		return looksLikePdf(buf) ? buf : null;
	} catch {
		return null;
	}
}

function safeName(item) {
	const base = item.doi || item.arxivId || item.title || "article";
	return String(base).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) + ".pdf";
}

function extractDoi(text) {
	const m = String(text || "").match(/10\.\d{4,9}\/[^\s"'<>,;)\]]+/);
	return m ? m[0].replace(/[.,;]+$/, "") : null;
}

// ================= كشف المُدخل =================

function detect(raw) {
	const text = String(raw || "").trim();
	const doi = extractDoi(text);
	if (doi) return { kind: "doi", value: doi };
	const digits = text.replace(/[-\s]/g, "");
	if (/^(97[89]\d{10}|\d{9}[\dxX])$/.test(digits))
		return { kind: "isbn", value: digits };
	const ax = text.match(/^(?:arxiv[:\s]*)?(\d{4}\.\d{4,5}(?:v\d+)?)$/i);
	if (ax) return { kind: "arxiv", value: ax[1] };
	const axOld = text.match(/^(?:arxiv[:\s]*)?(math\/\d{7})$/i);
	if (axOld) return { kind: "arxiv", value: axOld[1] };
	if (/^https?:\/\//i.test(text)) return { kind: "url", value: text };
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length <= 3 && text.length <= 40 && !/\d/.test(text))
		return { kind: "author", value: text };
	return { kind: "title", value: text };
}

// ================= OpenAlex =================

function fromOpenAlex(w) {
	if (!w) return null;
	const doi = w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//i, "") : null;
	const authors = (w.authorships || [])
		.slice(0, 8)
		.map((a) => a && a.author && a.author.display_name)
		.filter(Boolean);
	const loc = w.primary_location || {};
	const best = w.best_oa_location || {};
	const am = String(loc.landing_page_url || "").match(
		/arxiv\.org\/abs\/([^\s/?#]+)/i,
	);
	const bm = String(best.landing_page_url || "").match(
		/arxiv\.org\/abs\/([^\s/?#]+)/i,
	);
	const topic = w.primary_topic || {};
	return {
		title: w.display_name || w.title || "",
		authors,
		year: w.publication_year || "",
		journal: (loc.source && loc.source.display_name) || "",
		doi,
		arxivId: (am && am[1]) || (bm && bm[1]) || null,
		oaPdf: best.pdf_url || (w.open_access && w.open_access.oa_url) || null,
		isOa: !!(w.open_access && w.open_access.is_oa),
		cited: w.cited_by_count || 0,
		field: (topic.field && topic.field.display_name) || "",
		topic: topic.display_name || "",
	};
}

function withMath(filters) {
	const parts = filters.filter(Boolean);
	if (mathOnly) parts.push("primary_topic.field.id:" + MATH_FIELD);
	return parts.join(",");
}

async function oaWorks(filterStr, search, sort, perPage) {
	let url = "https://api.openalex.org/works?per-page=" + (perPage || 50);
	if (filterStr) url += "&filter=" + filterStr;
	if (search) url += "&search=" + enc(search);
	if (sort) url += "&sort=" + sort;
	url += "&mailto=" + enc(MAILTO);
	const j = await httpJson(url);
	return ((j && j.results) || []).map(fromOpenAlex).filter(Boolean);
}

async function openAlexByDoi(doi) {
	return fromOpenAlex(
		await httpJson(
			"https://api.openalex.org/works/doi:" + enc(doi) + "?mailto=" + enc(MAILTO),
		),
	);
}

async function authorCandidates(name) {
	const j = await httpJson(
		"https://api.openalex.org/authors?search=" +
			enc(name) +
			"&per-page=10&mailto=" +
			enc(MAILTO),
	);
	const list = ((j && j.results) || []).map((a) => {
		const inst =
			(a.last_known_institutions && a.last_known_institutions[0]) ||
			a.last_known_institution ||
			null;
		const topics = a.topics || [];
		const fields = [];
		for (const t of topics.slice(0, 6)) {
			const f = t.field && t.field.display_name;
			if (f && fields.indexOf(f) < 0) fields.push(f);
		}
		return {
			id: String(a.id || "").replace(/^https?:\/\/openalex\.org\//i, ""),
			name: a.display_name || name,
			inst: (inst && inst.display_name) || "",
			country: (inst && inst.country_code) || "",
			works: a.works_count || 0,
			cited: a.cited_by_count || 0,
			fields,
			isMath: fields.some((f) => /math/i.test(f)),
		};
	});
	if (mathOnly) {
		list.sort((x, y) => {
			if (x.isMath !== y.isMath) return x.isMath ? -1 : 1;
			return y.cited - x.cited;
		});
	}
	return list.slice(0, 8);
}

async function worksByAuthorId(authorId) {
	let items = await oaWorks(
		withMath(["author.id:" + authorId]),
		"",
		"cited_by_count:desc",
		50,
	);
	if (!items.length && mathOnly)
		items = await oaWorks(
			"author.id:" + authorId,
			"",
			"cited_by_count:desc",
			50,
		);
	return items;
}

// ================= مصادر أخرى =================

async function crossrefMeta(doi) {
	const j = await httpJson(
		"https://api.crossref.org/works/" + enc(doi) + "?mailto=" + enc(MAILTO),
	);
	const m = j && j.message;
	if (!m) return null;
	const authors = Array.isArray(m.author)
		? m.author
				.slice(0, 6)
				.map((a) => [a.given, a.family].filter(Boolean).join(" "))
				.filter(Boolean)
		: [];
	const dp = (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) || [];
	return {
		title: Array.isArray(m.title) ? m.title[0] : m.title || "",
		authors,
		year: dp[0] || "",
		journal: Array.isArray(m["container-title"]) ? m["container-title"][0] : "",
		doi,
		arxivId: null,
		oaPdf: null,
		cited: m["is-referenced-by-count"] || 0,
	};
}

async function semanticScholar(doi) {
	const j = await httpJson(
		"https://api.semanticscholar.org/graph/v1/paper/DOI:" +
			enc(doi) +
			"?fields=openAccessPdf,externalIds,citationCount",
	);
	if (!j) return null;
	return {
		pdf: (j.openAccessPdf && j.openAccessPdf.url) || null,
		arxivId: (j.externalIds && j.externalIds.ArXiv) || null,
	};
}

async function unpaywallPdf(doi) {
	const j = await httpJson(
		"https://api.unpaywall.org/v2/" + enc(doi) + "?email=" + enc(MAILTO),
	);
	if (!j) return null;
	if (j.best_oa_location && j.best_oa_location.url_for_pdf)
		return j.best_oa_location.url_for_pdf;
	for (const l of j.oa_locations || []) if (l && l.url_for_pdf) return l.url_for_pdf;
	return null;
}

async function corePdf(query, isDoi) {
	if (!CORE_KEY) return null;
	try {
		const res = await fetch("https://api.core.ac.uk/v3/search/works", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer " + CORE_KEY,
			},
			body: JSON.stringify({
				q: isDoi ? 'doi:"' + query + '"' : 'title:"' + query + '"',
				limit: 5,
			}),
		});
		if (!res.ok) return null;
		const j = await res.json();
		for (const r of (j && j.results) || []) {
			if (r && r.downloadUrl) return r.downloadUrl;
			if (r && r.fullTextIdentifier) return r.fullTextIdentifier;
		}
		return null;
	} catch {
		return null;
	}
}

function parseArxivFeed(xml) {
	if (!xml) return [];
	const out = [];
	for (const e of xml.split("<entry>").slice(1)) {
		const pick = (re) => {
			const m = e.match(re);
			return m ? m[1].replace(/\s+/g, " ").trim() : "";
		};
		const idm = pick(/<id>([\s\S]*?)<\/id>/).match(/abs\/(.+)$/);
		const id = idm ? idm[1] : null;
		const authors = [];
		const re = /<name>([\s\S]*?)<\/name>/g;
		let m;
		while ((m = re.exec(e)) !== null && authors.length < 8)
			authors.push(m[1].trim());
		out.push({
			title: pick(/<title>([\s\S]*?)<\/title>/),
			authors,
			year: pick(/<published>([\s\S]*?)<\/published>/).slice(0, 4),
			journal: "arXiv",
			doi: pick(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/) || null,
			arxivId: id,
			oaPdf: id ? "https://arxiv.org/pdf/" + id : null,
			isOa: true,
			cited: 0,
			field: "Mathematics",
		});
	}
	return out;
}

async function arxivSearch(query, byAuthor) {
	const clean = query.replace(/["\\]/g, "");
	let q = byAuthor ? 'au:"' + clean + '"' : 'all:"' + clean + '"';
	if (mathOnly) q += " AND cat:math*";
	const xml = await httpText(
		"http://export.arxiv.org/api/query?search_query=" +
			enc(q) +
			"&start=0&max_results=15&sortBy=relevance",
	);
	return parseArxivFeed(xml);
}

async function arxivById(id) {
	const list = parseArxivFeed(
		await httpText("http://export.arxiv.org/api/query?id_list=" + enc(id)),
	);
	return list[0] || null;
}

async function bookByIsbn(isbn) {
	const ol = await httpJson(
		"https://openlibrary.org/api/books?bibkeys=ISBN:" +
			isbn +
			"&format=json&jscmd=data",
	);
	const b1 = ol && ol["ISBN:" + isbn];
	const gb = await httpJson(
		"https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn,
	);
	const g1 = gb && gb.items && gb.items[0] && gb.items[0].volumeInfo;
	if (!b1 && !g1) return null;
	return {
		isbn,
		title: (b1 && b1.title) || (g1 && g1.title) || "",
		authors:
			(b1 && (b1.authors || []).map((a) => a.name)) || (g1 && g1.authors) || [],
		year: (b1 && b1.publish_date) || (g1 && g1.publishedDate) || "",
		publisher:
			(b1 && (b1.publishers || [])[0] && b1.publishers[0].name) ||
			(g1 && g1.publisher) ||
			"",
		pages: (b1 && b1.number_of_pages) || (g1 && g1.pageCount) || "",
		olUrl: (b1 && b1.url) || "https://openlibrary.org/isbn/" + isbn,
		gbUrl: (gb && gb.items && gb.items[0] && g1 && g1.infoLink) || "",
	};
}

// ================= SNDL =================

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

function guessPdfUrls(landingUrl, doi) {
	const out = [];
	try {
		const u = new URL(landingUrl);
		const host = u.hostname;
		const pii = landingUrl.match(/\/pii\/([A-Z0-9]+)/i);
		if (pii) {
			const base = u.origin + "/science/article/pii/" + pii[1];
			out.push(base + "/pdfft?isDTMRedir=true&download=true");
			out.push(base + "/pdfft?download=true");
			out.push(base + "/pdf");
		}
		if (host.indexOf("link-springer") >= 0)
			out.push(u.origin + "/content/pdf/" + doi + ".pdf");
		if (host.indexOf("onlinelibrary-wiley") >= 0) {
			out.push(u.origin + "/doi/pdfdirect/" + doi + "?download=true");
			out.push(u.origin + "/doi/pdf/" + doi);
		}
		if (host.indexOf("tandfonline") >= 0)
			out.push(u.origin + "/doi/pdf/" + doi + "?download=true");
		if (host.indexOf("ams-org") >= 0 || host.indexOf("projecteuclid") >= 0)
			out.push(landingUrl.replace(/\/abs\//, "/pdf/"));
	} catch {
		// تجاهل
	}
	return out;
}

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

let session = null;

async function launchBrowser() {
	const puppeteer = require("puppeteer-core");
	const exe = findChrome();
	if (!exe) throw new Error("لم أجد Chrome أو Edge. أضف CHROME_PATH في .env");
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
		await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
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
		if (/en dehors de l'Algerie/i.test(body))
			throw new Error("SNDL يرفض الاتصال — يجب أن تكون داخل الجزائر");
		console.log("🏛️  تمّ تسجيل الدخول إلى SNDL");
	} finally {
		await page.close().catch(() => undefined);
	}
}

async function getBrowser() {
	if (session) {
		let alive = false;
		try {
			alive = session.browser.connected;
		} catch {
			alive = false;
		}
		if (alive && Date.now() - session.at < SESSION_TTL) return session.browser;
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

async function inPageDownload(page, url) {
	const b64 = await page
		.evaluate(async (target) => {
			try {
				const r = await fetch(target, { credentials: "include" });
				if (!r.ok) return null;
				const buf = new Uint8Array(await r.arrayBuffer());
				if (buf.length < 1024) return null;
				let s = "";
				const CH = 0x8000;
				for (let i = 0; i < buf.length; i += CH)
					s += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CH)));
				return btoa(s);
			} catch {
				return null;
			}
		}, url)
		.catch(() => null);
	if (!b64) return null;
	const bytes = Buffer.from(b64, "base64");
	return looksLikePdf(bytes) ? bytes : null;
}

async function navDownload(browser, url) {
	const page = await browser.newPage();
	let found = null;
	page.on("response", async (res) => {
		if (found) return;
		try {
			const ct = String(res.headers()["content-type"] || "").toLowerCase();
			if (ct.indexOf("pdf") < 0) return;
			const buf = await res.buffer();
			if (looksLikePdf(buf)) found = buf;
		} catch {
			// تجاهل
		}
	});
	try {
		await page.setUserAgent(UA);
		await page
			.goto(url, { waitUntil: "networkidle2", timeout: 120000 })
			.catch(() => undefined);
		await sleep(3000);
		if (found) return found;
		const next = await page
			.evaluate(() => {
				const a = document.querySelector(
					'a[href*="pdfft"], a[href*=".pdf"], a[href*="/pdf"]',
				);
				if (a) return a.href;
				const html = document.documentElement.innerHTML;
				const m =
					html.match(/window\.location\s*=\s*['"]([^'"]+)['"]/) ||
					html.match(/URL=([^"'>]+)/i);
				return m ? m[1] : null;
			})
			.catch(() => null);
		if (next) {
			const abs = next.startsWith("http") ? next : new URL(next, url).toString();
			await page
				.goto(abs, { waitUntil: "networkidle2", timeout: 120000 })
				.catch(() => undefined);
			await sleep(4000);
		}
		return found;
	} finally {
		await page.close().catch(() => undefined);
	}
}

async function fetchViaSndl(doi) {
	const browser = await getBrowser();
	const page = await browser.newPage();
	const report = { landing: "", title: "", tried: [] };
	try {
		await page.setUserAgent(UA);
		await page.setViewport({ width: 1366, height: 900 });
		await page.goto(doiProxyUrl(doi), {
			waitUntil: "domcontentloaded",
			timeout: 90000,
		});
		await sleep(3500);
		report.landing = page.url();
		report.title = await page.title().catch(() => "");
		const metaPdf = await page
			.evaluate(() => {
				const m = document.querySelector('meta[name="citation_pdf_url"]');
				return m ? m.getAttribute("content") : null;
			})
			.catch(() => null);
		const domLinks = await page
			.evaluate(() => {
				const sel =
					'a[href*="pdfft"], a[href*="pdfdirect"], a[href*="/content/pdf"], a[href*=".pdf"], a[href*="/doi/pdf"], a[href*="/pdf"]';
				return Array.from(
					new Set(
						Array.from(document.querySelectorAll(sel))
							.map((a) => a.href)
							.filter(Boolean),
					),
				).slice(0, 6);
			})
			.catch(() => []);
		const cands = [];
		if (metaPdf) cands.push(proxify(metaPdf));
		for (const l of domLinks) cands.push(proxify(l));
		for (const g of guessPdfUrls(report.landing, doi)) cands.push(g);
		const unique = Array.from(new Set(cands)).slice(0, 8);
		report.tried = unique;
		for (const url of unique) {
			const quick = await inPageDownload(page, url);
			if (quick) return { bytes: quick, report };
		}
		for (const url of unique.slice(0, 4)) {
			const slow = await navDownload(browser, url);
			if (slow) return { bytes: slow, report };
		}
		return { bytes: null, report };
	} finally {
		await page.close().catch(() => undefined);
	}
}

// ================= سلسلة التحميل =================

async function getPdf(item, note) {
	const report = { steps: [] };
	const step = async (label, fn) => {
		if (note) await note(label + "…");
		try {
			return await fn();
		} catch (err) {
			if (DEBUG) console.log("step✗", label, String(err));
			return null;
		}
	};

	if (item.arxivId) {
		const b = await step("📐 arXiv", () =>
			plainDownload("https://arxiv.org/pdf/" + item.arxivId),
		);
		report.steps.push("arxiv:" + (b ? "ok" : "no"));
		if (b) return { bytes: b, source: "📐 arXiv", report };
	}
	if (item.oaPdf) {
		const b = await step("🌍 وصول مفتوح", () => plainDownload(item.oaPdf));
		report.steps.push("oa:" + (b ? "ok" : "no"));
		if (b) return { bytes: b, source: "🌍 وصول مفتوح", report };
	}
	if (item.doi) {
		const b = await step("🔓 Unpaywall", async () =>
			plainDownload(await unpaywallPdf(item.doi)),
		);
		report.steps.push("unpaywall:" + (b ? "ok" : "no"));
		if (b) return { bytes: b, source: "🔓 Unpaywall", report };

		const s2 = await step("🧠 Semantic Scholar", () => semanticScholar(item.doi));
		if (s2 && s2.arxivId && !item.arxivId) {
			const b2 = await plainDownload("https://arxiv.org/pdf/" + s2.arxivId);
			report.steps.push("s2arxiv:" + (b2 ? "ok" : "no"));
			if (b2) return { bytes: b2, source: "📐 arXiv", report };
		}
		if (s2 && s2.pdf) {
			const b3 = await plainDownload(s2.pdf);
			report.steps.push("s2pdf:" + (b3 ? "ok" : "no"));
			if (b3) return { bytes: b3, source: "🧠 Semantic Scholar", report };
		}
		if (CORE_KEY) {
			const c = await step("📚 CORE", async () =>
				plainDownload(await corePdf(item.doi, true)),
			);
			report.steps.push("core:" + (c ? "ok" : "no"));
			if (c) return { bytes: c, source: "📚 CORE", report };
		}
	}
	if (!item.doi && CORE_KEY && item.title) {
		const c = await step("📚 CORE", async () =>
			plainDownload(await corePdf(item.title, false)),
		);
		report.steps.push("coreTitle:" + (c ? "ok" : "no"));
		if (c) return { bytes: c, source: "📚 CORE", report };
	}
	if (item.doi && SNDL_USER && SNDL_PASS) {
		if (note) await note("🏛️ SNDL… (قد يأخذ دقيقة)");
		try {
			const v = await fetchViaSndl(item.doi);
			report.sndl = v.report;
			report.steps.push("sndl:" + (v.bytes ? "ok" : "no"));
			if (v.bytes) return { bytes: v.bytes, source: "🏛️ SNDL", report };
		} catch (err) {
			report.steps.push("sndl:err");
			report.sndlError = err instanceof Error ? err.message : String(err);
		}
	}
	return { bytes: null, source: "", report };
}

// ================= الحالة =================

const lists = new Map(); // chatId -> state

function saveState() {
	try {
		const obj = {};
		for (const [k, v] of lists.entries()) obj[k] = v;
		writeFileSync(STATE_FILE, JSON.stringify(obj), "utf8");
	} catch {
		// تجاهل
	}
}

function loadState() {
	try {
		if (!existsSync(STATE_FILE)) return;
		const obj = JSON.parse(readFileSync(STATE_FILE, "utf8"));
		for (const k of Object.keys(obj)) lists.set(Number(k), obj[k]);
		console.log("💾 استرجعت الجلسات السابقة");
	} catch {
		// تجاهل
	}
}

function visible(st) {
	let items = st.all.slice();
	if (st.oaOnly) items = items.filter((x) => x.isOa || x.arxivId);
	if (st.sort === "date")
		items.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
	else items.sort((a, b) => (b.cited || 0) - (a.cited || 0));
	return items;
}

function worksView(chatId) {
	const st = lists.get(chatId);
	if (!st || st.mode !== "works") return null;
	const items = visible(st);
	st.items = items;
	if (!items.length)
		return {
			text: st.header + "\n\n❌ لا نتائج بعد التصفية.",
			keyboard: [
				[{ text: "🔄 أزل تصفية المجاني", callback_data: "o|0" }],
			],
		};
	const pages = Math.ceil(items.length / PER_PAGE);
	const page = Math.min(Math.max(0, st.page || 0), pages - 1);
	st.page = page;
	const slice = items.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

	const lines = [st.header, ""];
	const keyboard = [];
	slice.forEach((it, i) => {
		const n = page * PER_PAGE + i + 1;
		const badge = it.isOa || it.arxivId ? "🟢" : "🔒";
		lines.push("<b>" + n + ".</b> " + badge + " " + esc(cut(it.title, 105)));
		const who = (it.authors || []).slice(0, 3).join(", ");
		const sub = [
			who ? cut(who, 55) : "",
			it.year,
			it.journal ? cut(it.journal, 28) : "",
			it.cited ? it.cited + " اقتباس" : "",
		]
			.filter(Boolean)
			.join(" · ");
		if (sub) lines.push("      <i>" + esc(sub) + "</i>");
		lines.push("");
		keyboard.push([
			{ text: "⬇️ " + n + " · " + cut(it.title, 30), callback_data: "d|" + (n - 1) },
		]);
	});

	const nav = [];
	if (page > 0) nav.push({ text: "◀️", callback_data: "p|" + (page - 1) });
	nav.push({ text: page + 1 + " / " + pages, callback_data: "noop" });
	if (page < pages - 1) nav.push({ text: "▶️", callback_data: "p|" + (page + 1) });
	if (nav.length > 1) keyboard.push(nav);

	keyboard.push([
		{
			text: (st.sort === "cited" ? "✔️ " : "") + "📈 الأكثر اقتباسًا",
			callback_data: "s|cited",
		},
		{
			text: (st.sort === "date" ? "✔️ " : "") + "🆕 الأحدث",
			callback_data: "s|date",
		},
	]);
	keyboard.push([
		{
			text: (st.oaOnly ? "✔️ " : "") + "🟢 المتاح مجانًا فقط",
			callback_data: "o|" + (st.oaOnly ? "0" : "1"),
		},
	]);

	lines.push("🟢 متاح مجانًا · 🔒 يحتاج SNDL");
	return { text: lines.join("\n"), keyboard };
}

function authorsView(chatId) {
	const st = lists.get(chatId);
	if (!st || st.mode !== "authors") return null;
	const lines = [st.header, ""];
	const keyboard = [];
	st.cands.forEach((a, i) => {
		const tag = a.isMath ? "🧮" : "🔬";
		lines.push("<b>" + (i + 1) + ".</b> " + tag + " " + esc(a.name));
		const sub = [
			a.inst ? cut(a.inst, 45) : "مؤسسة غير معروفة",
			a.fields.length ? a.fields.slice(0, 2).join(" / ") : "",
			a.works + " عمل",
		]
			.filter(Boolean)
			.join(" · ");
		lines.push("      <i>" + esc(sub) + "</i>");
		lines.push("");
		keyboard.push([
			{
				text:
					tag + " " + cut(a.name, 22) + " · " + cut(a.inst || "—", 20),
				callback_data: "a|" + i,
			},
		]);
	});
	lines.push("🧮 رياضيات · 🔬 تخصص آخر");
	lines.push("اختر المؤلف الصحيح ⬇️");
	return { text: lines.join("\n"), keyboard };
}

// ================= التسليم =================

let busy = false;
const quota = { day: "", used: 0 };
const today = () => new Date().toISOString().slice(0, 10);

function quotaLeft() {
	if (quota.day !== today()) {
		quota.day = today();
		quota.used = 0;
	}
	return Math.max(0, DAILY_LIMIT - quota.used);
}

function card(item) {
	const lines = ["📄 <b>" + esc(cut(item.title, 200)) + "</b>"];
	if (item.authors && item.authors.length)
		lines.push("👤 " + esc(cut(item.authors.join(", "), 150)));
	const jr = [item.journal, item.year].filter(Boolean).join(" · ");
	if (jr) lines.push("📖 " + esc(jr));
	if (item.doi) lines.push("🔗 <code>" + esc(item.doi) + "</code>");
	return lines.join("\n");
}

async function deliver(chatId, item) {
	if (busy) {
		await say(chatId, "⏳ أعالج طلباً آخر، انتظر قليلاً.");
		return;
	}
	if (quotaLeft() <= 0) {
		await say(chatId, "🚫 بلغت الحد اليومي. جرّب غداً.");
		return;
	}
	const head = card(item);
	let statusId = null;
	try {
		busy = true;
		statusId = await say(chatId, head + "\n\n⏳ أبدأ…");
		const note = (t) => editText(chatId, statusId, head + "\n\n" + t);
		const got = await getPdf(item, note);
		if (!got.bytes) {
			const lines = [head, "", "❌ لم أتمكّن من جلب الملف."];
			lines.push("🔎 " + esc(got.report.steps.join(" · ")));
			if (got.report.sndlError) lines.push("⚠️ " + esc(got.report.sndlError));
			if (got.report.sndl && got.report.sndl.landing)
				lines.push(
					"الصفحة: <code>" + esc(cut(got.report.sndl.landing, 100)) + "</code>",
				);
			await editText(chatId, statusId, lines.join("\n"));
			console.log("❌ فشل", JSON.stringify(got.report));
			return;
		}
		const mb = (got.bytes.length / (1024 * 1024)).toFixed(1);
		await sendDoc(
			chatId,
			got.bytes,
			safeName(item),
			head + "\n\n" + got.source + " · " + mb + " ميجا",
		);
		quota.used += 1;
		await editText(chatId, statusId, "✅ تمّ · متبقٍ اليوم: " + quotaLeft());
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error("❌ deliver", msg);
		if (statusId) await editText(chatId, statusId, "⚠️ " + esc(msg));
		else await say(chatId, "⚠️ " + esc(msg));
	} finally {
		busy = false;
	}
}

async function showWorks(chatId, header, items, query) {
	if (!items.length) {
		await say(
			chatId,
			"❌ لا توجد نتائج.\nجرّب صياغة أخرى، أو اكتب /mode لإلغاء حصر الرياضيات.",
		);
		return;
	}
	lists.set(chatId, {
		mode: "works",
		all: items,
		items,
		page: 0,
		header,
		sort: "cited",
		oaOnly: false,
		query: query || "",
	});
	saveState();
	const view = worksView(chatId);
	await say(chatId, view.text, view.keyboard);
	saveState();
}

async function runAuthorSearch(chatId, name) {
	const wait = await say(chatId, "🔎 أبحث عن المؤلفين…");
	const cands = await authorCandidates(name);
	await api("deleteMessage", { chat_id: chatId, message_id: wait });
	if (!cands.length) {
		const ax = await arxivSearch(name, true);
		await showWorks(chatId, "👤 <b>" + esc(name) + "</b> · arXiv", ax, name);
		return;
	}
	if (cands.length === 1) {
		await openAuthor(chatId, cands[0]);
		return;
	}
	lists.set(chatId, {
		mode: "authors",
		cands,
		header:
			"👤 <b>" +
			esc(name) +
			"</b>\nوجدت " +
			cands.length +
			" باحثًا بهذا الاسم — أيّهم تقصد؟",
		query: name,
	});
	saveState();
	const view = authorsView(chatId);
	await say(chatId, view.text, view.keyboard);
}

async function openAuthor(chatId, a) {
	const wait = await say(chatId, "📚 أجلب أعمال " + esc(a.name) + "…");
	const [oa, ax] = await Promise.all([
		worksByAuthorId(a.id),
		arxivSearch(a.name, true),
	]);
	await api("deleteMessage", { chat_id: chatId, message_id: wait });
	const seen = new Set();
	const merged = [];
	for (const it of oa.concat(ax)) {
		const key = (it.doi || it.arxivId || it.title || "").toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		merged.push(it);
	}
	const header =
		"👤 <b>" +
		esc(a.name) +
		"</b>" +
		(a.inst ? "\n🏛️ " + esc(cut(a.inst, 60)) : "") +
		"\n📚 " +
		merged.length +
		" عملاً" +
		(mathOnly ? " في الرياضيات" : "");
	await showWorks(chatId, header, merged, a.name);
}

async function runTitleSearch(chatId, query) {
	const wait = await say(chatId, "🔎 أبحث في OpenAlex و arXiv…");
	let [oa, ax] = await Promise.all([
		oaWorks(withMath([]), query, "relevance_score:desc", 30),
		arxivSearch(query, false),
	]);
	let note = "";
	if (!oa.length && !ax.length && mathOnly) {
		oa = await oaWorks("", query, "relevance_score:desc", 20);
		if (oa.length) note = "\n⚠️ لا نتائج رياضية — عرضت كل التخصصات";
	}
	await api("deleteMessage", { chat_id: chatId, message_id: wait });
	const seen = new Set();
	const merged = [];
	for (const it of oa.concat(ax)) {
		const key = (it.doi || it.arxivId || it.title || "").toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		merged.push(it);
	}
	await showWorks(
		chatId,
		"🔎 <b>" + esc(cut(query, 60)) + "</b>\n📚 " + merged.length + " نتيجة" + note,
		merged,
		query,
	);
}

// ================= الرسائل =================

async function handleText(chatId, text) {
	if (text === "/start" || text === "/help") {
		await say(chatId, WELCOME);
		return;
	}
	if (text === "/quota") {
		await say(chatId, "📊 متبقٍ اليوم: " + quotaLeft() + " / " + DAILY_LIMIT);
		return;
	}
	if (text === "/mode") {
		mathOnly = !mathOnly;
		await say(
			chatId,
			mathOnly
				? "🧮 الوضع: <b>الرياضيات فقط</b>"
				: "🌐 الوضع: <b>كل التخصصات</b>",
		);
		return;
	}
	const mAuthor = text.match(/^\/a\s+(.+)$/i);
	if (mAuthor) {
		await runAuthorSearch(chatId, mAuthor[1].trim());
		return;
	}
	const mTitle = text.match(/^\/t\s+(.+)$/i);
	if (mTitle) {
		await runTitleSearch(chatId, mTitle[1].trim());
		return;
	}

	const d = detect(text);
	if (DEBUG) console.log("detect", d.kind, d.value);

	if (d.kind === "doi") {
		const item =
			(await openAlexByDoi(d.value)) ||
			(await crossrefMeta(d.value)) || { title: d.value, authors: [], doi: d.value };
		if (!item.doi) item.doi = d.value;
		await deliver(chatId, item);
		return;
	}
	if (d.kind === "arxiv") {
		const item = (await arxivById(d.value)) || {
			title: "arXiv " + d.value,
			authors: [],
			arxivId: d.value,
			oaPdf: "https://arxiv.org/pdf/" + d.value,
		};
		await deliver(chatId, item);
		return;
	}
	if (d.kind === "url") {
		const doi = extractDoi(decodeURIComponent(d.value));
		if (doi) {
			const item = (await openAlexByDoi(doi)) || { title: doi, authors: [], doi };
			await deliver(chatId, item);
		} else {
			await say(chatId, "❓ لم أجد DOI داخل الرابط. انسخ الـ DOI مباشرة.");
		}
		return;
	}
	if (d.kind === "isbn") {
		const b = await bookByIsbn(d.value);
		if (!b) {
			await say(chatId, "❌ لم أجد كتاباً بهذا الـ ISBN.");
			return;
		}
		const lines = ["📘 <b>" + esc(b.title) + "</b>"];
		if (b.authors.length) lines.push("👤 " + esc(b.authors.join(", ")));
		if (b.publisher) lines.push("🏢 " + esc(b.publisher) + " · " + esc(b.year));
		if (b.pages) lines.push("📄 " + b.pages + " صفحة");
		lines.push("🔖 <code>" + esc(b.isbn) + "</code>");
		const kb = [
			[{ text: "📚 Open Library", url: b.olUrl }],
			[
				{
					text: "🏛️ Springer عبر SNDL",
					url: "https://link-springer-com" + SUFFIX + "/search?query=" + enc(b.isbn),
				},
			],
			[
				{
					text: "🏛️ Internet Archive",
					url: "https://archive.org/search?query=" + enc(b.isbn),
				},
			],
		];
		if (b.gbUrl) kb.push([{ text: "📖 Google Books", url: b.gbUrl }]);
		await say(chatId, lines.join("\n"), kb);
		return;
	}
	if (d.kind === "author") {
		await runAuthorSearch(chatId, d.value);
		return;
	}
	await runTitleSearch(chatId, d.value);
}

async function handleCallback(cb) {
	const chatId = cb.message && cb.message.chat && cb.message.chat.id;
	const messageId = cb.message && cb.message.message_id;
	const data = String(cb.data || "");
	if (DEBUG) console.log("🔘", data);
	if (!chatId) {
		await ackCb(cb.id);
		return;
	}
	if (String(chatId) !== OWNER) {
		await ackCb(cb.id, "🔒");
		return;
	}
	if (data === "noop") {
		await ackCb(cb.id);
		return;
	}
	const sep = data.indexOf("|");
	const tag = sep < 0 ? data : data.slice(0, sep);
	const val = sep < 0 ? "" : data.slice(sep + 1);
	const st = lists.get(chatId);

	if (!st) {
		await ackCb(cb.id);
		await say(chatId, "⚠️ انتهت الجلسة. أرسل البحث مرّة أخرى.");
		return;
	}

	if (tag === "a") {
		const a = (st.cands || [])[Number(val)];
		await ackCb(cb.id, a ? "📚 جارٍ…" : "❌");
		if (a) await openAuthor(chatId, a);
		return;
	}
	if (tag === "d") {
		const item = (st.items || [])[Number(val)];
		await ackCb(cb.id, item ? "⬇️ جارٍ…" : "❌ غير موجود");
		if (item) await deliver(chatId, item);
		return;
	}
	if (tag === "p" || tag === "s" || tag === "o") {
		if (tag === "p") st.page = Number(val) || 0;
		if (tag === "s") {
			st.sort = val;
			st.page = 0;
		}
		if (tag === "o") {
			st.oaOnly = val === "1";
			st.page = 0;
		}
		const view = worksView(chatId);
		if (view) await editText(chatId, messageId, view.text, view.keyboard);
		saveState();
		await ackCb(cb.id);
		return;
	}
	await ackCb(cb.id);
}

async function handleUpdate(update) {
	try {
		if (update.callback_query) {
			await handleCallback(update.callback_query);
			return;
		}
		const msg = update.message;
		if (!msg || !msg.text) return;
		const chatId = msg.chat.id;
		if (String(chatId) !== OWNER) {
			await say(chatId, "🔒 هذا بوت خاص.");
			return;
		}
		console.log("💬", cut(msg.text, 60));
		await handleText(chatId, msg.text.trim());
	} catch (err) {
		const m = err instanceof Error ? err.message : String(err);
		console.error("❌ update", m);
		const chatId =
			(update.message && update.message.chat && update.message.chat.id) ||
			(update.callback_query &&
				update.callback_query.message &&
				update.callback_query.message.chat.id);
		if (chatId) await say(chatId, "⚠️ " + esc(m));
	}
}

async function main() {
	loadState();
	await api("deleteWebhook", { drop_pending_updates: true });
	const me = await api("getMe", {});
	const name = me && me.result ? "@" + me.result.username : "البوت";
	console.log(
		"✅ " +
			name +
			" يعمل · الوضع: " +
			(mathOnly ? "رياضيات فقط" : "الكل") +
			(CORE_KEY ? " · CORE ✓" : ""),
	);
	console.log("   للإيقاف: Ctrl + C");
	let offset = 0;
	for (;;) {
		try {
			const res = await api("getUpdates", {
				timeout: 30,
				offset,
				allowed_updates: ["message", "callback_query"],
			});
			for (const u of (res && res.result) || []) {
				offset = u.update_id + 1;
				await handleUpdate(u);
			}
		} catch (err) {
			console.error("⚠️ loop", err instanceof Error ? err.message : err);
			await sleep(3000);
		}
	}
}

process.on("unhandledRejection", (e) => console.error("⚠️ rejection", e));
process.on("SIGINT", async () => {
	console.log("\n👋 إيقاف…");
	saveState();
	if (session) await session.browser.close().catch(() => undefined);
	process.exit(0);
});

main();
