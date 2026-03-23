import type {
  AiRuntimeConfig,
  ContactMethod,
  ConversationMessage,
  ConversationRecord,
  ConversationStatus,
  SeverityAssessment,
  TenantConfig,
} from "@scout/types"
import {
  assessConversation,
  buildAssistantReply,
  inferConversationStatusFromAssessment,
} from "./scout-engine.js"
import { extractTurnSignalsWithAi, generateGuidedObjectiveReply } from "./scout-ai.js"

const skipSignals = new Set(["skip", "prefer not", "no name", "rather not say", "anonymous"])
const greetingSignals = new Set([
  "hi",
  "hello",
  "hey",
  "hey there",
  "hello there",
  "good morning",
  "good afternoon",
  "good evening",
])

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function isSkipResponse(value: string) {
  const normalized = value.trim().toLowerCase()
  return skipSignals.has(normalized)
}

function isGreetingOnly(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[!?.,]/g, "")

  return greetingSignals.has(normalized)
}

function isAffirmative(value: string) {
  const normalized = value.trim().toLowerCase()

  return [
    "yes",
    "yeah",
    "yep",
    "sure",
    "okay",
    "ok",
    "please do",
    "send it",
    "send it over",
    "go ahead",
    "that works",
    "sounds good",
  ].some((signal) => {
    const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
    return new RegExp(`(?:^|\\b)${escaped}(?:$|\\b)`, "i").test(normalized)
  })
}

function isNegative(value: string) {
  const normalized = value.trim().toLowerCase()

  return [
    "no",
    "nope",
    "nah",
    "not now",
    "no thanks",
    "no thank you",
    "skip",
    "not really",
    "maybe later",
  ].some((signal) => {
    const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
    return new RegExp(`(?:^|\\b)${escaped}(?:$|\\b)`, "i").test(normalized)
  })
}

function extractEmail(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]
}

function extractPhone(value: string) {
  const match = value.match(/(?:\+?\d[\d\s().-]{6,}\d)/)

  if (!match) {
    return undefined
  }

  const digits = match[0].replace(/\D/g, "")
  return digits.length >= 7 ? match[0].trim() : undefined
}

function inferContactMethod(value: string): ContactMethod | undefined {
  const normalized = value.trim().toLowerCase()

  if (extractEmail(value) || normalized.includes("email")) {
    return "email"
  }

  if (extractPhone(value) || normalized.includes("text") || normalized.includes("phone") || normalized.includes("call")) {
    return "phone"
  }

  return undefined
}

function extractAvailability(value: string) {
  const withoutEmail = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
  const withoutPhone = withoutEmail.replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, " ")
  const normalized = normalizeText(
    withoutPhone
      .replace(/\b(you can reach me at|reach me at|contact me at|my email is|my phone is|email me at|text me at)\b/gi, " ")
      .replace(/\s+,/g, " ")
      .replace(/,\s*,/g, ", ")
      .replace(/\s{2,}/g, " "),
  )

  if (!normalized || isAffirmative(normalized) || isNegative(normalized)) {
    return undefined
  }

  const availabilitySignals = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "morning",
    "afternoon",
    "evening",
    "tomorrow",
    "today",
    "weekend",
    "am",
    "pm",
    "after",
    "before",
    "available",
    "works",
    "weekday",
  ]

  if (
    availabilitySignals.some((signal) => normalized.toLowerCase().includes(signal)) ||
    normalized.split(" ").length >= 3
  ) {
    return normalized.slice(0, 160)
  }

  return undefined
}

function parseLocation(value: string) {
  if (isSkipResponse(value)) {
    return {
      city: undefined,
      region: undefined,
    }
  }

  const normalized = normalizeText(value)

  if (!normalized) {
    return {
      city: undefined,
      region: undefined,
    }
  }

  const [cityPart, ...rest] = normalized.split(",").map((part) => part.trim()).filter(Boolean)

  return {
    city: cityPart || normalized,
    region: rest.length ? rest.join(", ") : undefined,
  }
}

function extractLocationFromMessage(value: string) {
  const normalized = normalizeText(value)

  if (!normalized || isGreetingOnly(normalized)) {
    return {
      city: undefined,
      region: undefined,
    }
  }

  const explicitMatch = normalized.match(
    /\b(?:i(?:'m| am)|im|from|live in|located in|based in)\s+([A-Za-z][A-Za-z .'-]{1,50})(?:,\s*([A-Za-z][A-Za-z .'-]{1,50}))?$/i,
  )

  if (explicitMatch) {
    return {
      city: explicitMatch[1]?.trim(),
      region: explicitMatch[2]?.trim() || undefined,
    }
  }

  if (normalized.includes(",")) {
    return parseLocation(normalized)
  }

  return {
    city: undefined,
    region: undefined,
  }
}

function sanitizeOptionalString(value: string | undefined, maxLength: number) {
  const normalized = value ? normalizeText(value) : undefined

  if (!normalized) {
    return undefined
  }

  return normalized.slice(0, maxLength)
}

function parsePreferredName(value: string) {
  if (isSkipResponse(value)) {
    return undefined
  }

  const normalized = normalizeText(value)
    .replace(/^my name is\s+/i, "")
    .replace(/^call me\s+/i, "")

  if (!normalized) {
    return undefined
  }

  const [firstWord] = normalized.split(" ")
  return firstWord ? firstWord.slice(0, 40) : undefined
}

function extractPreferredNameFromMessage(value: string, currentStatus: ConversationStatus) {
  if (isSkipResponse(value)) {
    return undefined
  }

  const normalized = normalizeText(value)

  if (!normalized) {
    return undefined
  }

  const explicitMatch = normalized.match(/\b(?:my name is|call me)\s+([A-Za-z][A-Za-z'-]{1,39})\b/i)

  if (explicitMatch) {
    return explicitMatch[1]
  }

  if (currentStatus === "intake_name_optional") {
    const cleaned = normalized.replace(/[!?.,]/g, "")
    const parts = cleaned.split(" ").filter(Boolean)

    if (
      parts.length <= 2 &&
      parts.every((part) => /^[A-Za-z][A-Za-z'-]{0,39}$/.test(part)) &&
      !greetingSignals.has(cleaned.toLowerCase())
    ) {
      return parts[0]
    }
  }

  return undefined
}

function hasIssueSignal(value: string, assessment: SeverityAssessment) {
  const normalized = normalizeText(value)

  if (!normalized || isGreetingOnly(normalized) || isAffirmative(normalized) || isNegative(normalized)) {
    return false
  }

  if (assessment.suspectedPest) {
    return true
  }

  return /(droppings|bites|scratching|roach|cockroach|termite|ant|ants|smell|odor|mice|mouse|rat|rats|bug|bugs|damage|swarm|nest)/i.test(
    normalized,
  )
}

function shouldSkipGuidedInterception(value: string) {
  if (extractEmail(value) || extractPhone(value) || extractAvailability(value)) {
    return false
  }

  return !isAffirmative(value) && !isNegative(value)
}

function resolvePostSummaryStatus(assessment: SeverityAssessment): ConversationStatus {
  if (assessment.professionalHelpRecommended) {
    return "handoff_offer"
  }

  if (assessment.recommendedAction === "collect_more_context") {
    return "assessment"
  }

  return "recommendation"
}

function resolvePostHandoffStatus(assessment: SeverityAssessment): ConversationStatus {
  if (assessment.recommendedAction === "collect_more_context") {
    return "assessment"
  }

  return "recommendation"
}

function buildGuidedFallbackMessage(input: {
  objective: string
  conversation: ConversationRecord
  assessment: SeverityAssessment
}) {
  switch (input.objective) {
    case "collect_issue":
      return "Tell me what signs you've noticed at home, like bites, droppings, scratching sounds, smells, or damage."
    case "collect_location":
      return "What city or area are you in? That can help Scout narrow things down."
    case "collect_name":
      return "And what should I call you? You can also say skip."
    case "offer_summary":
      if (input.assessment.professionalHelpRecommended) {
        return "If it'd help, I can send a short summary of Scout's assessment, the next steps, and some temporary guidance by email or text."
      }
      return "If you'd like, I can send a short summary of Scout's assessment and the next steps by email or text."
    case "collect_summary_contact":
      return "What is the best email address or phone number for that summary? You can share either one."
    case "offer_handoff":
      return "This may be worth professional attention. If you'd like, Scout can help you request follow-up with a pest control professional."
    case "collect_handoff_details":
      return "What is the best email or phone number for follow-up, and what day or time usually works best for you?"
    case "collect_availability":
      return "What day or time usually works best for a follow-up? A rough window like weekday afternoons is enough."
    case "confirm_lead_capture":
      return "Thanks. Scout has the key details for a professional follow-up. You can review and submit the request below whenever you're ready."
    default:
      return input.conversation.preferredName
        ? `Thanks, ${input.conversation.preferredName}. Tell me a little more about what you've noticed.`
        : "Thanks. Tell me a little more about what you've noticed."
  }
}

export interface GuidedTurnResult {
  assistantMessage: string
  status: ConversationStatus
  assessment: SeverityAssessment
  triggerSummaryDelivery?: boolean
  summarySourceAssistantMessage?: string
  patch?: Partial<
    Pick<
      ConversationRecord,
      | "status"
      | "preferredName"
      | "city"
      | "region"
      | "summaryRequested"
      | "summaryEmail"
      | "summaryPhone"
      | "preferredContactMethod"
      | "availabilityNotes"
    >
  >
}

function getLastAssistantMessage(messages: ConversationMessage[]) {
  return [...messages].reverse().find((message) => message.role === "assistant")?.content
}

function buildSummarySentMessage(input: {
  assessment: SeverityAssessment
  contactMethod?: ContactMethod
}) {
  const sentVia =
    input.contactMethod === "phone"
      ? "by text"
      : input.contactMethod === "email"
        ? "by email"
        : "to you"
  const pest = input.assessment.suspectedPest?.toLowerCase()

  if (input.assessment.severity === "urgent") {
    if (pest) {
      return `Done. Scout sent that summary ${sentVia}. It covers Scout's ${pest} assessment, the safest next steps, and temporary guidance you can use right away. If you'd like, I can also help you request professional follow-up now.`
    }

    return `Done. Scout sent that summary ${sentVia}. It covers Scout's assessment, the safest next steps, and temporary guidance you can use right away. If you'd like, I can also help you request professional follow-up now.`
  }

  if (input.assessment.professionalHelpRecommended) {
    if (pest) {
      return `Done. Scout sent that summary ${sentVia}. It includes the ${pest} assessment, the next steps, and some temporary guidance for now. If you'd like, I can also help you request professional follow-up.`
    }

    return `Done. Scout sent that summary ${sentVia}. It includes the assessment, next steps, and some temporary guidance for now. If you'd like, I can also help you request professional follow-up.`
  }

  if (input.assessment.severity === "medium") {
    if (pest) {
      return `Done. Scout sent that summary ${sentVia}. It includes Scout's take on the possible ${pest} issue and the best next steps to try for now.`
    }

    return `Done. Scout sent that summary ${sentVia}. It includes Scout's assessment and the best next steps to try for now.`
  }

  if (pest) {
    return `Done. Scout sent that summary ${sentVia}. It includes Scout's ${pest} take and the next steps it recommends.`
  }

  return `Done. Scout sent that summary ${sentVia}. It includes Scout's assessment and the next steps it recommends.`
}

function buildNextEarlyState(input: {
  conversation: ConversationRecord
  currentStatus: ConversationStatus
  hasIssue: boolean
  city?: string
  region?: string
  preferredName?: string
  skipName: boolean
}) {
  const knownCity = input.city ?? input.conversation.city
  const knownRegion = input.region ?? input.conversation.region
  const knownName = input.preferredName ?? input.conversation.preferredName
  const locationKnown = Boolean(knownCity || knownRegion)

  if (!input.hasIssue) {
    return "intake_issue"
  }

  if (!locationKnown) {
    return "intake_location"
  }

  if (!knownName && !input.skipName && input.currentStatus !== "clarification") {
    return "intake_name_optional"
  }

  return "clarification"
}

async function buildGuidedResponse(input: {
  tenant: TenantConfig
  runtimeConfig: AiRuntimeConfig
  conversation: ConversationRecord
  messages: ConversationMessage[]
  assessment: SeverityAssessment
  objective: string
  nextState: ConversationStatus
  missingFields: string[]
}) {
  return generateGuidedObjectiveReply({
    conversation: input.conversation,
    tenant: input.tenant,
    messages: input.messages,
    runtimeConfig: input.runtimeConfig,
    assessment: input.assessment,
    objective: input.objective,
    nextState: input.nextState,
    missingFields: input.missingFields,
    fallbackAssistantMessage: buildGuidedFallbackMessage({
      objective: input.objective,
      conversation: input.conversation,
      assessment: input.assessment,
    }),
  })
}

export async function handleGuidedIntakeTurn(input: {
  conversation: ConversationRecord
  tenant: TenantConfig
  runtimeConfig: AiRuntimeConfig
  message: string
  messages: ConversationMessage[]
}): Promise<GuidedTurnResult | null> {
  const currentStatus =
    input.conversation.status === "intake" ? "intake_issue" : input.conversation.status
  const assessment = assessConversation(input.messages)
  const extraction = await extractTurnSignalsWithAi({
    conversation: input.conversation,
    messages: input.messages,
    runtimeConfig: input.runtimeConfig,
  })
  const heuristicLocation = extractLocationFromMessage(input.message)
  const location = {
    city: sanitizeOptionalString(extraction.city, 80) ?? heuristicLocation.city,
    region: sanitizeOptionalString(extraction.region, 80) ?? heuristicLocation.region,
  }
  const preferredName =
    sanitizeOptionalString(extraction.preferredName, 40) ??
    extractPreferredNameFromMessage(input.message, currentStatus)
  const summaryEmail = extraction.email ?? extractEmail(input.message)
  const summaryPhone = extraction.phone ?? extractPhone(input.message)
  const preferredContactMethod =
    extraction.preferredContactMethod ??
    inferContactMethod(input.message) ??
    input.conversation.preferredContactMethod ??
    (summaryEmail ? "email" : summaryPhone ? "phone" : undefined)
  const availabilityNotes =
    sanitizeOptionalString(extraction.availabilityNotes, 160) ??
    extractAvailability(input.message) ??
    input.conversation.availabilityNotes
  const hasIssue =
    extraction.issueSignal ??
    hasIssueSignal(input.message, assessment)
  const skipName = extraction.skipName ?? (currentStatus === "intake_name_optional" && isSkipResponse(input.message))

  if (
    currentStatus === "intake_issue" ||
    currentStatus === "intake_location" ||
    currentStatus === "intake_name_optional"
  ) {
    const nextState = buildNextEarlyState({
      conversation: input.conversation,
      currentStatus,
      hasIssue,
      city: location.city,
      region: location.region,
      preferredName,
      skipName,
    })

    const patch: GuidedTurnResult["patch"] = {
      status: nextState,
      city: location.city ?? input.conversation.city,
      region: location.region ?? input.conversation.region,
      preferredName: preferredName ?? input.conversation.preferredName,
    }

    const objective =
      nextState === "intake_issue"
        ? "collect_issue"
        : nextState === "intake_location"
          ? "collect_location"
          : nextState === "intake_name_optional"
            ? "collect_name"
            : "collect_clarification"

    const missingFields =
      nextState === "intake_issue"
        ? ["issue signs"]
        : nextState === "intake_location"
          ? ["city or area"]
          : nextState === "intake_name_optional"
            ? ["preferred name (optional)"]
            : ["clarifying pest details"]

    const reply = await buildGuidedResponse({
      tenant: input.tenant,
      runtimeConfig: input.runtimeConfig,
      conversation: {
        ...input.conversation,
        city: patch.city,
        region: patch.region,
        preferredName: patch.preferredName,
        status: patch.status ?? input.conversation.status,
      },
      messages: input.messages,
      assessment,
      objective,
      nextState,
      missingFields,
    })

    return {
      assistantMessage: reply.assistantMessage,
      status: nextState,
      assessment,
      patch,
    }
  }

  if (currentStatus === "summary_offer") {
    const postSummaryStatus = resolvePostSummaryStatus(assessment)
    const knownContactMethod =
      preferredContactMethod ??
      input.conversation.preferredContactMethod ??
      (summaryPhone ? "phone" : summaryEmail ? "email" : undefined)

    if (summaryEmail || summaryPhone) {
      return {
        assistantMessage: buildSummarySentMessage({
          assessment,
          contactMethod: knownContactMethod,
        }),
        status: postSummaryStatus,
        assessment,
        triggerSummaryDelivery: true,
        summarySourceAssistantMessage: getLastAssistantMessage(input.messages),
        patch: {
          status: postSummaryStatus,
          summaryRequested: true,
          summaryEmail,
          summaryPhone,
          preferredContactMethod: knownContactMethod,
        },
      }
    }

    if (extraction.wantsSummary || isAffirmative(input.message)) {
      const reply = await buildGuidedResponse({
        tenant: input.tenant,
        runtimeConfig: input.runtimeConfig,
        conversation: input.conversation,
        messages: input.messages,
        assessment,
        objective: "collect_summary_contact",
        nextState: "contact_capture",
        missingFields: ["email or phone number"],
      })

      return {
        assistantMessage: reply.assistantMessage,
        status: "contact_capture",
        assessment,
        patch: {
          status: "contact_capture",
        },
      }
    }

    if (extraction.declinesSummary || isNegative(input.message)) {
      return {
        assistantMessage:
          "No problem. Scout can keep helping here in chat if you want to keep going.",
        status: postSummaryStatus,
        assessment,
        patch: {
          status: postSummaryStatus,
          summaryRequested: true,
        },
      }
    }

    if (shouldSkipGuidedInterception(input.message)) {
      return null
    }
  }

  if (currentStatus === "contact_capture") {
    const postSummaryStatus = resolvePostSummaryStatus(assessment)
    const knownContactMethod =
      preferredContactMethod ??
      input.conversation.preferredContactMethod ??
      (summaryPhone ? "phone" : summaryEmail ? "email" : undefined)

    if (summaryEmail || summaryPhone) {
      return {
        assistantMessage: buildSummarySentMessage({
          assessment,
          contactMethod: knownContactMethod,
        }),
        status: postSummaryStatus,
        assessment,
        triggerSummaryDelivery: true,
        summarySourceAssistantMessage: getLastAssistantMessage(input.messages),
        patch: {
          status: postSummaryStatus,
          summaryRequested: true,
          summaryEmail,
          summaryPhone,
          preferredContactMethod: knownContactMethod,
        },
      }
    }

    if (extraction.declinesSummary || isNegative(input.message)) {
      return {
        assistantMessage:
          "No problem. Scout can keep helping here without sending a summary.",
        status: postSummaryStatus,
        assessment,
        patch: {
          status: postSummaryStatus,
          summaryRequested: true,
        },
      }
    }

    const reply = await buildGuidedResponse({
      tenant: input.tenant,
      runtimeConfig: input.runtimeConfig,
      conversation: input.conversation,
      messages: input.messages,
      assessment,
      objective: "collect_summary_contact",
      nextState: "contact_capture",
      missingFields: ["email or phone number"],
    })

    return {
      assistantMessage: reply.assistantMessage,
      status: "contact_capture",
      assessment,
      patch: {
        status: "contact_capture",
      },
    }
  }

  if (currentStatus === "handoff_offer") {
    if (extraction.declinesProfessionalHelp || isNegative(input.message)) {
      return {
        assistantMessage:
          "No problem. Scout can keep helping here in chat if you'd rather hold off on professional follow-up for now.",
        status: resolvePostHandoffStatus(assessment),
        assessment,
        patch: {
          status: resolvePostHandoffStatus(assessment),
        },
      }
    }

    if (
      !extraction.wantsProfessionalHelp &&
      !isAffirmative(input.message) &&
      !summaryEmail &&
      !summaryPhone &&
      !availabilityNotes
    ) {
      return null
    }

    const nextState =
      (summaryEmail || summaryPhone || input.conversation.summaryEmail || input.conversation.summaryPhone) &&
      availabilityNotes
        ? "lead_capture"
        : "scheduling_capture"

    if (nextState === "lead_capture") {
      const reply = await buildGuidedResponse({
        tenant: input.tenant,
        runtimeConfig: input.runtimeConfig,
        conversation: input.conversation,
        messages: input.messages,
        assessment,
        objective: "confirm_lead_capture",
        nextState,
        missingFields: [],
      })

      return {
        assistantMessage: reply.assistantMessage,
        status: "lead_capture",
        assessment,
        patch: {
          status: "lead_capture",
          summaryEmail: summaryEmail ?? input.conversation.summaryEmail,
          summaryPhone: summaryPhone ?? input.conversation.summaryPhone,
          preferredContactMethod,
          availabilityNotes,
        },
      }
    }

    const missingFields = []

    if (!(summaryEmail || summaryPhone || input.conversation.summaryEmail || input.conversation.summaryPhone)) {
      missingFields.push("email or phone number")
    }

    if (!availabilityNotes) {
      missingFields.push("a rough day or time that works")
    }

    const reply = await buildGuidedResponse({
      tenant: input.tenant,
      runtimeConfig: input.runtimeConfig,
      conversation: input.conversation,
      messages: input.messages,
      assessment,
      objective: "collect_handoff_details",
      nextState: "scheduling_capture",
      missingFields,
    })

    return {
      assistantMessage: reply.assistantMessage,
      status: "scheduling_capture",
      assessment,
      patch: {
        status: "scheduling_capture",
        summaryEmail: summaryEmail ?? input.conversation.summaryEmail,
        summaryPhone: summaryPhone ?? input.conversation.summaryPhone,
        preferredContactMethod,
        availabilityNotes,
      },
    }
  }

  if (currentStatus === "scheduling_capture") {
    if (extraction.declinesProfessionalHelp || isNegative(input.message)) {
      return {
        assistantMessage:
          "No problem. Scout can pause the professional follow-up request for now and keep helping here in chat.",
        status: resolvePostHandoffStatus(assessment),
        assessment,
        patch: {
          status: resolvePostHandoffStatus(assessment),
        },
      }
    }

    const knownEmail = summaryEmail ?? input.conversation.summaryEmail
    const knownPhone = summaryPhone ?? input.conversation.summaryPhone
    const knownAvailability = availabilityNotes

    if (!knownEmail && !knownPhone && shouldSkipGuidedInterception(input.message)) {
      return null
    }

    if (knownEmail || knownPhone) {
      if (knownAvailability) {
        const reply = await buildGuidedResponse({
          tenant: input.tenant,
          runtimeConfig: input.runtimeConfig,
          conversation: input.conversation,
          messages: input.messages,
          assessment,
          objective: "confirm_lead_capture",
          nextState: "lead_capture",
          missingFields: [],
        })

        return {
          assistantMessage: reply.assistantMessage,
          status: "lead_capture",
          assessment,
          patch: {
            status: "lead_capture",
            summaryEmail: knownEmail,
            summaryPhone: knownPhone,
            preferredContactMethod,
            availabilityNotes: knownAvailability,
          },
        }
      }

      const reply = await buildGuidedResponse({
        tenant: input.tenant,
        runtimeConfig: input.runtimeConfig,
        conversation: input.conversation,
        messages: input.messages,
        assessment,
        objective: "collect_availability",
        nextState: "scheduling_capture",
        missingFields: ["a rough day or time that works"],
      })

      return {
        assistantMessage: reply.assistantMessage,
        status: "scheduling_capture",
        assessment,
        patch: {
          status: "scheduling_capture",
          summaryEmail: knownEmail,
          summaryPhone: knownPhone,
          preferredContactMethod,
        },
      }
    }

    const reply = await buildGuidedResponse({
      tenant: input.tenant,
      runtimeConfig: input.runtimeConfig,
      conversation: input.conversation,
      messages: input.messages,
      assessment,
      objective: "collect_handoff_details",
      nextState: "scheduling_capture",
      missingFields: ["email or phone number", "a rough day or time that works"],
    })

    return {
      assistantMessage: reply.assistantMessage,
      status: "scheduling_capture",
      assessment,
      patch: {
        status: "scheduling_capture",
        availabilityNotes: knownAvailability,
        preferredContactMethod,
      },
    }
  }

  return null
}

export function buildGuidedFallbackStatus(messages: ConversationMessage[]) {
  const assessment = assessConversation(messages)

  return {
    assessment,
    assistantMessage: buildAssistantReply(assessment, messages),
    status: inferConversationStatusFromAssessment(assessment, messages),
  }
}
