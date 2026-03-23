import type {
  ContactMethod,
  ConversationResponse,
  LeadRecord,
  MessageResponse,
  SeverityAssessment,
} from "@scout/types"

const DEFAULT_TENANT_ID = "scout-direct"
const DEFAULT_API_URL = "http://localhost:3001"

export interface ChatMessageItem {
  id: string
  role: "assistant" | "user"
  content: string
}

export interface LeadSubmissionInput {
  conversationId: string
  name: string
  email?: string
  phone?: string
  preferredContactMethod?: ContactMethod
  availabilityNotes?: string
  city?: string
  region?: string
  suspectedPest?: string
  severity: SeverityAssessment["severity"]
  urgencyScore: number
  summary: string
}

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_SCOUT_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "")
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Scout API request failed: ${response.status}`)
  }

  return response.json()
}

export async function startConversation() {
  return request<ConversationResponse>("/v1/conversations", {
    method: "POST",
    body: JSON.stringify({
      tenantId: DEFAULT_TENANT_ID,
      source: "web",
      locale: "en-US",
    }),
  })
}

export async function sendMessage(conversationId: string, message: string) {
  return request<MessageResponse>("/v1/chat/messages", {
    method: "POST",
    body: JSON.stringify({
      tenantId: DEFAULT_TENANT_ID,
      conversationId,
      message,
    }),
  })
}

export async function submitLead(input: LeadSubmissionInput) {
  return request<LeadRecord>("/v1/leads", {
    method: "POST",
    body: JSON.stringify({
      tenantId: DEFAULT_TENANT_ID,
      ...input,
    }),
  })
}
