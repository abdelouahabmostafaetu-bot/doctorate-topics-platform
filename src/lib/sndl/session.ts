// جلسة SNDL: متصفح خفي يسجّل الدخول مرة واحدة ثم يُعاد استعماله.
import { existsSync } from "node:fs";
import type { Browser, Page } from "puppeteer-core";
import { SNDL_LOGIN_URL } from "./proxy";

const LEAN_ARGS = [
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--disable-dev-shm-usage",
	"--disable-gpu",
	"--single-process",
	"--no-zygote",
	"--no-first-run",
	"--disable-extensions",
	"--disable-background-networking",
	"--mute-audio",
	"--js-flags=--max-old-space-size=512",
];

const UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** عمر الجلسة قبل إعادة تسجيل الدخول (25 دقيقة). */
const SESSION_TTL_MS = 25 * 60 * 1000;

type Cache = { browser: Browser; at: number };
const g = globalThis as unknown as { __sndlSession?: Cache };

function findLocalChrome(): string | null {
	const candidates =
		process.platform === "win32"
			? [
					"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
					"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
					"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
				]
			: [
					"/usr/bin/google-chrome",
					"/usr/bin/google-chrome-stable",
					"/usr/bin/chromium-browser",
					"/usr/bin/chromium",
				];
	for (const c of candidates) {
		try {
			if (c && existsSync(c)) return c;
		} catch {
			// تجاهل
		}
	}
	return null;
}

async function launch(): Promise<Browser> {
	const puppeteer = (await import("puppeteer-core")).default;
	const explicit = process.env.CHROME_PATH;
	if (explicit && existsSync(explicit)) {
		return puppeteer.launch({
			executablePath: explicit,
			args: LEAN_ARGS,
			headless: true,
			timeout: 90_000,
			protocolTimeout: 300_000,
		});
	}
	const local = findLocalChrome();
	if (local) {
		return puppeteer.launch({
			executablePath: local,
			args: LEAN_ARGS,
			headless: true,
			timeout: 90_000,
			protocolTimeout: 300_000,
		});
	}
	const chromium = (await import("@sparticuz/chromium")).default;
	chromium.setGraphicsMode = false;
	const executablePath = await chromium.executablePath();
	return puppeteer.launch({
		executablePath,
		args: [...chromium.args, ...LEAN_ARGS],
		headless: true,
		timeout: 90_000,
		protocolTimeout: 300_000,
	});
}

/** تسجيل الدخول إلى بوابة SNDL. يرمي خطأً واضحًا عند الفشل. */
async function login(browser: Browser): Promise<void> {
	const user = process.env.SNDL_USER;
	const pass = process.env.SNDL_PASS;
	if (!user || !pass) {
		throw new Error("SNDL_USER أو SNDL_PASS غير مضبوط في إعدادات الخادم");
	}

	const page = await browser.newPage();
	try {
		await page.setUserAgent(UA);
		await page.goto(SNDL_LOGIN_URL, {
			waitUntil: "domcontentloaded",
			timeout: 60_000,
		});

		const userInput = await page.$('input[type="text"]');
		const passInput = await page.$('input[type="password"]');
		if (!userInput || !passInput) {
			throw new Error("لم أجد حقول الدخول في صفحة SNDL — ربما تغيّر شكل الصفحة");
		}

		await userInput.type(user, { delay: 25 });
		await passInput.type(pass, { delay: 25 });

		const submit = await page.$(
			'input[type="submit"], button[type="submit"]',
		);
		const nav = page
			.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 })
			.catch(() => null);
		if (submit) {
			await submit.click();
		} else {
			await page.evaluate(() => {
				const f = document.querySelector("form");
				if (f) (f as HTMLFormElement).submit();
			});
		}
		await nav;

		const body = await page.evaluate(() => document.body.innerText || "");
		const ok =
			/D\u00e9connexion/i.test(body) ||
			/bienvenue/i.test(body) ||
			/Modifier mot de passe/i.test(body);
		if (!ok) {
			throw new Error(
				"فشل تسجيل الدخول إلى SNDL — تحقّق من اسم المستخدم وكلمة السر",
			);
		}
	} finally {
		await page.close().catch(() => undefined);
	}
}

/** متصفح مسجَّل الدخول جاهز للاستعمال (يُعاد استعماله بين الطلبات). */
export async function getSndlBrowser(): Promise<Browser> {
	const cached = g.__sndlSession;
	if (cached) {
		const fresh = Date.now() - cached.at < SESSION_TTL_MS;
		let alive = false;
		try {
			alive = cached.browser.connected;
		} catch {
			alive = false;
		}
		if (fresh && alive) return cached.browser;
		try {
			await cached.browser.close();
		} catch {
			// تجاهل
		}
		g.__sndlSession = undefined;
	}

	const browser = await launch();
	try {
		await login(browser);
	} catch (err) {
		await browser.close().catch(() => undefined);
		throw err;
	}
	g.__sndlSession = { browser, at: Date.now() };
	return browser;
}

/** إغلاق الجلسة يدويًا. */
export async function closeSndlBrowser(): Promise<void> {
	const cached = g.__sndlSession;
	g.__sndlSession = undefined;
	if (cached) await cached.browser.close().catch(() => undefined);
}

/** صفحة جديدة بإعدادات متصفح حقيقي. */
export async function newSndlPage(browser: Browser): Promise<Page> {
	const page = await browser.newPage();
	await page.setUserAgent(UA);
	await page.setViewport({ width: 1366, height: 900 });
	return page;
}
