export type AzureChatConfig = {
  endpoint: string;
  apiKey: string;
  deployment: string;
  chatUrl: string;
  usesV1: boolean;
};

export function getAzureChatConfig(): AzureChatConfig | null {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.AZURE_OPENAI_API_KEY ?? "").trim();
  const deployment = (
    process.env.AZURE_OPENAI_DEPLOYMENT_KIMI ||
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    ""
  ).trim();
  if (!endpoint || !apiKey || !deployment) return null;

  const alreadyChatUrl = /\/chat\/completions(?:\?.*)?$/i.test(endpoint);
  const usesV1 = /\/openai\/v1$/i.test(endpoint) || /\/openai\/v1\//i.test(endpoint);
  if (alreadyChatUrl) {
    return { endpoint, apiKey, deployment, chatUrl: endpoint, usesV1 };
  }
  if (usesV1) {
    return {
      endpoint,
      apiKey,
      deployment,
      chatUrl: `${endpoint}/chat/completions`,
      usesV1: true,
    };
  }

  const base = endpoint.replace(/\/openai$/i, "");
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  return {
    endpoint,
    apiKey,
    deployment,
    chatUrl: `${base}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
    usesV1: false,
  };
}

export function azureRequestBody(
  config: AzureChatConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  return {
    ...(config.usesV1 ? { model: config.deployment } : {}),
    stream: true,
    max_tokens: 1100,
    temperature: 0.2,
    messages,
  };
}