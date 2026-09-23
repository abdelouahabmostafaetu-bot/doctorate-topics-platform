import {
  azureRequestBody,
  getAzureChatConfig,
  type AzureChatConfig,
} from "@/lib/ai/azure";

export type ChatProviderId = "azure" | "atria" | "ahefi";

export type ChatProviderConfig = AzureChatConfig & {
  provider: ChatProviderId;
  authScheme: "api-key" | "bearer";
};

export type ChatProviderOption = {
  id: ChatProviderId;
  label: string;
  model: string;
  configured: boolean;
};

const PROVIDER_LABELS: Record<ChatProviderId, string> = {
  azure: "Azure OpenAI",
  atria: "Atria",
  ahefi: "Ahefi",
};

function normalizeProvider(value: string | undefined): ChatProviderId | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "azure" || normalized === "atria" || normalized === "ahefi"
    ? normalized
    : null;
}

export function getDefaultChatProvider(): ChatProviderId {
  return normalizeProvider(process.env.AI_PROVIDER) ?? "azure";
}

export function getChatProviderLabel(provider: string | undefined) {
  return PROVIDER_LABELS[normalizeProvider(provider) ?? "azure"];
}

export function getChatProviderConfig(requestedProvider?: string): ChatProviderConfig | null {
  const provider = normalizeProvider(requestedProvider) ?? getDefaultChatProvider();

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

  if (provider === "ahefi") {
    const endpoint = (
      process.env.AHEFI_BASE_URL || "https://ahefi.com/v1"
    )
      .trim()
      .replace(/\/+$/, "");
    const apiKey = (process.env.AHEFI_API_KEY ?? "").trim();
    const deployment = (
      process.env.AHEFI_MODEL || "gpt-5.6-luna"
    ).trim();

    if (!endpoint || !apiKey || !deployment) return null;

    return {
      provider: "ahefi",
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

export function getChatProviderOptions(): ChatProviderOption[] {
  const models: Record<ChatProviderId, string> = {
    azure: process.env.AZURE_OPENAI_DEPLOYMENT_KIMI || process.env.AZURE_OPENAI_DEPLOYMENT || "Azure deployment",
    atria: process.env.ATRIA_MODEL || "Atria-Dawn-Preview",
    ahefi: process.env.AHEFI_MODEL || "gpt-5.6-luna",
  };

  return (Object.keys(PROVIDER_LABELS) as ChatProviderId[]).map((id) => ({
    id,
    label: PROVIDER_LABELS[id],
    model: models[id],
    configured: Boolean(getChatProviderConfig(id)),
  }));
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