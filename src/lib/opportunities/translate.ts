import { getChatProviderConfig, type ChatProviderConfig } from "@/lib/ai/provider";
import type { Opportunity } from "./store";

type ArFields = Partial<Pick<Opportunity, "titleAr" | "descriptionAr" | "documentsAr">>;

function headers(config: ChatProviderConfig) {
  return {
    "Content-Type": "application/json",
    ...(config.authScheme === "bearer" ? { Authorization: `Bearer ${config.apiKey}` } : { "api-key": config.apiKey }),
  };
}

/**
 * Best-effort Arabic translation of an automatically harvested opportunity.
 * Uses whichever chat provider is configured (AI_PROVIDER). Any failure
 * returns {} and the UI falls back to the English text.
 */
export async function translateOpportunity(item: Pick<Opportunity, "titleEn" | "descriptionEn" | "documentsEn">): Promise<ArFields> {
  if (process.env.OPPORTUNITIES_TRANSLATE === "off") return {};
  const config = getChatProviderConfig();
  if (!config) return {};
  try {
    const res = await fetch(config.chatUrl, {
      method: "POST",
      headers: headers(config),
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        ...(config.usesV1 ? { model: config.deployment } : {}),
        stream: false,
        temperature: 0.1,
        max_tokens: 1400,
        messages: [
          {
            role: "system",
            content:
              "You translate academic job announcements into clear Modern Standard Arabic for Algerian mathematics students. Translate faithfully; never add facts, amounts or requirements. Keep proper names, institution names, e-mails and URLs in Latin script. Return ONLY a JSON object with keys titleAr, descriptionAr, documentsAr. descriptionAr must be a faithful summary of at most 120 words.",
          },
          { role: "user", content: JSON.stringify({ title: item.titleEn, description: item.descriptionEn.slice(0, 3500), documents: item.documentsEn }) },
        ],
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const out: ArFields = { titleAr: s(json.titleAr, 300), descriptionAr: s(json.descriptionAr, 3000), documentsAr: s(json.documentsAr, 3000) };
    return /[\u0600-\u06ff]/.test(out.titleAr || "") ? out : {};
  } catch {
    return {};
  }
}
