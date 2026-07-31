// توليد غلاف للكتب التي لا غلاف لها (OpenAlex لا يوفر أغلفة).
// SVG خفيف (أقل من 2 كيلوبايت) يُرفع إلى التخزين مثل أي صورة، بلا أي حزمة خارجية.

// لونان لكل تصنيف — تدرّج أعلى إلى أسفل
const PALETTE: Record<string, [string, string]> = {
	"Algebra": ["#1e3a8a", "#3b82f6"],
	"Analysis": ["#134e4a", "#14b8a6"],
	"Geometry": ["#7c2d12", "#f97316"],
	"Topology": ["#4c1d95", "#8b5cf6"],
	"Number Theory": ["#831843", "#ec4899"],
	"Probability & Statistics": ["#1e293b", "#64748b"],
	"Logic & Set Theory": ["#3f3f46", "#a1a1aa"],
	"Differential Equations": ["#164e63", "#06b6d4"],
	"Numerical & Applied Mathematics": ["#365314", "#84cc16"],
	"History & Education": ["#78350f", "#d97706"],
	"General Mathematics": ["#0f172a", "#475569"],
};

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** يقسّم العنوان إلى أسطر بطول معقول */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
	const words = text.split(" ").filter(Boolean);
	const lines: string[] = [];
	let current = "";

	for (const word of words) {
		const candidate = current ? current + " " + word : word;
		if (candidate.length > maxChars && current) {
			lines.push(current);
			current = word;
			if (lines.length === maxLines) break;
		} else {
			current = candidate;
		}
	}

	if (lines.length < maxLines && current) lines.push(current);
	if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
		lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s.,;:]+$/, "") + "\u2026";
	}
	return lines;
}

/** غلاف SVG بمقاس 600×900 يحمل العنوان والمؤلف والتصنيف */
export function coverSvg(title: string, author: string, category: string): Buffer {
	const [from, to] = PALETTE[category] || PALETTE["General Mathematics"];
	const lines = wrap(title, 20, 5);
	const blockHeight = lines.length * 58;
	const startY = 430 - blockHeight / 2 + 44;

	const titleLines = lines
		.map(
			(line, index) =>
				'\t<text x="300" y="' +
				(startY + index * 58) +
				'" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="42" font-weight="bold" fill="#ffffff">' +
				escapeXml(line) +
				"</text>",
		)
		.join("\n");

	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">\n' +
		"\t<defs>\n" +
		'\t\t<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">\n' +
		'\t\t\t<stop offset="0%" stop-color="' + from + '" />\n' +
		'\t\t\t<stop offset="100%" stop-color="' + to + '" />\n' +
		"\t\t</linearGradient>\n" +
		"\t</defs>\n" +
		'\t<rect width="600" height="900" fill="url(#g)" />\n' +
		'\t<rect x="28" y="28" width="544" height="844" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" />\n' +
		'\t<text x="300" y="128" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="4" fill="#ffffff" fill-opacity="0.75">' +
		escapeXml(category.toUpperCase()) +
		"</text>\n" +
		'\t<line x1="220" y1="160" x2="380" y2="160" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" />\n' +
		titleLines +
		"\n" +
		'\t<line x1="240" y1="720" x2="360" y2="720" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" />\n' +
		'\t<text x="300" y="772" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="28" font-style="italic" fill="#ffffff" fill-opacity="0.9">' +
		escapeXml(wrap(author, 28, 1)[0] || "Unknown") +
		"</text>\n" +
		"</svg>\n";

	return Buffer.from(svg, "utf8");
}
