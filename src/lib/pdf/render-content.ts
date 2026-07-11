// تحويل نص التمرين (Markdown + LaTeX) إلى HTML للطباعة — KaTeX يُصيّر المعادلات بخط LaTeX الحقيقي
import katex from "katex";

export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// نفس التطبيع المستخدم في MathContent (صيغة GitLab → صيغة قياسية)
function normalizeMath(src: string): string {
	return src
		.replace(/```math\r?\n([\s\S]*?)```/g, (_m, body) => "\n$$\n" + body + "\n$$\n")
		.replace(/\$`([\s\S]*?)`\$/g, (_m, body) => "$" + body + "$");
}

function renderTex(tex: string, displayMode: boolean): string {
	try {
		return katex.renderToString(tex, {
			displayMode,
			throwOnError: false,
			strict: "ignore",
		});
	} catch {
		return '<code>' + escapeHtml(tex) + "</code>";
	}
}

function renderTable(lines: string[]): string {
	const rows = lines
		.filter((l) => !/^[\s|:\-]+$/.test(l))
		.map((l) =>
			l
				.replace(/^\||\|$/g, "")
				.split("|")
				.map((c) => c.trim()),
		);
	if (rows.length === 0) return "";
	const head = rows[0];
	const body = rows.slice(1);
	const th = head.map((c) => "<th>" + c + "</th>").join("");
	const trs = body
		.map((r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>")
		.join("");
	return "<table><thead><tr>" + th + "</tr></thead><tbody>" + trs + "</tbody></table>";
}

/**
 * محوّل خفيف: معادلات كتلية $$..$$ وسطرية $..$ عبر KaTeX،
 * مع دعم أساسي لـ Markdown (عريض، مائل، قوائم مرقمة/نقطية، جداول، عناوين)
 */
export function renderMathHtml(src: string): string {
	const math: string[] = [];
	let text = normalizeMath(src ?? "");

	// 1) استخراج المعادلات الكتلية ثم السطرية واستبدالها برموز مؤقتة
	text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
		math.push(renderTex(String(tex).trim(), true));
		return "\n@@M" + (math.length - 1) + "@@\n";
	});
	text = text.replace(/\$([^$\n]+?)\$/g, (_m, tex) => {
		math.push(renderTex(String(tex), false));
		return "@@M" + (math.length - 1) + "@@";
	});

	// 2) تأمين النص ثم Markdown سطري
	text = escapeHtml(text)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
		.replace(/`([^`\n]+)`/g, "<code>$1</code>");

	// 3) بناء الكتل سطرًا سطرًا
	const lines = text.split(/\r?\n/);
	const out: string[] = [];
	let list: "ol" | "ul" | null = null;
	let para: string[] = [];
	let table: string[] | null = null;

	const flushPara = () => {
		if (para.length) {
			out.push("<p>" + para.join(" ") + "</p>");
			para = [];
		}
	};
	const closeList = () => {
		if (list) {
			out.push("</" + list + ">");
			list = null;
		}
	};
	const flushTable = () => {
		if (table) {
			out.push(renderTable(table));
			table = null;
		}
	};

	for (const raw of lines) {
		const t = raw.trim();
		if (!t) {
			flushPara();
			closeList();
			flushTable();
			continue;
		}
		if (/^@@M\d+@@$/.test(t)) {
			// معادلة كتلية مستقلة
			flushPara();
			flushTable();
			if (list) {
				out.push('<div class="math-block in-list">' + t + "</div>");
			} else {
				out.push('<div class="math-block">' + t + "</div>");
			}
			continue;
		}
		if (/^\|/.test(t)) {
			flushPara();
			closeList();
			if (!table) table = [];
			table.push(t);
			continue;
		}
		flushTable();
		const h = t.match(/^(#{1,4})\s+(.*)$/);
		const ol = t.match(/^(\d+)[.)]\s+(.*)$/);
		const ul = t.match(/^[-*•]\s+(.*)$/);
		if (h) {
			flushPara();
			closeList();
			out.push("<h4>" + h[2] + "</h4>");
			continue;
		}
		if (ol) {
			flushPara();
			if (list !== "ol") {
				closeList();
				out.push("<ol>");
				list = "ol";
			}
			out.push('<li value="' + ol[1] + '">' + ol[2] + "</li>");
			continue;
		}
		if (ul) {
			flushPara();
			if (list !== "ul") {
				closeList();
				out.push("<ul>");
				list = "ul";
			}
			out.push("<li>" + ul[1] + "</li>");
			continue;
		}
		closeList();
		para.push(t);
	}
	flushPara();
	closeList();
	flushTable();

	// 4) إرجاع المعادلات المُصيّرة
	return out
		.join("\n")
		.replace(/@@M(\d+)@@/g, (_m, i) => math[Number(i)] ?? "");
}
