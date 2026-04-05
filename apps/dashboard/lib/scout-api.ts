import type {
  AiRuntimeConfig,
  AnalyticsOverview,
  ConversationAnalytics,
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  CreateTenantInput,
  LeadDetail,
  LeadFilters,
  LeadRecord,
  LeadStatus,
  SeverityLevel,
  TenantConfig,
  UpdateTenantInput,
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
    let message = `Scout API request failed: ${response.status}`
    const contentType = response.headers.get("content-type") ?? ""

    if (contentType.includes("application/json")) {
      try {
        const payload = (await response.json()) as {
          error?: string
          message?: string
        }
        message = payload.error ?? payload.message ?? message
      } catch {
        // Keep the status-based fallback if the body is unreadable.
      }
    } else {
      const text = (await response.text()).trim()

      if (text) {
        message = text
      }
    }

    throw new Error(message)
  }

  return response.json()
}

export async function getTenants() {
  return request<TenantConfig[]>("/v1/tenants")
}

export async function getTenant(tenantId: string) {
  return request<TenantConfig>(`/v1/tenants/${tenantId}`)
}

export async function createTenant(input: CreateTenantInput) {
  return request<TenantConfig>("/v1/tenants", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateTenant(input: {
  tenantId: string
  data: UpdateTenantInput
}) {
  return request<TenantConfig>(`/v1/tenants/${input.tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(input.data),
  })
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
