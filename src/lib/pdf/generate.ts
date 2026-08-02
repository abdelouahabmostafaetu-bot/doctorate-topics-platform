// تحويل HTML إلى PDF عبر متصفح بدون واجهة — يعمل على أي استضافة (Azure/Vercel/حاويات) ومحليًا
import { existsSync } from "node:fs";
import { totalmem } from "node:os";

// ترويسة وتذييل بأسلوب المواضيع الرسمية: خط أفقي رفيع أعلى الصفحة ورقم الصفحة في المنتصف أسفلها
const HEADER =
	'<div style="width:100%;margin:0 25mm;font-size:1px;line-height:1px;border-bottom:0.8px solid #000;">&nbsp;</div>';

// قالب نصي (backticks) حتى تُكتب علامات التنصيص داخل font-family دون أي تهريب
const FOOTER =
	`<div style="width:100%;text-align:center;font-size:10px;color:#000;font-family:'Times New Roman',Georgia,serif;">` +
	'<span class="pageNumber"></span>' +
	"</div>";

// مسارات Chrome/Edge المثبّت محليًا — تُرجِع null بدل رمي خطأ حتى نتابع إلى النسخة المدمجة
function findLocalChrome(): string | null {
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
	return null;
}

// وسائط تشغيل تناسب خادمًا محدود الذاكرة بلا بطاقة رسوميات ولا /dev/shm واسع:
// عملية واحدة بدل شجرة عمليات — وهذا ما يمنع فشل الإطلاق على App Service
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
	"--disable-audio-output",
	"--mute-audio",
	"--js-flags=--max-old-space-size=512",
];

type Launcher = {
	source: "CHROME_PATH" | "local" | "bundled";
	executablePath: string;
	args: string[];
};

/**
 * اختيار المتصفح حسب ما هو متاح فعليًا، لا حسب اسم منصة الاستضافة:
 * 1) CHROME_PATH إن كان مضبوطًا وصحيحًا
 * 2) Chrome/Edge مثبّت محليًا (أثناء التطوير)
 * 3) النسخة المدمجة @sparticuz/chromium (Azure App Service، Vercel، أي حاوية)
 */
async function resolveLauncher(): Promise<Launcher> {
	const explicit = process.env.CHROME_PATH;
	if (explicit && existsSync(explicit)) {
		return { source: "CHROME_PATH", executablePath: explicit, args: LEAN_ARGS };
	}

	const local = findLocalChrome();
	if (local) {
		return { source: "local", executablePath: local, args: LEAN_ARGS };
	}

	const chromium = (await import("@sparticuz/chromium")).default;
	// تعطيل الوضع الرسومي: يوفّر ذاكرة ويتجنّب مكتبات swiftshader غير الموجودة
	chromium.setGraphicsMode = false;
	const executablePath = await chromium.executablePath();
	return {
		source: "bundled",
		executablePath,
		// وسائط الحزمة أولًا ثم وسائطنا حتى تطغى عليها عند التعارض
		args: [...chromium.args, ...LEAN_ARGS],
	};
}

async function launchBrowser() {
	const puppeteer = (await import("puppeteer-core")).default;
	const launcher = await resolveLauncher();
	return puppeteer.launch({
		executablePath: launcher.executablePath,
		args: launcher.args,
		headless: true,
		timeout: 90_000,
		// مهلة بروتوكول طويلة — طباعة الملفات الكبيرة تتجاوز الافتراضي (180ث)
		protocolTimeout: 600_000,
	});
}

/**
 * تشخيص بيئة الطباعة — يستخدمه /api/pdf/diag (للإدارة فقط).
 * يجيب عن السؤال الوحيد المهم: أي متصفح اختاره الخادم، وهل أقلع فعلًا؟
 */
export async function pdfDiagnostics(): Promise<Record<string, unknown>> {
	const report: Record<string, unknown> = {
		platform: process.platform,
		arch: process.arch,
		node: process.version,
		chromePathEnv: process.env.CHROME_PATH ?? null,
		totalMemoryMb: Math.round(totalmem() / (1024 * 1024)),
	};

	let launcher: Launcher;
	try {
		launcher = await resolveLauncher();
		report.source = launcher.source;
		report.executablePath = launcher.executablePath;
		report.executableExists = existsSync(launcher.executablePath);
	} catch (err) {
		report.resolveError = err instanceof Error ? err.message : String(err);
		return report;
	}

	try {
		const puppeteer = (await import("puppeteer-core")).default;
		const browser = await puppeteer.launch({
			executablePath: launcher.executablePath,
			args: launcher.args,
			headless: true,
			timeout: 90_000,
			protocolTimeout: 600_000,
		});
		report.browserVersion = await browser.version();
		await browser.close();
		report.launch = "ok";
	} catch (err) {
		report.launch = "failed";
		report.launchError = err instanceof Error ? err.message : String(err);
	}

	return report;
}

export async function renderPdf(html: string): Promise<Uint8Array> {
	const browser = await launchBrowser();

	try {
		const page = await browser.newPage();
		await page.setContent(html, {
			waitUntil: "load",
			timeout: 180_000,
		});
		// انتظار تحميل خطوط KaTeX وSTIX قبل الطباعة (مع سقف زمني لئلا يتعلّق)
		await Promise.race([
			page.evaluateHandle("document.fonts.ready"),
			new Promise((resolve) => setTimeout(resolve, 20_000)),
		]);
		// مقاس A4 رسمي مع هوامش 25mm في كل الجهات (أسلوب مواضيع المسابقات الرسمية)
		return await page.pdf({
			format: "a4",
			printBackground: true,
			displayHeaderFooter: true,
			headerTemplate: HEADER,
			footerTemplate: FOOTER,
			margin: { top: "25mm", bottom: "25mm", left: "25mm", right: "25mm" },
			timeout: 300_000,
		});
	} finally {
		await browser.close();
	}
}
