// تحويل HTML إلى PDF عبر متصفح بدون واجهة — يعمل على Vercel (@sparticuz/chromium) ومحليًا (Chrome/Edge المثبت)
import { existsSync } from "node:fs";

const FOOTER =
	'<div style="width:100%;font-size:8px;color:#666;padding:0 14mm;display:flex;justify-content:space-between;font-family:Georgia,serif;">' +
	"<span>Doctorate Topics Platform — sujet sans corrigé</span>" +
	'<span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
	"</div>";

function guessLocalChrome(): string {
	const candidates =
		process.platform === "win32"
			? [
					"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
					"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
					(process.env.LOCALAPPDATA ?? "") +
						"\\Google\\Chrome\\Application\\chrome.exe",
					"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
					"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
				]
			: process.platform === "darwin"
				? [
						"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
						"/Applications/Chromium.app/Contents/MacOS/Chromium",
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
	throw new Error(
		"Chrome introuvable — définissez la variable CHROME_PATH vers l'exécutable Chrome",
	);
}

export async function renderPdf(html: string): Promise<Uint8Array> {
	const puppeteer = (await import("puppeteer-core")).default;
	const isServerless = Boolean(
		process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
	);

	const browser = isServerless
		? await (async () => {
				const chromium = (await import("@sparticuz/chromium")).default;
				return puppeteer.launch({
					args: chromium.args,
					executablePath: await chromium.executablePath(),
					headless: true,
				});
			})()
		: await puppeteer.launch({
				executablePath: process.env.CHROME_PATH || guessLocalChrome(),
				headless: true,
				args: ["--no-sandbox", "--disable-dev-shm-usage"],
			});

	try {
		const page = await browser.newPage();
		await page.setContent(html, {
			waitUntil: "load",
			timeout: 45000,
		});
		// انتظار تحميل خطوط KaTeX وSTIX قبل الطباعة
		await page.evaluateHandle("document.fonts.ready");
		return await page.pdf({
			format: "a4",
			printBackground: true,
			displayHeaderFooter: true,
			headerTemplate: "<span></span>",
			footerTemplate: FOOTER,
			margin: { top: "13mm", bottom: "16mm", left: "14mm", right: "14mm" },
		});
	} finally {
		await browser.close();
	}
}
