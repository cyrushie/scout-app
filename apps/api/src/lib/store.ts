import type {
  AiRuntimeConfig,
  ConversationAnalytics,
  AnalyticsOverview,
  CreateTenantInput,
  ConversationDetail,
  ConversationFilters,
  ConversationListItem,
  ConversationMessage,
  ConversationRecord,
  DashboardMetric,
  LeadDetail,
  LeadFilters,
  LeadQueueItem,
  LeadRecord,
  TenantConfig,
  UpdateTenantInput,
} from "@scout/types"
import { prisma } from "./prisma.js"
import { env } from "./env.js"

const seededTenants: TenantConfig[] = [
  {
    id: "scout-direct",
    companyName: "Scout Direct",
    brandName: "Scout",
    widgetAccentColor: "#111111",
    allowedDomains: ["localhost", "scoutai.app"],
    serviceAreas: ["Florida", "Texas", "Arizona"],
    supportEmail: "support@scoutai.app",
    widgetEnabled: true,
    assistantVoice: "Calm, practical, and non-alarmist.",
    scoutInstructions: "",
  },
  {
    id: "sunrise-pest",
    companyName: "Sunrise Pest Control",
    brandName: "Sunrise Pest",
    widgetAccentColor: "#1d8f6a",
    allowedDomains: ["sunrisepest.example"],
    serviceAreas: ["Florida"],
    supportEmail: "ops@sunrisepest.example",
    widgetEnabled: true,
    assistantVoice: "Helpful, reassuring, and concise.",
    scoutInstructions: "",
  },
]

const DEFAULT_RUNTIME_CONFIG_ID = "default"

function buildLeadDisplayId(id: string) {
  return `LEAD-${id.slice(-6).toUpperCase()}`
}

function toTenantConfig(tenant: {
  id: string
  companyName: string
  brandName: string
  widgetAccentColor: string | null
  allowedDomains: string[]
  serviceAreas: string[]
  supportEmail: string
  widgetEnabled: boolean
  assistantVoice: string
  scoutInstructions: string
}): TenantConfig {
  return {
    id: tenant.id,
    companyName: tenant.companyName,
    brandName: tenant.brandName,
    widgetAccentColor: tenant.widgetAccentColor ?? undefined,
    allowedDomains: tenant.allowedDomains,
    serviceAreas: tenant.serviceAreas,
    supportEmail: tenant.supportEmail,
    widgetEnabled: tenant.widgetEnabled,
    assistantVoice: tenant.assistantVoice,
    scoutInstructions: tenant.scoutInstructions,
  }
}

function toAiRuntimeConfig(config: {
  provider: string
  model: string
  updatedAt: Date
}): AiRuntimeConfig {
  return {
    provider: config.provider as AiRuntimeConfig["provider"],
    model: config.model,
    updatedAt: config.updatedAt.toISOString(),
  }
}

function toConversationRecord(conversation: {
  id: string
  tenantId: string
  source: string
  locale: string
  status: string
  aiProviderUsed: string | null
  aiModelUsed: string | null
  preferredName: string | null
  city: string | null
  region: string | null
  summaryRequested: boolean
  summaryEmail: string | null
  summaryPhone: string | null
  preferredContactMethod: string | null
  availabilityNotes: string | null
  severity: string
  suspectedPest: string | null
  urgencyScore: number
  leadOffered: boolean
  createdAt: Date
  updatedAt: Date
}): ConversationRecord {
  return {
    id: conversation.id,
    tenantId: conversation.tenantId,
    source: conversation.source as ConversationRecord["source"],
    locale: conversation.locale,
    status: conversation.status as ConversationRecord["status"],
    aiProviderUsed: (conversation.aiProviderUsed as ConversationRecord["aiProviderUsed"]) ?? undefined,
    aiModelUsed: conversation.aiModelUsed ?? undefined,
    preferredName: conversation.preferredName ?? undefined,
    city: conversation.city ?? undefined,
    region: conversation.region ?? undefined,
    summaryRequested: conversation.summaryRequested,
    summaryEmail: conversation.summaryEmail ?? undefined,
    summaryPhone: conversation.summaryPhone ?? undefined,
    preferredContactMethod:
      (conversation.preferredContactMethod as ConversationRecord["preferredContactMethod"]) ?? undefined,
    availabilityNotes: conversation.availabilityNotes ?? undefined,
    severity: conversation.severity as ConversationRecord["severity"],
    suspectedPest: conversation.suspectedPest,
    urgencyScore: conversation.urgencyScore,
    leadOffered: conversation.leadOffered,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  }
}

function toConversationMessage(message: {
  id: string
  conversationId: string
  role: string
  content: string
  createdAt: Date
}): ConversationMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as ConversationMessage["role"],
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }
}

function toConversationListItem(input: {
  id: string
  tenantId: string
  source: string
  locale: string
  status: string
  aiProviderUsed: string | null
  aiModelUsed: string | null
  preferredName: string | null
  city: string | null
  region: string | null
  summaryRequested: boolean
  summaryEmail: string | null
  summaryPhone: string | null
  preferredContactMethod: string | null
  availabilityNotes: string | null
  severity: string
  suspectedPest: string | null
  urgencyScore: number
  leadOffered: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    messages: number
  }
  lead: {
    id: string
  } | null
}): ConversationListItem {
  return {
    ...toConversationRecord(input),
    messageCount: input._count.messages,
    leadCreated: Boolean(input.lead),
    leadId: input.lead?.id,
  }
}

function toLeadRecord(lead: {
  id: string
  tenantId: string
  conversationId: string
  name: string
  email: string | null
  phone: string | null
  preferredContactMethod: string | null
  availabilityNotes: string | null
  city: string | null
  region: string | null
  suspectedPest: string | null
  severity: string
  urgencyScore: number
  summary: string
  status: string
  createdAt: Date
}): LeadRecord {
  return {
    id: lead.id,
    displayId: buildLeadDisplayId(lead.id),
    tenantId: lead.tenantId,
    conversationId: lead.conversationId,
    name: lead.name,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    preferredContactMethod:
      (lead.preferredContactMethod as LeadRecord["preferredContactMethod"]) ?? undefined,
    availabilityNotes: lead.availabilityNotes ?? undefined,
    city: lead.city ?? undefined,
    region: lead.region ?? undefined,
    suspectedPest: lead.suspectedPest ?? undefined,
    severity: lead.severity as LeadRecord["severity"],
    urgencyScore: lead.urgencyScore,
    summary: lead.summary,
    status: lead.status as LeadRecord["status"],
    createdAt: lead.createdAt.toISOString(),
  }
}

const conversationStatuses = [
  "intake",
  "intake_issue",
  "intake_location",
  "intake_name_optional",
  "clarification",
  "assessment",
  "recommendation",
  "summary_offer",
  "contact_capture",
  "handoff_offer",
  "scheduling_capture",
  "lead_capture",
  "complete",
] as const satisfies ReadonlyArray<ConversationRecord["status"]>

const funnelStages = [
  { key: "started", label: "Started", statuses: conversationStatuses },
  {
    key: "assessment",
    label: "Reached assessment",
    statuses: ["assessment", "recommendation", "summary_offer", "contact_capture", "handoff_offer", "scheduling_capture", "lead_capture", "complete"],
  },
  {
    key: "summary",
    label: "Summary offer",
    statuses: ["summary_offer", "contact_capture", "handoff_offer", "scheduling_capture", "lead_capture", "complete"],
  },
  {
    key: "handoff",
    label: "Handoff offer",
    statuses: ["handoff_offer", "scheduling_capture", "lead_capture", "complete"],
  },
  {
    key: "scheduling",
    label: "Scheduling",
    statuses: ["scheduling_capture", "lead_capture", "complete"],
  },
  {
    key: "complete",
    label: "Complete",
    statuses: ["complete"],
  },
] as const

export async function ensureSeedData() {
  await Promise.all(
    seededTenants.map((tenant) =>
      prisma.tenant.upsert({
        where: { id: tenant.id },
        create: tenant,
        update: {},
      }),
    ),
  )

  await prisma.scoutRuntimeConfig.upsert({
    where: { id: DEFAULT_RUNTIME_CONFIG_ID },
    create: {
      id: DEFAULT_RUNTIME_CONFIG_ID,
      provider: env.SCOUT_AI_PROVIDER_DEFAULT,
      model: env.SCOUT_AI_MODEL,
    },
    update: {},
  })
}

export async function listTenants(): Promise<TenantConfig[]> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "asc" },
  })

  return tenants.map(toTenantConfig)
}

export async function getTenantOrThrow(tenantId: string): Promise<TenantConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  })

  if (!tenant) {
    throw new Error(`Unknown tenant: ${tenantId}`)
  }

  return toTenantConfig(tenant)
}

export async function createTenant(input: CreateTenantInput): Promise<TenantConfig> {
  const existingTenant = await prisma.tenant.findUnique({
    where: { id: input.id },
    select: { id: true },
  })

  if (existingTenant) {
    throw new Error(`Tenant id already exists: ${input.id}`)
  }

  const tenant = await prisma.tenant.create({
    data: input,
  })

  return toTenantConfig(tenant)
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
): Promise<TenantConfig> {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: input,
  })

  return toTenantConfig(tenant)
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const config = await prisma.scoutRuntimeConfig.findUnique({
    where: { id: DEFAULT_RUNTIME_CONFIG_ID },
  })

  if (!config) {
    const created = await prisma.scoutRuntimeConfig.create({
      data: {
        id: DEFAULT_RUNTIME_CONFIG_ID,
        provider: env.SCOUT_AI_PROVIDER_DEFAULT,
        model: env.SCOUT_AI_MODEL,
      },
    })

    return toAiRuntimeConfig(created)
  }

  return toAiRuntimeConfig(config)
}

export async function updateAiRuntimeConfig(input: {
  provider: AiRuntimeConfig["provider"]
  model: string
}): Promise<AiRuntimeConfig> {
  const config = await prisma.scoutRuntimeConfig.upsert({
    where: { id: DEFAULT_RUNTIME_CONFIG_ID },
    create: {
      id: DEFAULT_RUNTIME_CONFIG_ID,
      provider: input.provider,
      model: input.model,
    },
    update: {
      provider: input.provider,
      model: input.model,
    },
  })

  return toAiRuntimeConfig(config)
}

export async function createConversationRecord(input: {
  tenantId: string
  source: ConversationRecord["source"]
  locale: string
  aiProviderUsed?: ConversationRecord["aiProviderUsed"]
  aiModelUsed?: string
}): Promise<ConversationRecord> {
  const conversation = await prisma.conversation.create({
    data: {
      tenantId: input.tenantId,
      source: input.source,
      locale: input.locale,
      status: "intake_issue",
      aiProviderUsed: input.aiProviderUsed,
      aiModelUsed: input.aiModelUsed,
      summaryRequested: false,
    },
  })

  return toConversationRecord(conversation)
}

export async function getConversationOrThrow(conversationId: string): Promise<ConversationRecord> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    throw new Error(`Unknown conversation: ${conversationId}`)
  }

  return toConversationRecord(conversation)
}

export async function listConversations(
  filters: ConversationFilters = {},
): Promise<ConversationListItem[]> {
  const conversations = await prisma.conversation.findMany({
    where: {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.leadCreated === true ? { lead: { isNot: null } } : {}),
      ...(filters.leadCreated === false ? { lead: null } : {}),
    },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
      lead: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const records = conversations.map(toConversationListItem)

  if (!filters.search) {
    return records
  }

  const searchTerm = filters.search.trim().toLowerCase()

  return records.filter((conversation) => {
    const haystack = [
      conversation.id,
      conversation.preferredName,
      conversation.city,
      conversation.region,
      conversation.status,
      conversation.source,
      conversation.suspectedPest,
      conversation.leadId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(searchTerm)
  })
}

export async function appendMessage(input: {
  conversationId: string
  role: ConversationMessage["role"]
  content: string
}): Promise<ConversationMessage> {
  const message = await prisma.conversationMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    },
  })

  return toConversationMessage(message)
}

export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const messages = await prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  return messages.map(toConversationMessage)
}

export async function updateConversation(
  conversationId: string,
  patch: Partial<
    Pick<
      ConversationRecord,
      | "status"
      | "aiProviderUsed"
      | "aiModelUsed"
      | "preferredName"
      | "city"
      | "region"
      | "summaryRequested"
      | "summaryEmail"
      | "summaryPhone"
      | "preferredContactMethod"
      | "availabilityNotes"
      | "severity"
      | "suspectedPest"
      | "urgencyScore"
      | "leadOffered"
    >
  >,
): Promise<ConversationRecord> {
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: patch.status,
      aiProviderUsed: patch.aiProviderUsed,
      aiModelUsed: patch.aiModelUsed,
      preferredName: patch.preferredName,
      city: patch.city,
      region: patch.region,
      summaryRequested: patch.summaryRequested,
      summaryEmail: patch.summaryEmail,
      summaryPhone: patch.summaryPhone,
      preferredContactMethod: patch.preferredContactMethod,
      availabilityNotes: patch.availabilityNotes,
      severity: patch.severity,
      suspectedPest: patch.suspectedPest,
      urgencyScore: patch.urgencyScore,
      leadOffered: patch.leadOffered,
    },
  })

  return toConversationRecord(conversation)
}

export async function createLeadRecord(
  input: Omit<LeadRecord, "id" | "displayId" | "createdAt" | "status">,
): Promise<LeadRecord> {
  const lead = await prisma.lead.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      preferredContactMethod: input.preferredContactMethod,
      availabilityNotes: input.availabilityNotes,
      city: input.city,
      region: input.region,
      suspectedPest: input.suspectedPest,
      severity: input.severity,
      urgencyScore: input.urgencyScore,
      summary: input.summary,
    },
  })

  return toLeadRecord(lead)
}

export async function listLeads(filters: LeadFilters = {}): Promise<LeadRecord[]> {
  const leads = await prisma.lead.findMany({
    where: {
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  const leadRecords = leads.map(toLeadRecord)

  if (!filters.search) {
    return leadRecords
  }

  const searchTerm = filters.search.trim().toLowerCase()

  return leadRecords.filter((lead) => {
    const haystack = [
      lead.displayId,
      lead.name,
      lead.email,
      lead.phone,
      lead.city,
      lead.region,
      lead.suspectedPest,
      lead.summary,
      lead.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(searchTerm)
  })
}

export async function getLeadDetailOrThrow(leadId: string): Promise<LeadDetail> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      conversation: true,
    },
  })

  if (!lead) {
    throw new Error(`Unknown lead: ${leadId}`)
  }

  const messages = await getConversationMessages(lead.conversationId)

  return {
    ...toLeadRecord(lead),
    conversation: toConversationRecord(lead.conversation),
    messages,
  }
}

export async function getConversationDetailOrThrow(
  conversationId: string,
): Promise<ConversationDetail> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: true,
    },
  })

  if (!conversation) {
    throw new Error(`Unknown conversation: ${conversationId}`)
  }

  const messages = await getConversationMessages(conversationId)

  return {
    conversation: toConversationRecord(conversation),
    messages,
    lead: conversation.lead ? toLeadRecord(conversation.lead) : undefined,
  }
}

export async function updateLeadRecord(
  leadId: string,
  patch: Partial<Pick<LeadRecord, "status">>,
): Promise<LeadRecord> {
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: patch.status,
    },
  })

  return toLeadRecord(lead)
}

function toMetric(label: string, value: string, detail: string): DashboardMetric {
  return {
    key: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    value,
    detail,
  }
}

function toLeadQueueItem(lead: LeadRecord): LeadQueueItem {
  return {
    id: lead.id,
    pest: lead.suspectedPest ?? "Unconfirmed",
    severity: lead.severity,
    location: [lead.city, lead.region].filter(Boolean).join(", "),
    status: lead.status,
    summary: lead.summary,
  }
}

export async function buildAnalyticsOverview(tenantId?: string): Promise<AnalyticsOverview> {
  const [scopedLeads, scopedConversations, conversationCount] = await Promise.all([
    listLeads({ tenantId }),
    listConversations({ tenantId }),
    prisma.conversation.count({
      where: tenantId ? { tenantId } : undefined,
    }),
  ])

  const highSeverityCount = scopedLeads.filter(
    (lead) => lead.severity === "high" || lead.severity === "urgent",
  ).length

  const avgUrgency = scopedLeads.length
    ? Math.round(scopedLeads.reduce((sum, lead) => sum + lead.urgencyScore, 0) / scopedLeads.length)
    : 0

  return {
    tenantId,
    metrics: [
      toMetric("Conversations", `${conversationCount}`, "Tracked intake sessions"),
      toMetric(
        "Lead Conversion",
        conversationCount ? `${Math.round((scopedLeads.length / conversationCount) * 100)}%` : "0%",
        `${scopedLeads.length} captured leads`,
      ),
      toMetric("High Severity Leads", `${highSeverityCount}`, "High and urgent lead mix"),
      toMetric("Avg. Urgency Score", `${avgUrgency}`, "Signals lead pricing readiness"),
    ],
    recentLeads: scopedLeads.slice(0, 5).map(toLeadQueueItem),
    recentConversations: scopedConversations.filter((conversation) => !conversation.leadCreated).slice(0, 5),
    severityMix: (["low", "medium", "high", "urgent"] as const).map((severity) => ({
      severity,
      count: scopedLeads.filter((lead) => lead.severity === severity).length,
    })),
    funnel: funnelStages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      count: scopedConversations.filter((conversation) =>
        (stage.statuses as readonly string[]).includes(conversation.status),
      ).length,
    })),
  }
}

export async function buildConversationAnalytics(
  tenantId?: string,
): Promise<ConversationAnalytics> {
  const conversations = await listConversations({ tenantId })
  const incomplete = conversations.filter((conversation) => !conversation.leadCreated)

  const stateDistribution = conversationStatuses.map((status) => ({
    status,
    count: conversations.filter((conversation) => conversation.status === status).length,
  }))

  const dropOffByState = conversationStatuses
    .map((status) => {
      const matching = incomplete.filter((conversation) => conversation.status === status)
      const avgUrgency = matching.length
        ? Math.round(matching.reduce((sum, conversation) => sum + conversation.urgencyScore, 0) / matching.length)
        : 0

      return {
        status,
        count: matching.length,
        avgUrgency,
        highSeverityCount: matching.filter(
          (conversation) => conversation.severity === "high" || conversation.severity === "urgent",
        ).length,
      }
    })
    .filter((entry) => entry.count > 0)

  const highIntentIncomplete = incomplete
    .filter((conversation) => {
      const highSeverity =
        conversation.severity === "high" || conversation.severity === "urgent"
      const advancedState = ["assessment", "recommendation", "summary_offer", "contact_capture", "handoff_offer", "scheduling_capture", "lead_capture"].includes(
        conversation.status,
      )

      return highSeverity || advancedState
    })
    .slice(0, 10)

  const topPests = Object.entries(
    conversations.reduce<Record<string, number>>((accumulator, conversation) => {
      const pest = conversation.suspectedPest ?? "Unconfirmed"
      accumulator[pest] = (accumulator[pest] ?? 0) + 1
      return accumulator
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([pest, count]) => ({ pest, count }))

  const modelPerformance = Object.values(
    conversations.reduce<Record<string, ConversationAnalytics["modelPerformance"][number]>>(
      (accumulator, conversation) => {
        const provider = conversation.aiProviderUsed ?? "groq"
        const model = conversation.aiModelUsed ?? "unknown"
        const key = `${provider}:${model}`
        const existing = accumulator[key] ?? {
          provider,
          model,
          conversations: 0,
          completedLeads: 0,
          conversionRate: 0,
          avgUrgency: 0,
          highSeverityCount: 0,
        }

        existing.conversations += 1
        existing.avgUrgency += conversation.urgencyScore

        if (conversation.leadCreated) {
          existing.completedLeads += 1
        }

        if (conversation.severity === "high" || conversation.severity === "urgent") {
          existing.highSeverityCount += 1
        }

        accumulator[key] = existing
        return accumulator
      },
      {},
    ),
  )
    .map((entry) => ({
      ...entry,
      avgUrgency: entry.conversations ? Math.round(entry.avgUrgency / entry.conversations) : 0,
      conversionRate: entry.conversations
        ? Math.round((entry.completedLeads / entry.conversations) * 100)
        : 0,
    }))
    .sort((a, b) => b.conversations - a.conversations)

  return {
    tenantId,
    funnel: funnelStages.map((stage) => ({
      key: stage.key,
      label: stage.label,
      count: conversations.filter((conversation) =>
        (stage.statuses as readonly string[]).includes(conversation.status),
      ).length,
    })),
    stateDistribution,
    dropOffByState,
    highIntentIncomplete,
    topPests,
    modelPerformance,
  }
}
