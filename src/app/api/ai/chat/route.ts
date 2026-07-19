// app/api/ai/chat/route.ts
// نقطة الدردشة: تستقبل رسائل المستخدم + سياق الموضوع (التمارين) وترجع رد الموديل بالبث المباشر (streaming)
// يعمل مع أي مزود متوافق مع OpenAI (OpenAI / Groq / DeepSeek / OpenRouter / Together ...)

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma" // عدّل المسار حسب مشروعك

export const dynamic = "force-dynamic"
export const maxDuration = 60

type ChatMessage = { role: "user" | "assistant"; content: string }
type ProblemCtx = { problemNumber?: number; title?: string; statement?: string }

const BASE_SYSTEM_PROMPT = `أنت مساعد رياضيات لطلبة مسابقات الدكتوراه في الجزائر داخل "وضع القراءة" لموقع docmathdz.
مهمتك: شرح التمارين، توضيح الأفكار، الإجابة عن أسئلة الطالب حول الموضوع المعروض.
قواعد صارمة:
- أجب بالعربية إلا إذا طلب المستخدم لغة أخرى، مع إبقاء المصطلحات الرياضية بالفرنسية/الإنجليزية عند الحاجة.
- اكتب الرياضيات بصيغة LaTeX: استعمل $...$ للرياضيات داخل السطر، و $$ في سطر مستقل ثم المعادلة ثم $$ في سطر مستقل للمعادلات الكبيرة.
- كن واضحاً ومنظماً: عناوين قصيرة، خطوات مرقمة عند الشرح.
- إذا سُئلت عن تمرين موجود في السياق أدناه فاعتمد على نصه حرفياً.
- لا تختلق نص تمرين غير موجود في السياق.`

function buildContext(title: string | undefined, problems: ProblemCtx[] | undefined): string {
	if (!title && (!problems || problems.length === 0)) return ""
	let ctx = "\n\n===== سياق الموضوع المعروض حالياً =====\n"
	if (title) ctx += `العنوان: ${title}\n`
	if (problems) {
		for (const p of problems) {
			ctx += `\n--- تمرين ${p.problemNumber ?? ""} ${p.title ? `: ${p.title}` : ""} ---\n`
			ctx += (p.statement ?? "").slice(0, 6000) + "\n"
		}
	}
	// حد أقصى إجمالي للسياق حتى لا نتجاوز حدود الموديل
	return ctx.slice(0, 24000)
}

export async function POST(req: NextRequest) {
	const s = await prisma.aiSetting.findUnique({ where: { key: "reading_mode" } })
	if (!s || !s.enabled || !s.apiKey) {
		return new Response(JSON.stringify({ error: "AI غير مفعّل" }), { status: 403 })
	}

	const body = await req.json().catch(() => null)
	if (!body || !Array.isArray(body.messages)) {
		return new Response(JSON.stringify({ error: "طلب غير صالح" }), { status: 400 })
	}

	const userMessages: ChatMessage[] = body.messages
		.filter((m: ChatMessage) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
		.slice(-20) // آخر 20 رسالة فقط
		.map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, 8000) }))

	const systemPrompt =
		BASE_SYSTEM_PROMPT +
		(s.systemPrompt ? `\n\nتعليمات إضافية من المشرف:\n${s.systemPrompt}` : "") +
		buildContext(body?.context?.title, body?.context?.problems)

	const upstream = await fetch(`${s.baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${s.apiKey}`,
		},
		body: JSON.stringify({
			model: s.model,
			stream: true,
			temperature: s.temperature,
			max_tokens: s.maxTokens,
			messages: [{ role: "system", content: systemPrompt }, ...userMessages],
		}),
	})

	if (!upstream.ok || !upstream.body) {
		const t = await upstream.text().catch(() => "")
		return new Response(JSON.stringify({ error: `فشل الاتصال بالمزود (HTTP ${upstream.status}): ${t.slice(0, 300)}` }), {
			status: 502,
		})
	}

	// نحول SSE القادم من المزود إلى بث نصي بسيط (نص فقط) يقرأه المتصفح تدريجياً
	const decoder = new TextDecoder()
	const encoder = new TextEncoder()
	let buffer = ""

	const transform = new TransformStream<Uint8Array, Uint8Array>({
		transform(chunk, controller) {
			buffer += decoder.decode(chunk, { stream: true })
			const lines = buffer.split("\n")
			buffer = lines.pop() ?? ""
			for (const line of lines) {
				const trimmed = line.trim()
				if (!trimmed.startsWith("data:")) continue
				const data = trimmed.slice(5).trim()
				if (data === "[DONE]") continue
				try {
					const j = JSON.parse(data)
					const delta = j?.choices?.[0]?.delta?.content
					if (typeof delta === "string" && delta.length > 0) {
						controller.enqueue(encoder.encode(delta))
					}
				} catch {
					// نتجاهل الأسطر غير الصالحة
				}
			}
		},
	})

	return new Response(upstream.body.pipeThrough(transform), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-cache, no-transform",
			"X-Accel-Buffering": "no",
		},
	})
}
