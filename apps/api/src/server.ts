import Fastify from "fastify"
import cors from "@fastify/cors"
import {
  conversationParamsSchema,
  conversationQuerySchema,
  createConversationSchema,
  createLeadSchema,
  createMessageSchema,
  leadParamsSchema,
  leadQuerySchema,
  tenantParamsSchema,
  tenantQuerySchema,
  updateLeadSchema,
  updateAiRuntimeSchema,
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

app.post("/v1/chat/messages", async (request) => {
  const payload = createMessageSchema.parse(request.body)
  const conversation = await getConversationOrThrow(payload.conversationId)

  if (conversation.tenantId !== payload.tenantId) {
    throw new Error("Conversation tenant mismatch")
  }

  await appendMessage({
    conversationId: payload.conversationId,
    role: "user",
    content: payload.message,
  })

  const conversationMessages = await getConversationMessages(payload.conversationId)
  const tenant = await getTenantOrThrow(payload.tenantId)
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
