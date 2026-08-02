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

export type FieldInfo = {
	type: string;
	name: string;
	id: string;
	placeholder: string;
	visible: boolean;
};

export type LoginDiagnostics = {
	ok: boolean;
	step: string;
	loginUrl: string;
	finalUrl: string;
	title: string;
	fields: FieldInfo[];
	cookies: string[];
	stillHasPasswordField: boolean;
	bodySnippet: string;
	error?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * محاولة تسجيل الدخول مع جمع معلومات تشخيصية. لا ترمي استثناءً.
 */
async function attemptLogin(browser: Browser): Promise<LoginDiagnostics> {
	const diag: LoginDiagnostics = {
		ok: false,
		step: "start",
		loginUrl: SNDL_LOGIN_URL,
		finalUrl: "",
		title: "",
		fields: [],
		cookies: [],
		stillHasPasswordField: false,
		bodySnippet: "",
	};

	const user = (process.env.SNDL_USER || "").trim();
	const pass = process.env.SNDL_PASS || "";
	if (!user || !pass) {
		diag.step = "missing-env";
		diag.error = "SNDL_USER أو SNDL_PASS غير مضبوط";
		return diag;
	}

	const page = await browser.newPage();
	try {
		await page.setUserAgent(UA);
		await page.setViewport({ width: 1366, height: 900 });
		await page.setExtraHTTPHeaders({
			"Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8,en;q=0.7",
		});

		diag.step = "goto";
		await page.goto(SNDL_LOGIN_URL, {
			waitUntil: "domcontentloaded",
			timeout: 60_000,
		});
		await sleep(1200);

		diag.step = "inspect";
		diag.fields = await page.evaluate(() =>
			Array.from(document.querySelectorAll("input")).map((el) => {
				const i = el as HTMLInputElement;
				return {
					type: i.type || "",
					name: i.name || "",
					id: i.id || "",
					placeholder: i.placeholder || "",
					visible: !!i.offsetParent,
				};
			}),
		);

		diag.step = "fill";
		const filled = await page.evaluate(
			(u: string, p: string) => {
				const inputs = Array.from(
					document.querySelectorAll("input"),
				) as HTMLInputElement[];
				const passEl = inputs.find((i) => i.type === "password");
				const textEl =
					inputs.find(
						(i) =>
							(i.type === "text" || i.type === "email" || i.type === "") &&
							!!i.offsetParent,
					) ||
					inputs.find(
						(i) => i.type === "text" || i.type === "email" || i.type === "",
					);
				if (!passEl || !textEl) return false;
				const setValue = (el: HTMLInputElement, v: string) => {
					el.focus();
					el.value = v;
					el.dispatchEvent(new Event("input", { bubbles: true }));
					el.dispatchEvent(new Event("change", { bubbles: true }));
				};
				setValue(textEl, u);
				setValue(passEl, p);
				return true;
			},
			user,
			pass,
		);
		if (!filled) {
			diag.step = "no-fields";
			diag.error = "لم أجد حقول الدخول في صفحة SNDL";
			diag.finalUrl = page.url();
			diag.title = await page.title().catch(() => "");
			diag.bodySnippet = await page
				.evaluate(() => (document.body.innerText || "").slice(0, 600))
				.catch(() => "");
			return diag;
		}

		diag.step = "submit";
		const nav = page
			.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45_000 })
			.catch(() => null);
		const clicked = await page.evaluate(() => {
			const btn = document.querySelector(
				'input[type="submit"], button[type="submit"], button',
			) as HTMLElement | null;
			if (btn) {
				btn.click();
				return true;
			}
			const form = document.querySelector("form") as HTMLFormElement | null;
			if (form) {
				form.submit();
				return true;
			}
			return false;
		});
		if (!clicked) {
			diag.step = "no-submit";
			diag.error = "لم أجد زر الإرسال في صفحة الدخول";
		}
		await nav;
		await sleep(2500);

		diag.step = "verify";
		diag.finalUrl = page.url();
		diag.title = await page.title().catch(() => "");
		const body = await page
			.evaluate(() => document.body.innerText || "")
			.catch(() => "");
		diag.bodySnippet = body.slice(0, 600);
		diag.stillHasPasswordField = await page
			.evaluate(() => !!document.querySelector('input[type="password"]'))
			.catch(() => true);
		try {
			const cookies = await browser.cookies();
			diag.cookies = cookies.map((c) => c.name);
		} catch {
			diag.cookies = [];
		}

		const positive =
			/D\u00e9connexion/i.test(body) ||
			/Deconnexion/i.test(body) ||
			/bienvenue/i.test(body) ||
			/Modifier mot de passe/i.test(body) ||
			/Mes ressources/i.test(body) ||
			/index\.php/i.test(diag.finalUrl);
		const negative =
			/incorrect/i.test(body) ||
			/invalide/i.test(body) ||
			/erreur/i.test(body) ||
			/login\.php/i.test(diag.finalUrl);

		diag.ok = (positive && !negative) || (!diag.stillHasPasswordField && !negative);
		if (!diag.ok && !diag.error) {
			diag.error = "لم تنجح المصادقة";
		}
		return diag;
	} catch (err) {
		diag.error = err instanceof Error ? err.message : String(err);
		return diag;
	} finally {
		await page.close().catch(() => undefined);
	}
}

/** تشخيص مستقل: يفتح متصفحًا جديدًا، يحاول الدخول، ثم يغلقه. */
export async function sndlLoginDiagnostics(): Promise<LoginDiagnostics> {
	const browser = await launch();
	try {
		return await attemptLogin(browser);
	} finally {
		await browser.close().catch(() => undefined);
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
	const diag = await attemptLogin(browser);
	if (!diag.ok) {
		await browser.close().catch(() => undefined);
		const hint = diag.bodySnippet
			.replace(/\s+/g, " ")
			.slice(0, 160);
		throw new Error(
			`فشل تسجيل الدخول إلى SNDL (${diag.step}) — ${diag.error || "سبب غير معروف"}${hint ? ` | ${hint}` : ""}`,
		);
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
