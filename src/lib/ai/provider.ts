import {
  azureRequestBody,
  getAzureChatConfig,
  type AzureChatConfig,
} from "@/lib/ai/azure";

export type ChatProviderConfig = AzureChatConfig & {
  provider: "azure" | "atria";
  authScheme: "api-key" | "bearer";
};

export function getChatProviderConfig(): ChatProviderConfig | null {
  const provider = (process.env.AI_PROVIDER ?? "azure").trim().toLowerCase();

  if (provider === "atria") {
    const endpoint = (
      process.env.ATRIA_BASE_URL || "https://api.atria-asi.ai/v1"
    )
      .trim()
      .replace(/\/+$/, "");
    const apiKey = (process.env.ATRIA_API_KEY ?? "").trim();
    const deployment = (
      process.env.ATRIA_MODEL || "Atria-Dawn-Preview"
    ).trim();

    if (!endpoint || !apiKey || !deployment) return null;

    return {
      provider: "atria",
      authScheme: "bearer",
      endpoint,
      apiKey,
      deployment,
      chatUrl: `${endpoint}/chat/completions`,
      usesV1: true,
    };
  }

  const azure = getAzureChatConfig();
  return azure
    ? { ...azure, provider: "azure", authScheme: "api-key" }
    : null;
}

export function chatRequestHeaders(config: ChatProviderConfig) {
  return {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(config.authScheme === "bearer"
      ? { Authorization: `Bearer ${config.apiKey}` }
      : { "api-key": config.apiKey }),
  };
}

export { azureRequestBody };