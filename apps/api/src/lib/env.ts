import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AiProvider } from "@scout/types";

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(currentDir, "..", "..");

process.loadEnvFile?.(resolve(apiRoot, ".env"));

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function getBooleanEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase()

  if (!value) {
    return fallback
  }

  return value === "1" || value === "true" || value === "yes" || value === "on"
}

export const env = {
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  DIRECT_URL: getRequiredEnv("DIRECT_URL"),
  SCOUT_DISABLE_AI_FALLBACK: getBooleanEnv("SCOUT_DISABLE_AI_FALLBACK", false),
  SCOUT_AI_PROVIDER_DEFAULT:
    (getOptionalEnv("SCOUT_AI_PROVIDER_DEFAULT") as AiProvider | undefined) ?? "groq",
  GROQ_API_KEY: getOptionalEnv("GROQ_API_KEY"),
  GROQ_BASE_URL:
    getOptionalEnv("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1",
  GOOGLE_GENERATIVE_AI_API_KEY: getOptionalEnv("GOOGLE_GENERATIVE_AI_API_KEY"),
  ZAI_API_KEY: getOptionalEnv("ZAI_API_KEY"),
  ZAI_BASE_URL:
    getOptionalEnv("ZAI_BASE_URL") ?? "https://api.z.ai/api/paas/v4",
  OPENROUTER_API_KEY: getOptionalEnv("OPENROUTER_API_KEY"),
  OPENROUTER_BASE_URL:
    getOptionalEnv("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1",
  SCOUT_AI_MODEL: getOptionalEnv("SCOUT_AI_MODEL") ?? "llama-3.1-8b-instant",
  RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY"),
  RESEND_FROM_EMAIL:
    getOptionalEnv("RESEND_FROM_EMAIL") ?? "Scout <onboarding@resend.dev>",
  SUMMARY_EMAIL_OVERRIDE: getOptionalEnv("SUMMARY_EMAIL_OVERRIDE"),
  SUMMARY_SMS_OVERRIDE: getOptionalEnv("SUMMARY_SMS_OVERRIDE"),
  SUPABASE_URL: getRequiredEnv("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  TWILIO_ACCOUNT_SID: getOptionalEnv("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: getOptionalEnv("TWILIO_AUTH_TOKEN"),
  TWILIO_PHONE_NUMBER: getOptionalEnv("TWILIO_PHONE_NUMBER"),
};
