import Fastify, { type FastifyRequest } from "fastify"
import cors from "@fastify/cors"
import {
  conversationParamsSchema,
  conversationQuerySchema,
  createConversationSchema,
  createLeadSchema,
  createTenantSchema,
  createMessageSchema,
  leadParamsSchema,
  leadQuerySchema,
  tenantParamsSchema,
  tenantQuerySchema,
  updateLeadSchema,
  updateAiRuntimeSchema,
  updateTenantSchema,
} from "@scout/schemas"
import { handleGuidedIntakeTurn } from "./lib/intake-flow.js"
import { generateScoutTurn } from "./lib/scout-ai.js"
import { deliverSummary } from "./lib/summary-delivery.js"
import {
  appendMessage,
  buildAnalyticsOverview,
  buildConversationAnalytics,
  createConversationRecord,
  createLeadRecord,
  createTenant,
  ensureSeedData,
  getAiRuntimeConfig,
  getConversationDetailOrThrow,
  getConversationMessages,
  getConversationOrThrow,
  getLeadDetailOrThrow,
  getTenantOrThrow,
  listConversations,
  listLeads,
  listTenants,
  updateAiRuntimeConfig,
  updateLeadRecord,
  updateConversation,
  updateTenant,
} from "./lib/store.js"

const app = Fastify({
  logger: true,
})

await app.register(cors, {
  origin: true,
})

function buildSummaryDeliveryFailureMessage(input: {
  professionalHelpRecommended: boolean
}) {
  if (input.professionalHelpRecommended) {
    return "I saved that contact, but I couldn't send the summary just yet. I can still help you request professional follow-up now, and I can keep helping here while we try the summary again."
  }

  return "I saved that contact, but I couldn't send the summary just yet. I can still keep helping here in chat while we try again."
}

function getFirstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function normalizeDomainValue(value: string) {
  const trimmed = value.trim().toLowerCase()

  if (!trimmed || trimmed === "null") {
    return null
  }

  try {
    const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`
    return new URL(candidate).hostname.toLowerCase()
  } catch {
    return trimmed
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
  }
}

function getRequestHostname(request: FastifyRequest) {
  const origin = getFirstHeaderValue(request.headers.origin)
  const referer = getFirstHeaderValue(request.headers.referer)

  for (const candidate of [origin, referer]) {
    if (!candidate) {
      continue
    }

    const normalized = normalizeDomainValue(candidate)

    if (normalized) {
      return normalized
    }
  }

  return undefined
}

function isAllowedDomain(hostname: string, allowedDomains: string[]) {
  const normalizedHostname = normalizeDomainValue(hostname)

  if (!normalizedHostname) {
    return false
  }

  return allowedDomains.some((entry) => {
    const normalizedEntry = normalizeDomainValue(entry)

    if (!normalizedEntry) {
      return false
    }

    if (normalizedEntry.startsWith("*.")) {
      const baseDomain = normalizedEntry.slice(2)
      return (
        normalizedHostname === baseDomain ||
        normalizedHostname.endsWith(`.${baseDomain}`)
      )
    }

    return normalizedHostname === normalizedEntry
  })
}

function getWidgetAccessError(input: {
  request: FastifyRequest
  tenant: {
    brandName: string
    widgetEnabled: boolean
    allowedDomains: string[]
  }
}) {
  if (!input.tenant.widgetEnabled) {
    return `${input.tenant.brandName} has disabled the Scout widget right now.`
  }

  if (!input.tenant.allowedDomains.length) {
    return null
  }

  const hostname = getRequestHostname(input.request)

  if (!hostname) {
    return "This widget request is missing a valid website origin."
  }

  if (!isAllowedDomain(hostname, input.tenant.allowedDomains)) {
    return `This widget is not authorized for ${hostname}.`
  }

  return null
}

app.get("/health", async () => {
  return {
    status: "ok",
    service: "scout-api",
    timestamp: new Date().toISOString(),
  }
})

app.get("/v1/tenants", async () => {
  return listTenants()
})

app.get("/v1/tenants/:tenantId", async (request) => {
  const { tenantId } = tenantParamsSchema.parse(request.params)
  return getTenantOrThrow(tenantId)
})

app.post("/v1/tenants", async (request, reply) => {
  const payload = createTenantSchema.parse(request.body)
  const tenant = await createTenant(payload)
  reply.code(201)
  return tenant
})

app.patch("/v1/tenants/:tenantId", async (request) => {
  const { tenantId } = tenantParamsSchema.parse(request.params)
  const payload = updateTenantSchema.parse(request.body)
  return updateTenant(tenantId, payload)
})

app.get("/v1/settings/ai-runtime", async () => {
  return getAiRuntimeConfig()
})

app.patch("/v1/settings/ai-runtime", async (request) => {
  const payload = updateAiRuntimeSchema.parse(request.body)
  return updateAiRuntimeConfig(payload)
})

app.post("/v1/conversations", async (request, reply) => {
  const payload = createConversationSchema.parse(request.body)
  const tenant = await getTenantOrThrow(payload.tenantId)

  if (payload.source === "widget") {
    const widgetAccessError = getWidgetAccessError({
      request,
      tenant,
    })

    if (widgetAccessError) {
      reply.code(403)
      return {
        error: widgetAccessError,
      }
    }
  }

  const runtimeConfig = await getAiRuntimeConfig()
  const conversation = await createConversationRecord({
    ...payload,
    aiProviderUsed: runtimeConfig.provider,
    aiModelUsed: runtimeConfig.model,
  })

  const greeting = `${tenant.brandName} can help you sort through signs of pests at home. Start by describing what you have noticed.`

  await appendMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: greeting,
  })

  reply.code(201)
  return {
    conversation,
    greeting,
  }
})

app.get("/v1/conversations/:conversationId", async (request) => {
  const { conversationId } = conversationParamsSchema.parse(request.params)

  return getConversationDetailOrThrow(conversationId)
})

app.get("/v1/conversations", async (request) => {
  const filters = conversationQuerySchema.parse(request.query)
  return listConversations(filters)
})

app.post("/v1/chat/messages", async (request, reply) => {
  const payload = createMessageSchema.parse(request.body)
  const conversation = await getConversationOrThrow(payload.conversationId)

  if (conversation.tenantId !== payload.tenantId) {
    throw new Error("Conversation tenant mismatch")
  }

  const tenant = await getTenantOrThrow(payload.tenantId)

  if (conversation.source === "widget") {
    const widgetAccessError = getWidgetAccessError({
      request,
      tenant,
    })

    if (widgetAccessError) {
      reply.code(403)
      return {
        error: widgetAccessError,
      }
    }
  }

  await appendMessage({
    conversationId: payload.conversationId,
    role: "user",
    content: payload.message,
  })
  const conversationMessages = await getConversationMessages(payload.conversationId)
  const runtimeConfig =
    conversation.aiProviderUsed && conversation.aiModelUsed
      ? {
          provider: conversation.aiProviderUsed,
          model: conversation.aiModelUsed,
          updatedAt: conversation.updatedAt,
        }
      : await getAiRuntimeConfig()
  const guidedTurn = await handleGuidedIntakeTurn({
    conversation,
    tenant,
    runtimeConfig,
    message: payload.message,
    messages: conversationMessages,
  })

  if (guidedTurn) {
    const mergedConversationForSummary = guidedTurn.patch
      ? {
          ...conversation,
          ...guidedTurn.patch,
        }
      : conversation

    let assistantMessage = guidedTurn.assistantMessage

    if (guidedTurn.triggerSummaryDelivery) {
      try {
        await deliverSummary({
          conversation: mergedConversationForSummary,
          assessment: guidedTurn.assessment,
          messages: conversationMessages,
          assistantMessage:
            guidedTurn.summarySourceAssistantMessage ??
            [...conversationMessages]
              .reverse()
              .find((message) => message.role === "assistant")?.content ??
            guidedTurn.assistantMessage,
        })
      } catch (error) {
        app.log.error(error, "Scout could not deliver the summary follow-up.")
        assistantMessage = buildSummaryDeliveryFailureMessage({
          professionalHelpRecommended:
            guidedTurn.assessment.professionalHelpRecommended,
        })
      }
    }

    await appendMessage({
      conversationId: payload.conversationId,
      role: "assistant",
      content: assistantMessage,
    })

    const updatedConversation = await updateConversation(payload.conversationId, {
      ...guidedTurn.patch,
      aiProviderUsed: conversation.aiProviderUsed ?? runtimeConfig.provider,
      aiModelUsed: conversation.aiModelUsed ?? runtimeConfig.model,
      severity: guidedTurn.assessment.severity,
      suspectedPest: guidedTurn.assessment.suspectedPest,
      urgencyScore: guidedTurn.assessment.urgencyScore,
      leadOffered: guidedTurn.assessment.professionalHelpRecommended,
    })

    return {
      conversation: updatedConversation,
      assistantMessage,
      assessment: guidedTurn.assessment,
      mode: "guided" as const,
    }
  }

  const turn = await generateScoutTurn({
    conversation,
    tenant,
    messages: conversationMessages,
    runtimeConfig,
  })

  await appendMessage({
    conversationId: payload.conversationId,
    role: "assistant",
    content: turn.assistantMessage,
  })

  const updatedConversation = await updateConversation(payload.conversationId, {
    status: turn.status,
    aiProviderUsed: conversation.aiProviderUsed ?? runtimeConfig.provider,
    aiModelUsed: conversation.aiModelUsed ?? runtimeConfig.model,
    severity: turn.assessment.severity,
    suspectedPest: turn.assessment.suspectedPest,
    urgencyScore: turn.assessment.urgencyScore,
    leadOffered: turn.assessment.professionalHelpRecommended,
  })

  return {
    conversation: updatedConversation,
    assistantMessage: turn.assistantMessage,
    assessment: turn.assessment,
    mode: turn.mode,
  }
})

app.get("/v1/leads", async (request) => {
  const filters = leadQuerySchema.parse(request.query)
  return listLeads(filters)
})

app.get("/v1/leads/:leadId", async (request) => {
  const { leadId } = leadParamsSchema.parse(request.params)
  return getLeadDetailOrThrow(leadId)
})

app.patch("/v1/leads/:leadId", async (request) => {
  const { leadId } = leadParamsSchema.parse(request.params)
  const payload = updateLeadSchema.parse(request.body)
  return updateLeadRecord(leadId, payload)
})

app.post("/v1/leads", async (request, reply) => {
  const payload = createLeadSchema.parse(request.body)
  const conversation = await getConversationOrThrow(payload.conversationId)

  if (conversation.tenantId !== payload.tenantId) {
    throw new Error("Lead tenant mismatch")
  }

  const tenant = await getTenantOrThrow(payload.tenantId)

  if (conversation.source === "widget") {
    const widgetAccessError = getWidgetAccessError({
      request,
      tenant,
    })

    if (widgetAccessError) {
      reply.code(403)
      return {
        error: widgetAccessError,
      }
    }
  }

  const lead = await createLeadRecord(payload)

  await updateConversation(payload.conversationId, {
    status: "complete",
  })

  reply.code(201)
  return lead
})

app.get("/v1/analytics/overview", async (request) => {
  const { tenantId } = tenantQuerySchema.parse(request.query)
  return buildAnalyticsOverview(tenantId)
})

app.get("/v1/analytics/conversations", async (request) => {
  const { tenantId } = tenantQuerySchema.parse(request.query)
  return buildConversationAnalytics(tenantId)
})

const port = Number(process.env.PORT ?? 3001)

async function start() {
  await ensureSeedData()
  await app.listen({ host: "0.0.0.0", port })
}

start().catch((error) => {
  app.log.error(error)
  process.exit(1)
})
