export type ProviderId = "azure" | "atria" | "ahefi";
export type OutputLanguage = "auto" | "ar" | "fr" | "en";

export type ProviderOption = {
  id: ProviderId;
  label: string;
  model: string;
  configured: boolean;
};

export const PROVIDER_STORAGE_KEY = "mathora-ai-provider-v1";
export const LANGUAGE_STORAGE_KEY = "mathora-ai-language-v1";

export const OUTPUT_LANGUAGE_OPTIONS: Array<{ id: OutputLanguage; label: string }> = [
  { id: "auto", label: "تلقائي" },
  { id: "ar", label: "العربية" },
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
];

export const FALLBACK_PROVIDER_OPTIONS: ProviderOption[] = [
  { id: "atria", label: "Atria", model: "Atria-Dawn-Preview", configured: true },
  { id: "ahefi", label: "Ahefi", model: "gpt-5.6-luna", configured: false },
  { id: "azure", label: "Azure OpenAI", model: "Azure deployment", configured: true },
];

export function isProviderId(value: unknown): value is ProviderId {
  return value === "azure" || value === "atria" || value === "ahefi";
}

export function isOutputLanguage(value: unknown): value is OutputLanguage {
  return value === "auto" || value === "ar" || value === "fr" || value === "en";
}