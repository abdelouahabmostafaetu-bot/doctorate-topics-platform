// بروكسي SNDL يعيد كتابة اسم النطاق: كل نقطة تصير شرطة ثم يُضاف اللاحقة.
//   link.springer.com        ->  link-springer-com.www.sndl1.arn.dz
//   www.sciencedirect.com    ->  www-sciencedirect-com.www.sndl1.arn.dz
//   doi.org                  ->  doi-org.www.sndl1.arn.dz
// القاعدة تعمل حتى على doi.org نفسه، لذلك يكفي رابط واحد لكل الناشرين.

export const SNDL_SUFFIX = ".www.sndl1.arn.dz";
export const SNDL_LOGIN_URL = "https://www.sndl.cerist.dz/login.php";
export const SNDL_HOME_URL = "https://www.sndl.cerist.dz/index.php";

/** تحويل أي رابط عمومي إلى رابط داخل بروكسي SNDL. */
export function proxify(rawUrl: string): string {
	let u: URL;
	try {
		u = new URL(rawUrl);
	} catch {
		return rawUrl;
	}
	if (u.hostname.endsWith(SNDL_SUFFIX)) return u.toString();
	u.hostname = u.hostname.replace(/\./g, "-") + SNDL_SUFFIX.slice(1);
	return u.toString();
}

/** هل هذا الرابط داخل البروكسي؟ */
export function isProxied(rawUrl: string): boolean {
	try {
		return new URL(rawUrl).hostname.endsWith(SNDL_SUFFIX.slice(1));
	} catch {
		return false;
	}
}

/** رابط الـ DOI داخل البروكسي — يحوّل تلقائيًا إلى صفحة الناشر. */
export function doiProxyUrl(doi: string): string {
	return "https://doi-org" + SNDL_SUFFIX + "/" + doi;
}

/** استخراج DOI من نصٍّ حرّ (يقبل الرابط الكامل أو الرقم وحده). */
export function extractDoi(text: string): string | null {
	const m = text.match(/10\.\d{4,9}\/[^\s"'<>,;)\]]+/);
	if (!m) return null;
	return m[0].replace(/[.,;]+$/, "");
}
