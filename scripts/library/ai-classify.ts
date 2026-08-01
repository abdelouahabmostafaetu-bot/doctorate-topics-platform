// تصنيف ذكي للكتب التي عجزت عنها الكلمات المفتاحية.
//
// ترتيب البحث عن المفتاح:
//
//   1) Azure OpenAI — من متغيّرات البيئة (نفس أسماء Vercel)
//        AZURE_OPENAI_ENDPOINT       https://<resource>.openai.azure.com
//        AZURE_OPENAI_API_KEY        أو AZURE_OPENAI_KEY
//        AZURE_OPENAI_DEPLOYMENT     أو AZURE_OPENAI_DEPLOYMENT_KIMI
//        AZURE_OPENAI_API_VERSION    اختياري (افتراضي 2024-10-21)
//
//   2) أي مزوّد متوافق مع OpenAI — AI_BASE_URL ، AI_API_KEY ، AI_MODEL
//        DeepSeek مباشرة: https://api.deepseek.com/v1 مع deepseek-chat
//
//   3) جدول AiKey في قاعدة البيانات (المهمة general)
//
// قاعدة الأمان: أي فشل يعني الرجوع إلى نتيجة الكلمات المفتاحية، ولا يوقف الاستيراد أبدًا.

export type ClassifierKey = {
	name: string;
	/** رابط كامل جاهز للنداء، بما فيه api-version إن وُجد */
	endpoint: string;
	model: string;
	apiKey: string;
	/** Azure OpenAI يرفض Bearer ويشترط ترويسة api-key */
	auth: "bearer" | "api-key";
};

export type ClassifiableBook = {
	title: string;
	summary: string;
};

function env(...names: string[]): string {
	for (const name of names) {
		const value = (process.env[name] || "").trim();
		if (value) return value;
	}
	return "";
}

/** يلحق مسارًا برابط دون أن يفقد الاستعلام (api-version) */
function joinUrl(base: string, path: string): string {
	try {
		const url = new URL(base);
		url.pathname = url.pathname.replace(/\/+$/, "") + path;
		return url.toString();
	} catch {
		return base.replace(/\/+$/, "") + path;
	}
}

/** يحلّ المفتاح من البيئة ثم من قاعدة البيانات، أو null */
export async function loadClassifierKey(prisma: {
	aiKey: {
		findFirst: (args: unknown) => Promise<{
			name: string;
			baseUrl: string;
			model: string;
			apiKey: string;
		} | null>;
	};
}): Promise<ClassifierKey | null> {
	// 1) Azure OpenAI
	const azureEndpoint = env("AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_BASE_URL");
	const azureKey = env("AZURE_OPENAI_API_KEY", "AZURE_OPENAI_KEY");
	const azureDeployment = env(
		"AZURE_OPENAI_DEPLOYMENT",
		"AZURE_OPENAI_DEPLOYMENT_KIMI",
		"AZURE_OPENAI_DEPLOYMENT_NAME",
	);
	if (azureEndpoint && azureKey && azureDeployment) {
		const apiVersion = env("AZURE_OPENAI_API_VERSION") || "2024-10-21";
		const url = new URL(azureEndpoint);
		url.pathname =
			url.pathname.replace(/\/+$/, "") +
			"/openai/deployments/" + azureDeployment + "/chat/completions";
		url.searchParams.set("api-version", apiVersion);
		return {
			name: "Azure OpenAI / " + azureDeployment,
			endpoint: url.toString(),
			model: azureDeployment,
			apiKey: azureKey,
			auth: "api-key",
		};
	}

	// 2) أي مزوّد متوافق مع OpenAI
	const baseUrl = env("AI_BASE_URL", "OPENAI_BASE_URL", "DEEPSEEK_BASE_URL");
	const apiKey = env("AI_API_KEY", "OPENAI_API_KEY", "DEEPSEEK_API_KEY");
	if (baseUrl && apiKey) {
		return {
			name: "env / " + new URL(baseUrl).hostname,
			endpoint: joinUrl(baseUrl, "/chat/completions"),
			model: env("AI_MODEL", "OPENAI_MODEL") || "deepseek-chat",
			apiKey,
			auth: "bearer",
		};
	}

	// 3) جدول AiKey
	try {
		const key = await prisma.aiKey.findFirst({
			where: { active: true, task: "general" },
			select: { name: true, baseUrl: true, model: true, apiKey: true },
			orderBy: { updatedAt: "desc" },
		});
		if (!key || !key.apiKey || !key.baseUrl || !key.model) return null;
		return {
			name: key.name,
			endpoint: joinUrl(key.baseUrl, "/chat/completions"),
			model: key.model,
			apiKey: key.apiKey,
			auth: key.baseUrl.includes(".azure.com") ? "api-key" : "bearer",
		};
	} catch {
		return null;
	}
}

function buildPrompt(books: ClassifiableBook[], categories: string[]): string {
	const list = categories.map((c) => "- " + c).join("\n");
	const items = books
		.map((b, i) => (i + 1) + ". " + b.title + (b.summary ? " — " + b.summary.slice(0, 200) : ""))
		.join("\n");

	return (
		"You are a mathematics librarian classifying books with the Mathematics Subject Classification.\n\n" +
		"Allowed categories:\n" + list + "\n\n" +
		"Books:\n" + items + "\n\n" +
		"Reply with one line per book, in order, formatted exactly as: <number>|<category>\n" +
		"The category must be copied verbatim from the allowed list. " +
		"If a book is not mathematics or you are unsure, write NONE. " +
		"No preamble, no explanation, no markdown."
	);
}

/**
 * يصنّف دفعة واحدة. يعيد مصفوفة بطول الدفعة نفسه، وكل عنصر اسم باب أو null.
 */
export async function classifyBatch(
	key: ClassifierKey,
	books: ClassifiableBook[],
	categories: string[],
): Promise<Array<string | null>> {
	const empty = books.map(() => null as string | null);
	if (!books.length) return empty;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 90000);

	const headers: Record<string, string> = { "content-type": "application/json" };
	if (key.auth === "api-key") headers["api-key"] = key.apiKey;
	else headers.authorization = "Bearer " + key.apiKey;

	try {
		const response = await fetch(key.endpoint, {
			method: "POST",
			signal: controller.signal,
			headers,
			body: JSON.stringify({
				model: key.model,
				temperature: 0,
				messages: [{ role: "user", content: buildPrompt(books, categories) }],
			}),
		});

		if (!response.ok) {
			const detail = (await response.text()).slice(0, 300);
			console.error("  المصنّف الذكي ردّ بـ " + response.status + ": " + detail);
			return empty;
		}

		const payload = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const text = payload.choices?.[0]?.message?.content || "";

		const allowed = new Map(categories.map((c) => [c.toLowerCase(), c]));
		const result = [...empty];

		for (const line of text.split("\n")) {
			const match = line.match(/^\s*(\d+)\s*[|.:-]\s*(.+?)\s*$/);
			if (!match) continue;
			const index = Number(match[1]) - 1;
			if (index < 0 || index >= books.length) continue;
			const name = allowed.get(match[2].toLowerCase().replace(/^[-*\s]+/, ""));
			if (name) result[index] = name;
		}

		return result;
	} catch (error) {
		console.error("  المصنّف الذكي فشل: " + (error as Error).message);
		return empty;
	} finally {
		clearTimeout(timer);
	}
}
