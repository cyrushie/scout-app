import type { AiProvider } from "@scout/types"

export type RuntimeTier = "powerful" | "balanced" | "fast" | "specialized"
export type RuntimeAvailability = "listed" | "verified" | "temporary_limit"

export interface RuntimeModelOption {
  provider: AiProvider
  model: string
  tier: RuntimeTier
  label?: string
  availability?: RuntimeAvailability
  note?: string
}

export const ALL_AI_PROVIDERS: AiProvider[] = ["groq", "gemini", "zai", "openrouter"]

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  groq: "Groq",
  gemini: "Gemini",
  zai: "Z.AI",
  openrouter: "OpenRouter",
}

export const TIER_LABELS: Record<RuntimeTier, string> = {
  powerful: "Powerful",
  balanced: "Balanced",
  fast: "Fast / Fallback",
  specialized: "Specialized",
}

export const RUNTIME_MODEL_CATALOG: RuntimeModelOption[] = [
  {
    provider: "groq",
    model: "openai/gpt-oss-120b",
    tier: "powerful",
    availability: "listed",
    note: "Returned 200 in the smoke test, but the tiny test reply came back empty.",
  },
  { provider: "groq", model: "moonshotai/kimi-k2-instruct-0905", tier: "powerful", availability: "listed" },
  { provider: "groq", model: "qwen/qwen3-32b", tier: "powerful", availability: "listed" },
  { provider: "groq", model: "llama-3.3-70b-versatile", tier: "powerful", availability: "listed" },
  { provider: "groq", model: "meta-llama/llama-4-scout-17b-16e-instruct", tier: "balanced", availability: "listed" },
  {
    provider: "groq",
    model: "openai/gpt-oss-20b",
    tier: "balanced",
    availability: "listed",
    note: "Returned 200 in the smoke test, but the tiny test reply came back empty.",
  },
  { provider: "groq", model: "moonshotai/kimi-k2-instruct", tier: "balanced", availability: "listed" },
  { provider: "groq", model: "llama-3.1-8b-instant", tier: "fast", availability: "listed" },

  { provider: "gemini", model: "gemini-2.5-flash", tier: "balanced", availability: "listed" },
  { provider: "gemini", model: "gemini-2.5-flash-lite", tier: "fast", availability: "listed" },
  { provider: "gemini", model: "gemini-flash-lite-latest", tier: "fast", availability: "listed" },

  {
    provider: "zai",
    model: "glm-4.7-flash",
    tier: "balanced",
    availability: "listed",
    note: "Added as a manual test option. Current Z.AI account is still balance-limited.",
  },
  {
    provider: "zai",
    model: "glm-4.5-flash",
    tier: "fast",
    availability: "listed",
    note: "Added as a manual test option. Current Z.AI account is still balance-limited.",
  },

  {
    provider: "openrouter",
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    tier: "powerful",
    availability: "verified",
    note: "Returned 200 in the smoke test, but the tiny test reply came back empty.",
  },
  {
    provider: "openrouter",
    model: "google/gemma-3-12b-it:free",
    tier: "fast",
    availability: "verified",
    note: "Live-tested and working right now.",
  },
]

export function buildRuntimeSelectionValue(provider: AiProvider, model: string) {
  return `${provider}::${model}`
}

export function parseRuntimeSelectionValue(value: string) {
  const separatorIndex = value.indexOf("::")

  if (separatorIndex === -1) {
    return null
  }

  const provider = value.slice(0, separatorIndex) as AiProvider
  const model = value.slice(separatorIndex + 2)

  if (!provider || !model) {
    return null
  }

  return { provider, model }
}

export function findRuntimeCatalogEntry(provider: AiProvider, model: string) {
  return RUNTIME_MODEL_CATALOG.find((entry) => entry.provider === provider && entry.model === model)
}
