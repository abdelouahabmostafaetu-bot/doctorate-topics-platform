// تصنيف ذكي للكتب التي عجزت عنها الكلمات المفتاحية.
//
// يستعمل مفتاح AiKey الموجود أصلًا في /admin/ai (المهمة general)، وأي مزوّد
// متوافق مع OpenAI يعمل: Mistral ، Groq ، DeepSeek ، OpenRouter ، Together.
//
// قاعدة الأمان: أي فشل يعني الرجوع إلى نتيجة الكلمات المفتاحية، ولا يوقف الاستيراد أبدًا.

export type ClassifierKey = {
	name: string;
	baseUrl: string;
	model: string;
	apiKey: string;
};

export type ClassifiableBook = {
	title: string;
	summary: string;
};

/** يجلب أول مفتاح عام فعّال، أو null إن لم يوجد */
export async function loadClassifierKey(prisma: {
	aiKey: { findFirst: (args: unknown) => Promise<ClassifierKey | null> };
}): Promise<ClassifierKey | null> {
	try {
		const key = await prisma.aiKey.findFirst({
			where: { active: true, task: "general" },
			select: { name: true, baseUrl: true, model: true, apiKey: true },
			orderBy: { updatedAt: "desc" },
		});
		if (!key || !key.apiKey || !key.baseUrl || !key.model) return null;
		return key;
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

	const endpoint = key.baseUrl.replace(/\/+$/, "") + "/chat/completions";
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 60000);

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			signal: controller.signal,
			headers: {
				"content-type": "application/json",
				authorization: "Bearer " + key.apiKey,
			},
			body: JSON.stringify({
				model: key.model,
				temperature: 0,
				messages: [{ role: "user", content: buildPrompt(books, categories) }],
			}),
		});

		if (!response.ok) {
			console.error("  المصنّف الذكي ردّ بـ " + response.status);
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
