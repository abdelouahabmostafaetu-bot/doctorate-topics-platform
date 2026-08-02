"use strict";
// مساعد الرياضيات — بحث عالمي + تحميل عبر SNDL
// يعمل على حاسوبك داخل الجزائر.

const { existsSync } = require("node:fs");

const TOKEN = (process.env.SNDL_BOT_TOKEN || "").trim();
const OWNER = (process.env.SNDL_OWNER_ID || "").trim();
const SNDL_USER = (process.env.SNDL_USER || "").trim();
const SNDL_PASS = process.env.SNDL_PASS || "";
const MAILTO = process.env.UNPAYWALL_EMAIL || "contact@docmathdz.dev";
const DAILY_LIMIT = Number(process.env.SNDL_DAILY_LIMIT || "50");
const CORE_KEY = (process.env.CORE_API_KEY || "").trim();

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
const MATH_CONCEPT = "C33923547"; // Mathematics في OpenAlex
const PER_PAGE = 5;

let mathOnly = process.env.MATH_ONLY !== "0";

const WELCOME =
	"🧮 <b>مساعد الرياضيات</b>\n\n" +
	"أرسل لي أي شيء ممّا يلي:\n\n" +
	"🔹 <b>DOI</b> — <code>10.1016/j.jmaa.2025.130277</code>\n" +
	"🔹 <b>arXiv</b> — <code>2401.12345</code>\n" +
	"🔹 <b>ISBN</b> — <code>978-3-540-76349-8</code>\n" +
	"🔹 <b>رابط</b> — ScienceDirect أو Springer…\n" +
	"🔹 <b>اسم مؤلف</b> — <code>Xing Fu</code>\n" +
	"🔹 <b>عنوان أو موضوع</b> — <code>Wolff potentials elliptic</code>\n\n" +
	"الأوامر: /quota · /mode · /help";

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

// ================= تيليجرام =================

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
	if (!json || json.ok !== true) {
		throw new Error(
			"فشل إرسال الملف: " + ((json && json.description) || res.status),
		);
	}
}

// ================= أدوات عامة =================

async function httpJson(url, headers) {
	try {
		const res = await fetch(url, {
			headers: Object.assign(
				{ "user-agent": "math-bot/2.0 (mailto:" + MAILTO + ")" },
				headers || {},
			),
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
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
	if (!m) return null;
	return m[0].replace(/[.,;]+$/, "");
}

// ================= كشف نوع المُدخل =================

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

// ================= المصادر =================

function fromOpenAlex(w) {
	if (!w) return null;
	const doi = w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//i, "") : null;
	const authors = (w.authorships || [])
		.slice(0, 5)
		.map((a) => a && a.author && a.author.display_name)
		.filter(Boolean);
	const loc = w.primary_location || {};
	const best = w.best_oa_location || {};
	const landing = String(loc.landing_page_url || "");
	const am = landing.match(/arxiv\.org\/abs\/([^\s/?#]+)/i);
	const bm = String(best.landing_page_url || "").match(
		/arxiv\.org\/abs\/([^\s/?#]+)/i,
	);
	return {
		title: w.display_name || w.title || "",
		authors,
		year: w.publication_year || "",
		journal: (loc.source && loc.source.display_name) || "",
		publisher: (loc.source && loc.source.host_organization_name) || "",
		doi,
		arxivId: (am && am[1]) || (bm && bm[1]) || null,
		oaPdf: best.pdf_url || (w.open_access && w.open_access.oa_url) || null,
		isOa: !!(w.open_access && w.open_access.is_oa),
		cited: w.cited_by_count || 0,
	};
}

function oaFilter(extra) {
	const parts = [];
	if (extra) parts.push(extra);
	if (mathOnly) parts.push("concepts.id:" + MATH_CONCEPT);
	return parts.length ? "&filter=" + parts.join(",") : "";
}

async function openAlexByDoi(doi) {
	const j = await httpJson(
		"https://api.openalex.org/works/doi:" +
			encodeURIComponent(doi) +
			"?mailto=" +
			encodeURIComponent(MAILTO),
	);
	return fromOpenAlex(j);
}

async function openAlexSearch(query) {
	const url =
		"https://api.openalex.org/works?search=" +
		encodeURIComponent(query) +
		oaFilter("") +
		"&per-page=25&sort=relevance_score:desc&mailto=" +
		encodeURIComponent(MAILTO);
	const j = await httpJson(url);
	const list = (j && j.results) || [];
	return list.map(fromOpenAlex).filter(Boolean);
}

async function openAlexByAuthor(name) {
	const au = await httpJson(
		"https://api.openalex.org/authors?search=" +
			encodeURIComponent(name) +
			"&per-page=1&mailto=" +
			encodeURIComponent(MAILTO),
	);
	const first = au && au.results && au.results[0];
	const filter = first
		? "author.id:" + String(first.id).replace(/^https?:\/\/openalex\.org\//i, "")
		: "raw_author_name.search:" + name;
	const url =
		"https://api.openalex.org/works?" +
		oaFilter(filter).slice(1) +
		"&per-page=25&sort=cited_by_count:desc&mailto=" +
		encodeURIComponent(MAILTO);
	const j = await httpJson(url);
	const list = (j && j.results) || [];
	return {
		author: first ? first.display_name : name,
		worksCount: first ? first.works_count : null,
		items: list.map(fromOpenAlex).filter(Boolean),
	};
}

async function crossrefMeta(doi) {
	const j = await httpJson(
		"https://api.crossref.org/works/" +
			encodeURIComponent(doi) +
			"?mailto=" +
			encodeURIComponent(MAILTO),
	);
	const m = j && j.message;
	if (!m) return null;
	const authors = Array.isArray(m.author)
		? m.author
				.slice(0, 5)
				.map((a) => [a.given, a.family].filter(Boolean).join(" "))
				.filter(Boolean)
		: [];
	const dp = (m.issued && m.issued["date-parts"] && m.issued["date-parts"][0]) || [];
	return {
		title: Array.isArray(m.title) ? m.title[0] : m.title || "",
		authors,
		year: dp[0] || "",
		journal: Array.isArray(m["container-title"]) ? m["container-title"][0] : "",
		publisher: m.publisher || "",
		doi,
		arxivId: null,
		oaPdf: null,
		cited: m["is-referenced-by-count"] || 0,
	};
}

async function semanticScholar(doi) {
	const j = await httpJson(
		"https://api.semanticscholar.org/graph/v1/paper/DOI:" +
			encodeURIComponent(doi) +
			"?fields=title,abstract,year,openAccessPdf,citationCount,externalIds",
	);
	if (!j) return null;
	return {
		abstract: j.abstract || "",
		pdf: (j.openAccessPdf && j.openAccessPdf.url) || null,
		arxivId: (j.externalIds && j.externalIds.ArXiv) || null,
		cited: j.citationCount || 0,
	};
}

async function unpaywallPdf(doi) {
	const j = await httpJson(
		"https://api.unpaywall.org/v2/" +
			encodeURIComponent(doi) +
			"?email=" +
			encodeURIComponent(MAILTO),
	);
	if (!j) return null;
	const best = j.best_oa_location;
	if (best && best.url_for_pdf) return best.url_for_pdf;
	for (const l of j.oa_locations || []) if (l && l.url_for_pdf) return l.url_for_pdf;
	return null;
}

async function corePdf(doi) {
	if (!CORE_KEY) return null;
	try {
		const res = await fetch("https://api.core.ac.uk/v3/search/works", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer " + CORE_KEY,
			},
			body: JSON.stringify({ q: 'doi:"' + doi + '"', limit: 3 }),
		});
		if (!res.ok) return null;
		const j = await res.json();
		for (const r of (j && j.results) || [])
			if (r && r.downloadUrl) return r.downloadUrl;
		return null;
	} catch {
		return null;
	}
}

function parseArxivFeed(xml) {
	if (!xml) return [];
	const entries = xml.split("<entry>").slice(1);
	const out = [];
	for (const e of entries) {
		const pick = (re) => {
			const m = e.match(re);
			return m ? m[1].replace(/\s+/g, " ").trim() : "";
		};
		const idRaw = pick(/<id>([\s\S]*?)<\/id>/);
		const idm = idRaw.match(/abs\/(.+)$/);
		const id = idm ? idm[1] : null;
		const authors = [];
		const re = /<name>([\s\S]*?)<\/name>/g;
		let m;
		while ((m = re.exec(e)) !== null && authors.length < 5)
			authors.push(m[1].trim());
		out.push({
			title: pick(/<title>([\s\S]*?)<\/title>/),
			authors,
			year: pick(/<published>([\s\S]*?)<\/published>/).slice(0, 4),
			journal: "arXiv",
			publisher: "arXiv",
			doi: pick(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/) || null,
			arxivId: id,
			oaPdf: id ? "https://arxiv.org/pdf/" + id : null,
			isOa: true,
			cited: 0,
		});
	}
	return out;
}

async function arxivSearch(query) {
	let q = 'all:"' + query.replace(/"/g, "") + '"';
	if (mathOnly) q += " AND cat:math*";
	const xml = await httpText(
		"http://export.arxiv.org/api/query?search_query=" +
			encodeURIComponent(q) +
			"&start=0&max_results=10&sortBy=relevance",
	);
	return parseArxivFeed(xml);
}

async function arxivById(id) {
	const xml = await httpText(
		"http://export.arxiv.org/api/query?id_list=" + encodeURIComponent(id),
	);
	const list = parseArxivFeed(xml);
	return list[0] || null;
}

async function bookByIsbn(isbn) {
	const ol = await httpJson(
		"https://openlibrary.org/api/books?bibkeys=ISBN:" +
			isbn +
			"&format=json&jscmd=data",
	);
	const olBook = ol && ol["ISBN:" + isbn];
	const gb = await httpJson(
		"https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn,
	);
	const gbItem = gb && gb.items && gb.items[0] && gb.items[0].volumeInfo;
	if (!olBook && !gbItem) return null;
	return {
		isbn,
		title: (olBook && olBook.title) || (gbItem && gbItem.title) || "",
		authors:
			(olBook && (olBook.authors || []).map((a) => a.name)) ||
			(gbItem && gbItem.authors) ||
			[],
		year:
			(olBook && olBook.publish_date) || (gbItem && gbItem.publishedDate) || "",
		publisher:
			(olBook && (olBook.publishers || [])[0] && olBook.publishers[0].name) ||
			(gbItem && gbItem.publisher) ||
			"",
		pages: (olBook && olBook.number_of_pages) || (gbItem && gbItem.pageCount) || "",
		olUrl: (olBook && olBook.url) || "https://openlibrary.org/isbn/" + isbn,
		gbUrl:
			(gb && gb.items && gb.items[0] && gb.items[0].volumeInfo.infoLink) || "",
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
	if (!exe)
		throw new Error("لم أجد Chrome أو Edge. أضف CHROME_PATH في ملف .env");
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
				const list = Array.from(document.querySelectorAll(sel))
					.map((a) => a.href)
					.filter(Boolean);
				return Array.from(new Set(list)).slice(0, 6);
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

	if (item.arxivId) {
		if (note) await note("📐 arXiv…");
		const b = await plainDownload("https://arxiv.org/pdf/" + item.arxivId);
		report.steps.push("arxiv:" + (b ? "ok" : "no"));
		if (b) return { bytes: b, source: "📐 arXiv", report };
	}
	if (item.oaPdf) {
		if (note) await note("🌍 وصول مفتوح…");
		const b = await plainDownload(item.oaPdf);
		report.steps.push("oa:" + (b ? "ok" : "no"));
		if (b) return { bytes: b, source: "🌍 وصول مفتوح", report };
	}
	if (item.doi) {
		if (note) await note("🔓 Unpaywall…");
		const up = await unpaywallPdf(item.doi);
		const b = await plainDownload(up);
		report.steps.push("unpaywall:" + (b ? "ok" : "no"));
		if (b) return { bytes: b, source: "🔓 Unpaywall", report };

		if (note) await note("🧠 Semantic Scholar…");
		const s2 = await semanticScholar(item.doi);
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
			if (note) await note("📚 CORE…");
			const c = await plainDownload(await corePdf(item.doi));
			report.steps.push("core:" + (c ? "ok" : "no"));
			if (c) return { bytes: c, source: "📚 CORE", report };
		}

		if (SNDL_USER && SNDL_PASS) {
			if (note) await note("🏛️ SNDL… (قد يأخذ دقيقة)");
			const v = await fetchViaSndl(item.doi);
			report.sndl = v.report;
			report.steps.push("sndl:" + (v.bytes ? "ok" : "no"));
			if (v.bytes) return { bytes: v.bytes, source: "🏛️ SNDL", report };
		}
	}
	return { bytes: null, source: "", report };
}

// ================= العرض =================

function card(item) {
	const lines = ["📄 <b>" + esc(cut(item.title, 200)) + "</b>"];
	if (item.authors && item.authors.length)
		lines.push("👤 " + esc(cut(item.authors.join(", "), 150)));
	const jr = [item.journal, item.year].filter(Boolean).join(" · ");
	if (jr) lines.push("📖 " + esc(jr));
	if (item.doi) lines.push("🔗 <code>" + esc(item.doi) + "</code>");
	if (item.cited) lines.push("📈 " + item.cited + " اقتباس");
	return lines.join("\n");
}

const lists = new Map(); // chatId -> { items, page, header }

function listView(chatId) {
	const st = lists.get(chatId);
	if (!st || !st.items.length)
		return { text: "❌ لا توجد نتائج.", keyboard: [] };
	const pages = Math.ceil(st.items.length / PER_PAGE);
	const page = Math.min(Math.max(0, st.page), pages - 1);
	st.page = page;
	const slice = st.items.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

	const lines = [st.header, ""];
	const keyboard = [];
	slice.forEach((it, i) => {
		const n = page * PER_PAGE + i + 1;
		const badge = it.isOa || it.arxivId ? "🟢" : "🔒";
		lines.push("<b>" + n + ".</b> " + badge + " " + esc(cut(it.title, 110)));
		const sub = [
			it.authors && it.authors.length ? cut(it.authors[0], 28) : "",
			it.year,
			it.journal ? cut(it.journal, 30) : "",
			it.cited ? it.cited + " اقتباس" : "",
		]
			.filter(Boolean)
			.join(" · ");
		if (sub) lines.push("      <i>" + esc(sub) + "</i>");
		lines.push("");
		keyboard.push([
			{ text: "⬇️ " + n + " · " + cut(it.title, 32), callback_data: "d|" + (n - 1) },
		]);
	});

	const nav = [];
	if (page > 0) nav.push({ text: "◀️", callback_data: "p|" + (page - 1) });
	nav.push({ text: page + 1 + " / " + pages, callback_data: "noop" });
	if (page < pages - 1) nav.push({ text: "▶️", callback_data: "p|" + (page + 1) });
	if (nav.length > 1) keyboard.push(nav);

	lines.push("🟢 متاح مجانًا · 🔒 يحتاج SNDL");
	return { text: lines.join("\n"), keyboard };
}

// ================= المنطق =================

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

async function deliver(chatId, item) {
	if (busy) {
		await say(chatId, "⏳ أعالج طلباً آخر، انتظر قليلاً.");
		return;
	}
	if (quotaLeft() <= 0) {
		await say(chatId, "🚫 بلغت الحد اليومي. جرّب غداً.");
		return;
	}
	busy = true;
	const head = card(item);
	const statusId = await say(chatId, head + "\n\n⏳ أبدأ…");
	try {
		const note = (t) => editText(chatId, statusId, head + "\n\n" + t);
		const got = await getPdf(item, note);
		if (!got.bytes) {
			const lines = [head, "", "❌ لم أتمكّن من جلب الملف."];
			lines.push("🔎 المحاولات: " + esc(got.report.steps.join(" · ")));
			if (got.report.sndl && got.report.sndl.landing)
				lines.push(
					"الصفحة: <code>" +
						esc(cut(got.report.sndl.landing, 110)) +
						"</code>",
				);
			if (item.doi)
				lines.push(
					'\n📧 جرّب مراسلة المؤلف — أغلبهم يرسلون المقال مجانًا.',
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
		console.error("❌", msg);
		await editText(chatId, statusId, "⚠️ " + esc(msg));
	} finally {
		busy = false;
	}
}

async function showList(chatId, header, items) {
	if (!items.length) {
		await say(
			chatId,
			"❌ لا توجد نتائجرياضية.\nجرّب صياغة أخرى، أو اكتب /mode لإلغاء حصر الرياضيات.",
		);
		return;
	}
	lists.set(chatId, { items, page: 0, header });
	const view = listView(chatId);
	await say(chatId, view.text, view.keyboard);
}

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

	const d = detect(text);

	if (d.kind === "doi") {
		const item =
			(await openAlexByDoi(d.value)) ||
			(await crossrefMeta(d.value)) || {
				title: d.value,
				authors: [],
				doi: d.value,
			};
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
			await say(
				chatId,
				"❓ لم أجد DOI داخل الرابط.\nافتح صفحة المقال وانسخ الـ DOI مباشرة.",
			);
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
		lines.push("🔖 ISBN: <code>" + esc(b.isbn) + "</code>");
		const kb = [
			[{ text: "📚 Open Library", url: b.olUrl }],
			[
				{
					text: "🏛️ ابحث في Springer عبر SNDL",
					url:
						"https://link-springer-com" +
						SUFFIX +
						"/search?query=" +
						encodeURIComponent(b.isbn),
				},
			],
			[
				{
					text: "🏛️ ابحث في Internet Archive",
					url: "https://archive.org/search?query=" + encodeURIComponent(b.isbn),
				},
			],
		];
		if (b.gbUrl) kb.push([{ text: "📖 Google Books", url: b.gbUrl }]);
		await say(chatId, lines.join("\n"), kb);
		return;
	}

	if (d.kind === "author") {
		const wait = await say(chatId, "🔎 أبحث عن أعمال المؤلف…");
		const r = await openAlexByAuthor(d.value);
		await api("deleteMessage", { chat_id: chatId, message_id: wait });
		const header =
			"👤 <b>" +
			esc(r.author) +
			"</b>\n📚 أعلى " +
			r.items.length +
			" عملاً " +
			(mathOnly ? "في الرياضيات " : "") +
			"حسب الاقتباسات";
		await showList(chatId, header, r.items);
		return;
	}

	// عنوان / موضوع
	const wait = await say(chatId, "🔎 أبحث في OpenAlex و arXiv…");
	const [oa, ax] = await Promise.all([
		openAlexSearch(d.value),
		arxivSearch(d.value),
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
	await showList(
		chatId,
		"🔎 <b>" + esc(cut(d.value, 60)) + "</b>\n📚 " + merged.length + " نتيجة",
		merged,
	);
}

async function handleCallback(cb) {
	const chatId = cb.message.chat.id;
	const messageId = cb.message.message_id;
	const data = String(cb.data || "");
	if (String(chatId) !== OWNER) {
		await ackCb(cb.id, "🔒");
		return;
	}
	if (data === "noop") {
		await ackCb(cb.id);
		return;
	}
	const [tag, val] = data.split("|");
	const st = lists.get(chatId);
	if (!st) {
		await ackCb(cb.id, "انتهت الجلسة — أعد البحث");
		return;
	}
	if (tag === "p") {
		st.page = Number(val) || 0;
		const view = listView(chatId);
		await editText(chatId, messageId, view.text, view.keyboard);
		await ackCb(cb.id);
		return;
	}
	if (tag === "d") {
		const item = st.items[Number(val)];
		await ackCb(cb.id, item ? "⬇️ جارٍ…" : "❌");
		if (item) await deliver(chatId, item);
		return;
	}
	await ackCb(cb.id);
}

async function handleUpdate(update) {
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
	try {
		await handleText(chatId, msg.text.trim());
	} catch (err) {
		const m = err instanceof Error ? err.message : String(err);
		console.error("❌", m);
		await say(chatId, "⚠️ " + esc(m));
	}
}

async function main() {
	await api("deleteWebhook", { drop_pending_updates: true });
	const me = await api("getMe", {});
	const name = me && me.result ? "@" + me.result.username : "البوت";
	console.log("✅ " + name + " يعمل — الوضع: " + (mathOnly ? "رياضيات فقط" : "الكل"));
	console.log("   للإيقاف: Ctrl + C");
	let offset = 0;
	for (;;) {
		try {
			const res = await api("getUpdates", { timeout: 30, offset });
			for (const u of (res && res.result) || []) {
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
