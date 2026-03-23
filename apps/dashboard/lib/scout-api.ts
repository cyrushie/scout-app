import type {
  AiRuntimeConfig,
  AnalyticsOverview,
  ConversationAnalytics,
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  LeadDetail,
  LeadFilters,
  LeadRecord,
  LeadStatus,
  SeverityLevel,
} from "@scout/types"

const DEFAULT_API_URL = "http://localhost:3001"
const DEFAULT_TENANT_ID = "scout-direct"

function getApiBaseUrl() {
  return (process.env.SCOUT_API_URL ?? process.env.NEXT_PUBLIC_SCOUT_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "")
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
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

export async function getAnalyticsOverview(tenantId = DEFAULT_TENANT_ID) {
  return request<AnalyticsOverview>(`/v1/analytics/overview?tenantId=${tenantId}`)
}

export async function getConversationAnalytics(tenantId = DEFAULT_TENANT_ID) {
  return request<ConversationAnalytics>(`/v1/analytics/conversations?tenantId=${tenantId}`)
}

export async function getAiRuntimeConfig() {
  return request<AiRuntimeConfig>("/v1/settings/ai-runtime")
}

export async function updateAiRuntime(input: {
  provider: AiRuntimeConfig["provider"]
  model: string
}) {
  return request<AiRuntimeConfig>("/v1/settings/ai-runtime", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

function buildLeadQuery(filters: LeadFilters = {}) {
  const params = new URLSearchParams()
  params.set("tenantId", filters.tenantId ?? DEFAULT_TENANT_ID)

  if (filters.status) {
    params.set("status", filters.status)
  }

  if (filters.severity) {
    params.set("severity", filters.severity)
  }

  if (filters.search) {
    params.set("search", filters.search)
  }

  return params.toString()
}

function buildConversationQuery(filters: ConversationFilters = {}) {
  const params = new URLSearchParams()
  params.set("tenantId", filters.tenantId ?? DEFAULT_TENANT_ID)

  if (filters.status) {
    params.set("status", filters.status)
  }

  if (filters.severity) {
    params.set("severity", filters.severity)
  }

  if (filters.source) {
    params.set("source", filters.source)
  }

  if (filters.search) {
    params.set("search", filters.search)
  }

  if (typeof filters.leadCreated === "boolean") {
    params.set("leadCreated", String(filters.leadCreated))
  }

  return params.toString()
}

export async function getLeads(filters: LeadFilters = {}) {
  return request<LeadRecord[]>(`/v1/leads?${buildLeadQuery(filters)}`)
}

export async function getLeadDetail(leadId: string) {
  return request<LeadDetail>(`/v1/leads/${leadId}`)
}

export async function getConversations(filters: ConversationFilters = {}) {
  return request<ConversationListItem[]>(`/v1/conversations?${buildConversationQuery(filters)}`)
}

export async function getConversationDetail(conversationId: string) {
  return request<ConversationDetail>(`/v1/conversations/${conversationId}`)
}

export async function updateLead(input: {
  leadId: string
  status?: LeadStatus
}) {
  return request<LeadRecord>(`/v1/leads/${input.leadId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: input.status,
    }),
  })
}
