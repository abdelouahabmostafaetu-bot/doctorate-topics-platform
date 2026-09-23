export type ProviderId = "azure" | "atria" | "ahefi";

export type ProviderOption = {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
};

export const PROVIDER_STORAGE_KEY = "mathora-ai-provider-v1";

export const FALLBACK_PROVIDER_OPTIONS: ProviderOption[] = [
  { id: "atria", label: "Atria", model: "Atria-Dawn-Preview", configured: true },
  { id: "ahefi", label: "Ahefi", model: "gpt-5.6-luna", configured: false },
  { id: "azure", label: "Azure OpenAI", model: "Azure deployment", configured: true },
];

export function isProviderId(value: unknown): value is ProviderId {
  return value === "azure" || value === "atria" || value === "ahefi";
}