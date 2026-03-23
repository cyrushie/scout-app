import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { z } from "zod"
import type {
  AiRuntimeConfig,
  ContactMethod,
  ConversationMessage,
  ConversationRecord,
  ConversationStatus,
  RecommendedAction,
  SeverityAssessment,
  TenantConfig,
} from "@scout/types"
import { env } from "./env.js"
import {
  assessConversation,
  buildAssistantReply,
  inferConversationStatusFromAssessment,
} from "./scout-engine.js"

const groq = createOpenAICompatible({
  name: "groq",
  apiKey: env.GROQ_API_KEY ?? "missing-groq-key",
  baseURL: env.GROQ_BASE_URL,
})

const zai = createOpenAICompatible({
  name: "zai",
  apiKey: env.ZAI_API_KEY ?? "missing-zai-key",
  baseURL: env.ZAI_BASE_URL,
})

const openrouter = createOpenAICompatible({
  name: "openrouter",
  apiKey: env.OPENROUTER_API_KEY ?? "missing-openrouter-key",
  baseURL: env.OPENROUTER_BASE_URL,
})

const aiAssessmentSchema = z.object({
  assistantMessage: z.string().min(1),
  conversationStatus: z.enum([
    "clarification",
    "assessment",
    "recommendation",
    "handoff_offer",
  ]),
  severity: z.enum(["low", "medium", "high", "urgent"]),
  urgencyScore: z.number().min(0).max(100),
  suspectedPest: z.string().nullable(),
  reasoning: z.array(z.string()).min(1),
  informationGaps: z.array(z.string()).max(3),
  recommendedAction: z.enum([
    "monitor",
    "home_action",
    "collect_more_context",
    "professional_help",
    "urgent_professional_help",
  ]),
  professionalHelpRecommended: z.boolean(),
})

const aiDraftSchema = z.object({
  assistantMessage: z.string().min(1).optional(),
  conversationStatus: z
    .enum(["clarification", "assessment", "recommendation", "handoff_offer"])
    .optional(),
  severity: z.enum(["low", "medium", "high", "urgent"]).optional(),
  urgencyScore: z.number().min(0).max(100).optional(),
  urgency: z.number().min(0).max(100).optional(),
  suspectedPest: z.string().nullable().optional(),
  reasoning: z.union([z.array(z.string()), z.string()]).optional(),
  informationGaps: z.array(z.string()).optional(),
  recommendedAction: z
    .enum([
      "monitor",
      "home_action",
      "collect_more_context",
      "professional_help",
      "urgent_professional_help",
    ])
    .optional(),
  professionalHelpRecommended: z.boolean().optional(),
  handoffOffer: z.boolean().optional(),
})

const turnExtractionSchema = z.object({
  issueSignal: z.boolean().optional(),
  issueDescription: z.string().min(1).max(240).optional(),
  city: z.string().min(1).max(80).optional(),
  region: z.string().min(1).max(80).optional(),
  preferredName: z.string().min(1).max(40).optional(),
  skipName: z.boolean().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(40).optional(),
  preferredContactMethod: z.enum(["email", "phone"]).optional(),
  availabilityNotes: z.string().min(1).max(160).optional(),
  wantsSummary: z.boolean().optional(),
  declinesSummary: z.boolean().optional(),
  wantsProfessionalHelp: z.boolean().optional(),
  declinesProfessionalHelp: z.boolean().optional(),
  hasSideQuestion: z.boolean().optional(),
  sideQuestion: z.string().min(1).max(180).optional(),
})

export interface TurnExtractionResult {
  issueSignal?: boolean
  issueDescription?: string
  city?: string
  region?: string
  preferredName?: string
  skipName?: boolean
  email?: string
  phone?: string
  preferredContactMethod?: ContactMethod
  availabilityNotes?: string
  wantsSummary?: boolean
  declinesSummary?: boolean
  wantsProfessionalHelp?: boolean
  declinesProfessionalHelp?: boolean
  hasSideQuestion?: boolean
  sideQuestion?: string
  mode: "ai" | "fallback"
}

interface MainTurnObjective {
  objective: string
  missingFields: string[]
  responseStyle: string
}

function buildTranscript(messages: ConversationMessage[]) {
  return messages
    .slice(-10)
    .map((message, index) => {
      const turnNumber = index + 1
      return `[${turnNumber}] ${message.role.toUpperCase()}: ${message.content}`
    })
    .join("\n")
}

function getLastUserMessage(messages: ConversationMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? ""
}

function getUserMessageCount(messages: ConversationMessage[]) {
  return messages.filter((message) => message.role === "user").length
}

function buildGuidancePrompt(input: {
  tenant: TenantConfig
  conversation: ConversationRecord
  messages: ConversationMessage[]
  baseline: SeverityAssessment
  objective: MainTurnObjective
  extraction: TurnExtractionResult
}) {
  const userMessageCount = getUserMessageCount(input.messages)
  const lastUserMessage = getLastUserMessage(input.messages)
  const baselinePest = input.baseline.suspectedPest ?? "unknown"
  const baselineReasoning = input.baseline.reasoning.join(" | ")

  return [
    `Tenant brand: ${input.tenant.brandName}.`,
    `Service areas: ${input.tenant.serviceAreas.join(", ")}.`,
    `User message count: ${userMessageCount}.`,
    `Latest user message: ${lastUserMessage || "n/a"}.`,
    `Rule-based baseline pest signal: ${baselinePest}.`,
    `Rule-based baseline severity: ${input.baseline.severity}.`,
    `Rule-based urgency score: ${input.baseline.urgencyScore}.`,
    `Rule-based reasoning: ${baselineReasoning}.`,
    `Current conversation stage: ${input.conversation.status}.`,
    `Turn objective: ${input.objective.objective}.`,
    `Response style: ${input.objective.responseStyle}.`,
    `Missing fields: ${input.objective.missingFields.length ? input.objective.missingFields.join(", ") : "none"}.`,
    `Known preferred name: ${input.conversation.preferredName ?? "unknown"}.`,
    `Known city: ${input.conversation.city ?? "unknown"}.`,
    `Known region: ${input.conversation.region ?? "unknown"}.`,
    `Known summary email: ${input.conversation.summaryEmail ?? "unknown"}.`,
    `Known summary phone: ${input.conversation.summaryPhone ?? "unknown"}.`,
    `Known contact preference: ${input.conversation.preferredContactMethod ?? "unknown"}.`,
    `Known availability: ${input.conversation.availabilityNotes ?? "unknown"}.`,
    `Latest turn side question present: ${input.extraction.hasSideQuestion ? "yes" : "no"}.`,
    `Latest turn side question: ${input.extraction.sideQuestion ?? "none"}.`,
    `Latest turn wants summary: ${input.extraction.wantsSummary ? "yes" : "no"}.`,
    `Latest turn wants professional help: ${input.extraction.wantsProfessionalHelp ? "yes" : "no"}.`,
    "",
    "Conversation transcript:",
    buildTranscript(input.messages),
    "",
    "Assistant goals:",
    "1. Calmly help the homeowner understand what the signs could mean.",
    "2. Ask for only the most important missing detail when context is still thin.",
    "3. Once enough signal exists, explain the likely issue, level of concern, and best next step.",
    "4. Only offer professional help when the issue sounds active, recurring, damaging, health-related, or urgent.",
    "",
    "Message rules:",
    "- Keep the assistant message under 110 words.",
    "- If more detail is needed, ask no more than 2 focused questions.",
    "- Treat conversation stages as internal objectives, not a script the user must follow.",
    "- If the user gives information out of order, use it and do not ask for it again.",
    "- If the user says hello or changes the subject briefly, respond naturally and gently steer back.",
    "- Avoid sounding salesy, dramatic, or overly certain.",
    "- Do not mention internal scoring, pricing, tenants, or lead resale.",
    "- If recommending professional help, explain why in plain language and invite the user to continue if they want help.",
    "",
    "Return one JSON object only with exactly these keys:",
    "{",
    '  "assistantMessage": string,',
    '  "conversationStatus": "clarification" | "assessment" | "recommendation" | "handoff_offer",',
    '  "severity": "low" | "medium" | "high" | "urgent",',
    '  "urgencyScore": number,',
    '  "suspectedPest": string | null,',
    '  "reasoning": string[],',
    '  "informationGaps": string[],',
    '  "recommendedAction": "monitor" | "home_action" | "collect_more_context" | "professional_help" | "urgent_professional_help",',
    '  "professionalHelpRecommended": boolean',
    "}",
  ].join("\n")
}

function buildExtractionPrompt(input: {
  conversation: ConversationRecord
  messages: ConversationMessage[]
}) {
  const latestUserMessage = getLastUserMessage(input.messages) || "n/a"

  return [
    `Current conversation state: ${input.conversation.status}.`,
    `Known preferred name: ${input.conversation.preferredName ?? "unknown"}.`,
    `Known city: ${input.conversation.city ?? "unknown"}.`,
    `Known region: ${input.conversation.region ?? "unknown"}.`,
    `Known summary email: ${input.conversation.summaryEmail ?? "unknown"}.`,
    `Known summary phone: ${input.conversation.summaryPhone ?? "unknown"}.`,
    `Known contact preference: ${input.conversation.preferredContactMethod ?? "unknown"}.`,
    `Known availability: ${input.conversation.availabilityNotes ?? "unknown"}.`,
    "",
    "Conversation transcript:",
    buildTranscript(input.messages),
    "",
    `Latest user message: ${latestUserMessage}`,
    "",
    "Extract only what the user clearly or strongly implied in the latest message.",
    "Be conservative. Do not invent missing details.",
    "If a field is not present, omit it.",
    "Return one JSON object only with these optional keys:",
    "{",
    '  "issueSignal": boolean,',
    '  "issueDescription": string,',
    '  "city": string,',
    '  "region": string,',
    '  "preferredName": string,',
    '  "skipName": boolean,',
    '  "email": string,',
    '  "phone": string,',
    '  "preferredContactMethod": "email" | "phone",',
    '  "availabilityNotes": string,',
    '  "wantsSummary": boolean,',
    '  "declinesSummary": boolean,',
    '  "wantsProfessionalHelp": boolean,',
    '  "declinesProfessionalHelp": boolean,',
    '  "hasSideQuestion": boolean,',
    '  "sideQuestion": string',
    "}",
  ].join("\n")
}

function extractJsonObject(text: string) {
  const trimmed = text.trim()

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed
  }

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Scout AI did not return a JSON object.")
  }

  return trimmed.slice(start, end + 1)
}

function normalizeAiDraft(input: {
  rawText: string
  baseline: SeverityAssessment
  userMessageCount: number
}) {
  const parsed = JSON.parse(extractJsonObject(input.rawText))
  const draft = aiDraftSchema.parse(parsed)

  const reasoning = Array.isArray(draft.reasoning)
    ? draft.reasoning
    : typeof draft.reasoning === "string"
      ? [draft.reasoning]
      : input.baseline.reasoning

  const assessment: SeverityAssessment = aiAssessmentSchema.pick({
    severity: true,
    urgencyScore: true,
    suspectedPest: true,
    reasoning: true,
    recommendedAction: true,
    professionalHelpRecommended: true,
  }).parse({
    severity: draft.severity ?? input.baseline.severity,
    urgencyScore: draft.urgencyScore ?? draft.urgency ?? input.baseline.urgencyScore,
    suspectedPest:
      draft.suspectedPest !== undefined
        ? draft.suspectedPest
        : input.baseline.suspectedPest,
    reasoning,
    recommendedAction:
      draft.recommendedAction ?? input.baseline.recommendedAction,
    professionalHelpRecommended:
      draft.professionalHelpRecommended ??
      draft.handoffOffer ??
      input.baseline.professionalHelpRecommended,
  })

  const fallbackStatus = inferConversationStatusFromAssessment(
    assessment,
    input.userMessageCount > 0
      ? [
          {
            id: "synthetic-user-turn",
            conversationId: "synthetic-conversation",
            role: "user" as const,
            content: "synthetic",
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
  )

  return {
    assistantMessage:
      draft.assistantMessage ?? buildAssistantReply(assessment, []),
    assessment,
    conversationStatus: draft.conversationStatus ?? fallbackStatus,
  }
}

function normalizeStatus(input: {
  status: ConversationStatus
  assessment: SeverityAssessment
  userMessageCount: number
}) {
  if (input.assessment.professionalHelpRecommended) {
    return "handoff_offer"
  }

  if (input.assessment.recommendedAction === "collect_more_context") {
    return input.userMessageCount > 1 ? "assessment" : "clarification"
  }

  if (input.status === "clarification" && input.userMessageCount > 1) {
    return "assessment"
  }

  return input.status
}

function shouldOfferSummary(input: {
  conversation: ConversationRecord
  status: ConversationStatus
  assessment: SeverityAssessment
}) {
  if (input.conversation.summaryRequested) {
    return false
  }

  if (
    input.conversation.status === "summary_offer" ||
    input.conversation.status === "contact_capture"
  ) {
    return false
  }

  if (input.assessment.recommendedAction === "collect_more_context") {
    return false
  }

  return (
    input.status === "assessment" ||
    input.status === "recommendation" ||
    input.status === "handoff_offer"
  )
}

function inferClarificationMissingFields(input: {
  conversation: ConversationRecord
  baseline: SeverityAssessment
}) {
  const missing: string[] = []

  if (!input.conversation.city && !input.conversation.region) {
    missing.push("city or area")
  }

  switch (input.baseline.suspectedPest) {
    case "Bed Bugs":
      missing.push("whether the bites happen overnight")
      missing.push("whether there are signs on bedding or the mattress")
      break
    case "Rodents":
      missing.push("where in the home the signs appear")
      missing.push("whether the signs are recurring")
      break
    case "Cockroaches":
      missing.push("where they are being seen most often")
      missing.push("whether there are droppings, egg cases, or odor")
      break
    case "Termites":
      missing.push("where the damage appears")
      missing.push("whether there are mud tubes or swarmers")
      break
    default:
      missing.push("where in the home this is happening")
      missing.push("how often it is happening")
      break
  }

  return missing.slice(0, 3)
}

function resolveMainTurnObjective(input: {
  conversation: ConversationRecord
  baseline: SeverityAssessment
  extraction: TurnExtractionResult
}) {
  if (input.extraction.wantsProfessionalHelp || input.conversation.status === "handoff_offer") {
    return {
      objective:
        "Briefly acknowledge the user's latest message and explain that professional follow-up is a reasonable next step without sounding pushy.",
      missingFields: ["whether they want professional help"],
      responseStyle: "brief_handoff_offer",
    } satisfies MainTurnObjective
  }

  if (input.baseline.professionalHelpRecommended) {
    return {
      objective:
        "Explain why the issue sounds active or high concern, answer any short side question, and invite the user to continue if they want professional help.",
      missingFields: [],
      responseStyle: "high_concern_with_handoff",
    } satisfies MainTurnObjective
  }

  if (input.baseline.recommendedAction === "collect_more_context" || input.conversation.status === "clarification") {
    return {
      objective:
        "Answer the user's latest message naturally, then ask for the single most useful missing detail needed to improve confidence.",
      missingFields: inferClarificationMissingFields(input),
      responseStyle: "clarify_with_light_guidance",
    } satisfies MainTurnObjective
  }

  if (input.conversation.status === "assessment") {
    return {
      objective:
        "Give a clearer likely-pest assessment, explain the current concern level in plain language, and offer the next best step.",
      missingFields: [],
      responseStyle: "assessment_explainer",
    } satisfies MainTurnObjective
  }

  return {
    objective:
      "Answer the user's latest message helpfully, keep the reply practical, and recommend the next best action without sounding repetitive.",
    missingFields: [],
    responseStyle: "recommendation_followup",
  } satisfies MainTurnObjective
}

function buildSummaryOfferCallToAction(assessment: SeverityAssessment) {
  const pest = assessment.suspectedPest?.toLowerCase()

  if (assessment.professionalHelpRecommended) {
    if (pest) {
      return `If it'd help, I can send you a short summary of Scout's ${pest} assessment, the next steps, and some temporary guidance by email or text.`
    }

    return "If it'd help, I can send you a short summary of Scout's assessment, the next steps, and some temporary guidance by email or text."
  }

  if (assessment.severity === "medium") {
    if (pest) {
      return `If you want, I can send you a short recap of what Scout is seeing with the possible ${pest} issue and the best next steps by email or text.`
    }

    return "If you want, I can send you a short recap of Scout's assessment and the best next steps by email or text."
  }

  if (pest) {
    return `If you'd like, I can send you a short summary of Scout's ${pest} take and the next steps by email or text.`
  }

  return "If you'd like, I can send you a short summary of Scout's recommendations by email or text."
}

function withSummaryOffer(input: AssistantTurnResult): AssistantTurnResult {
  return {
    ...input,
    status: "summary_offer",
    assistantMessage: `${input.assistantMessage} ${buildSummaryOfferCallToAction(input.assessment)} Just say yes if you want that.`,
  }
}

export interface AssistantTurnResult {
  assistantMessage: string
  assessment: SeverityAssessment
  status: ConversationStatus
  mode: "ai" | "fallback"
}

export interface GuidedReplyResult {
  assistantMessage: string
  mode: "ai" | "fallback"
}

function resolveActiveModel(runtimeConfig: AiRuntimeConfig) {
  switch (runtimeConfig.provider) {
    case "gemini":
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return null
      }

      return google(runtimeConfig.model)
    case "zai":
      if (!env.ZAI_API_KEY) {
        return null
      }

      return zai(runtimeConfig.model)
    case "openrouter":
      if (!env.OPENROUTER_API_KEY) {
        return null
      }

      return openrouter(runtimeConfig.model)
    case "groq":
    default:
      if (!env.GROQ_API_KEY) {
        return null
      }

      return groq(runtimeConfig.model)
  }
}

function buildGuidedObjectivePrompt(input: {
  tenant: TenantConfig
  conversation: ConversationRecord
  messages: ConversationMessage[]
  assessment: SeverityAssessment
  objective: string
  missingFields: string[]
  nextState: ConversationStatus
}) {
  const latestUserMessage = getLastUserMessage(input.messages) || "n/a"

  return [
    `Tenant brand: ${input.tenant.brandName}.`,
    `Current conversation state: ${input.conversation.status}.`,
    `Next state after this reply: ${input.nextState}.`,
    `Turn objective: ${input.objective}.`,
    `Missing fields: ${input.missingFields.length ? input.missingFields.join(", ") : "none"}.`,
    `Known preferred name: ${input.conversation.preferredName ?? "unknown"}.`,
    `Known city: ${input.conversation.city ?? "unknown"}.`,
    `Known region: ${input.conversation.region ?? "unknown"}.`,
    `Known summary email: ${input.conversation.summaryEmail ?? "unknown"}.`,
    `Known summary phone: ${input.conversation.summaryPhone ?? "unknown"}.`,
    `Known contact preference: ${input.conversation.preferredContactMethod ?? "unknown"}.`,
    `Known availability: ${input.conversation.availabilityNotes ?? "unknown"}.`,
    `Assessment severity: ${input.assessment.severity}.`,
    `Assessment urgency: ${input.assessment.urgencyScore}.`,
    `Assessment suspected pest: ${input.assessment.suspectedPest ?? "unknown"}.`,
    `Assessment action: ${input.assessment.recommendedAction}.`,
    "",
    "Conversation transcript:",
    buildTranscript(input.messages),
    "",
    `Latest user message: ${latestUserMessage}`,
    "",
    "Write one short assistant reply only.",
    "Rules:",
    "- Sound like a calm, capable pest guidance assistant.",
    "- Acknowledge the user's latest message naturally.",
    "- If they asked a short side question, answer it briefly before steering back.",
    "- Do not sound like a form or repeat the same canned opener.",
    "- Ask at most one or two things.",
    "- Keep the reply under 75 words.",
    "- Do not mention internal states, scores, lead generation, tenants, or pricing.",
    "- Move the conversation toward the objective without sounding pushy.",
  ].join("\n")
}

function buildFallbackResult(messages: ConversationMessage[]): AssistantTurnResult {
  const assessment = assessConversation(messages)
  const fallbackStatus = assessment.professionalHelpRecommended
    ? "handoff_offer"
    : inferConversationStatusFromAssessment(assessment, messages)

  return {
    assistantMessage: buildAssistantReply(assessment, messages),
    assessment,
    status: fallbackStatus,
    mode: "fallback",
  }
}

export async function generateGuidedObjectiveReply(input: {
  conversation: ConversationRecord
  tenant: TenantConfig
  messages: ConversationMessage[]
  runtimeConfig: AiRuntimeConfig
  assessment: SeverityAssessment
  objective: string
  nextState: ConversationStatus
  missingFields: string[]
  fallbackAssistantMessage: string
}): Promise<GuidedReplyResult> {
  const activeModel = resolveActiveModel(input.runtimeConfig)

  if (!activeModel) {
    if (env.SCOUT_DISABLE_AI_FALLBACK) {
      throw new Error(
        `Scout AI fallback is disabled and provider '${input.runtimeConfig.provider}' with model '${input.runtimeConfig.model}' is not available.`,
      )
    }

    return {
      assistantMessage: input.fallbackAssistantMessage,
      mode: "fallback",
    }
  }

  try {
    const result = await generateText({
      model: activeModel,
      system: [
        "You are Scout, an AI pest guidance assistant for homeowners.",
        "Your job is to write one conversational reply for the current turn.",
        "Conversation stages are internal objectives only, not a rigid script.",
        "Use any information the user already provided, even if it arrived out of order.",
        "Sound calm, practical, and natural.",
        "Do not sound like a form or checklist.",
        "Do not mention internal scoring, lead resale, or business operations.",
        "Keep the reply brief and helpful.",
      ].join(" "),
      prompt: buildGuidedObjectivePrompt(input),
    })

    const assistantMessage = result.text.trim()

    if (!assistantMessage) {
      throw new Error("Scout guided reply was empty.")
    }

    return {
      assistantMessage,
      mode: "ai",
    }
  } catch (error) {
    if (env.SCOUT_DISABLE_AI_FALLBACK) {
      throw error
    }

    console.error("Scout guided AI failed, falling back to canned guidance.", error)

    return {
      assistantMessage: input.fallbackAssistantMessage,
      mode: "fallback",
    }
  }
}

export async function extractTurnSignalsWithAi(input: {
  conversation: ConversationRecord
  messages: ConversationMessage[]
  runtimeConfig: AiRuntimeConfig
}): Promise<TurnExtractionResult> {
  const activeModel = resolveActiveModel(input.runtimeConfig)

  if (!activeModel) {
    if (env.SCOUT_DISABLE_AI_FALLBACK) {
      throw new Error(
        `Scout AI fallback is disabled and provider '${input.runtimeConfig.provider}' with model '${input.runtimeConfig.model}' is not available.`,
      )
    }

    return { mode: "fallback" }
  }

  try {
    const result = await generateText({
      model: activeModel,
      system: [
        "You extract structured signals from the user's latest chat message.",
        "Be conservative and do not guess.",
        "Only return valid JSON.",
      ].join(" "),
      prompt: buildExtractionPrompt(input),
    })

    const parsed = JSON.parse(extractJsonObject(result.text))
    const extraction = turnExtractionSchema.parse(parsed)

    return {
      ...extraction,
      mode: "ai",
    }
  } catch (error) {
    if (env.SCOUT_DISABLE_AI_FALLBACK) {
      throw error
    }

    console.error("Scout extraction AI failed, falling back to heuristic extraction.", error)

    return { mode: "fallback" }
  }
}

export async function generateScoutTurn(input: {
  conversation: ConversationRecord
  tenant: TenantConfig
  messages: ConversationMessage[]
  runtimeConfig: AiRuntimeConfig
}): Promise<AssistantTurnResult> {
  const activeModel = resolveActiveModel(input.runtimeConfig)

  if (!activeModel) {
    if (env.SCOUT_DISABLE_AI_FALLBACK) {
      throw new Error(
        `Scout AI fallback is disabled and provider '${input.runtimeConfig.provider}' with model '${input.runtimeConfig.model}' is not available.`,
      )
    }

    const fallbackResult = buildFallbackResult(input.messages)

    return shouldOfferSummary({
      conversation: input.conversation,
      status: fallbackResult.status,
      assessment: fallbackResult.assessment,
    })
      ? withSummaryOffer(fallbackResult)
      : fallbackResult
  }

  try {
    const baselineAssessment = assessConversation(input.messages)
    const userMessageCount = getUserMessageCount(input.messages)
    const extraction = await extractTurnSignalsWithAi({
      conversation: input.conversation,
      messages: input.messages,
      runtimeConfig: input.runtimeConfig,
    })
    const objective = resolveMainTurnObjective({
      conversation: input.conversation,
      baseline: baselineAssessment,
      extraction,
    })
    const result = await generateText({
      model: activeModel,
      system: [
        "You are Scout, an AI pest guidance assistant for homeowners.",
        "Your tone is calm, practical, and non-alarmist.",
        "Help users understand signs of pests, assess severity, and choose a next step.",
        "Guide the conversation in stages: clarify, assess, recommend, then offer professional help only when justified.",
        "When confidence is limited, ask one or two focused follow-up questions instead of pretending certainty.",
        "Do not push professional help too early unless the issue clearly sounds active, damaging, recurring, or urgent.",
        "Keep the assistant message concise, supportive, and useful for a homeowner under stress.",
        "Do not claim certainty when you are unsure.",
        "Do not give risky or overly specific extermination advice.",
        "Professional help should be recommended when the issue appears active, recurring, damaging, or urgent.",
        "If context is still unclear, set recommendedAction to collect_more_context and keep severity conservative.",
        "Use handoff_offer only when the user would likely benefit from a professional next step.",
        "Return concise but useful reasoning, any key information gaps, and one helpful assistant message.",
        "Return valid JSON that matches the requested schema.",
      ].join(" "),
      prompt: buildGuidancePrompt({
        tenant: input.tenant,
        conversation: input.conversation,
        messages: input.messages,
        baseline: baselineAssessment,
        objective,
        extraction,
      }),
    })
    const normalized = normalizeAiDraft({
      rawText: result.text,
      baseline: baselineAssessment,
      userMessageCount,
    })
    const assessment: SeverityAssessment = {
      severity: normalized.assessment.severity,
      urgencyScore: normalized.assessment.urgencyScore,
      suspectedPest: normalized.assessment.suspectedPest,
      reasoning: normalized.assessment.reasoning,
      recommendedAction: normalized.assessment.recommendedAction as RecommendedAction,
      professionalHelpRecommended: normalized.assessment.professionalHelpRecommended,
    }
    const status = normalizeStatus({
      status: normalized.conversationStatus,
      assessment,
      userMessageCount,
    })

    const aiResult: AssistantTurnResult = {
      assistantMessage: normalized.assistantMessage,
      assessment,
      status,
      mode: "ai",
    }

    return shouldOfferSummary({
      conversation: input.conversation,
      status: aiResult.status,
      assessment: aiResult.assessment,
    })
      ? withSummaryOffer(aiResult)
      : aiResult
  } catch (error) {
    if (env.SCOUT_DISABLE_AI_FALLBACK) {
      throw error
    }

    console.error("Scout AI failed, falling back to rule-based triage.", error)
    const fallbackResult = buildFallbackResult(input.messages)

    return shouldOfferSummary({
      conversation: input.conversation,
      status: fallbackResult.status,
      assessment: fallbackResult.assessment,
    })
      ? withSummaryOffer(fallbackResult)
      : fallbackResult
  }
}
