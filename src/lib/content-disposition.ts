// ترويسة Content-Disposition تجعل المتصفح يُنزّل الملف بدل فتحه داخل الصفحة.
// تدعم الأسماء العربية عبر filename* (RFC 5987) مع بديل ASCII للمتصفحات القديمة.

export function attachmentDisposition(fileName: string): string {
	const name = (fileName || "file").trim();
	const fallback =
		name
			.replace(/[^\x20-\x7e]/g, "_")
			.replace(/["\\]/g, "")
			.trim() || "file";
	return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
