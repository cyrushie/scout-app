import type {
  ConversationMessage,
  ConversationRecord,
  SeverityAssessment,
} from "@scout/types"
import { env } from "./env.js"

function formatConcernLabel(severity: SeverityAssessment["severity"]) {
  switch (severity) {
    case "urgent":
      return "Urgent concern"
    case "high":
      return "High concern"
    case "medium":
      return "Moderate concern"
    default:
      return "Low concern"
  }
}

function formatRecommendedAction(assessment: SeverityAssessment) {
  switch (assessment.recommendedAction) {
    case "urgent_professional_help":
      return "Professional help is the safest next step."
    case "professional_help":
      return "A professional inspection is a smart next step."
    case "home_action":
      return "A simple home action may be enough for now."
    case "collect_more_context":
      return "A little more context would help confirm the next step."
    default:
      return "Monitor the issue and watch for repeat activity."
  }
}

function buildTemporaryGuidance(assessment: SeverityAssessment) {
  const pest = assessment.suspectedPest?.toLowerCase() ?? ""

  if (pest.includes("bed bug")) {
    return "Temporary guidance: avoid moving bedding between rooms, dry washable fabrics on high heat, and reduce clutter around the sleeping area."
  }

  if (pest.includes("rodent") || pest.includes("mice") || pest.includes("mouse") || pest.includes("rat")) {
    return "Temporary guidance: seal food, clean fresh droppings carefully, and watch for active entry points without disturbing them too much."
  }

  if (pest.includes("cockroach") || pest.includes("roach")) {
    return "Temporary guidance: reduce food and water access, clean crumbs and grease, and focus on sinks, appliances, and cabinet edges."
  }

  if (pest.includes("termite")) {
    return "Temporary guidance: avoid disturbing damaged wood or swarm evidence, and keep notes on where activity is showing up."
  }

  if (assessment.professionalHelpRecommended || assessment.severity === "high" || assessment.severity === "urgent") {
    return "Temporary guidance: reduce access to food and moisture where possible, avoid actions that spread the issue, and keep notes on any repeat activity while you wait."
  }

  return "Temporary guidance: keep notes on repeat activity, where it appears, and anything that seems to make it worse or better."
}

function formatLocation(conversation: ConversationRecord) {
  if (conversation.city && conversation.region) {
    return `${conversation.city}, ${conversation.region}`
  }

  return conversation.city ?? conversation.region ?? "Not provided"
}

function getRecentUserContext(messages: ConversationMessage[]) {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content.trim())
    .filter(Boolean)

  return userMessages.length > 0 ? userMessages.join(" ") : "No extra details captured."
}

function stripSummaryOfferCallToAction(text: string) {
  return text.replace(
    /\s*If (?:you'd like|you want|it'd help), I can send you a short (?:summary|recap) of Scout's .*? by email or text\. Just say yes if you want that\.\s*$/i,
    "",
  )
}

function buildEmailText(input: {
  conversation: ConversationRecord
  assessment: SeverityAssessment
  messages: ConversationMessage[]
  assistantMessage: string
  requestedEmail?: string
  requestedPhone?: string
}) {
  const greetingName = input.conversation.preferredName ?? "there"
  const possibleIssue = input.assessment.suspectedPest ?? "Still assessing"
  const cleanAssistantMessage = stripSummaryOfferCallToAction(input.assistantMessage)

  return [
    `Hi ${greetingName},`,
    "",
    "Here is your Scout pest summary.",
    "",
    `Possible issue: ${possibleIssue}`,
    `Concern level: ${formatConcernLabel(input.assessment.severity)}`,
    `Location: ${formatLocation(input.conversation)}`,
    `What you shared: ${getRecentUserContext(input.messages)}`,
    `Scout's guidance: ${cleanAssistantMessage}`,
    `Recommended next step: ${formatRecommendedAction(input.assessment)}`,
    buildTemporaryGuidance(input.assessment),
    "",
    input.requestedEmail ? `Requested email: ${input.requestedEmail}` : undefined,
    input.requestedPhone ? `Requested phone: ${input.requestedPhone}` : undefined,
    "",
    "Scout",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildSmsText(input: {
  assessment: SeverityAssessment
  assistantMessage: string
}) {
  const possibleIssue = input.assessment.suspectedPest ?? "Still assessing"
  const cleanAssistantMessage = stripSummaryOfferCallToAction(input.assistantMessage)

  return [
    `Scout summary: ${possibleIssue}.`,
    `${formatConcernLabel(input.assessment.severity)}.`,
    cleanAssistantMessage,
    `Next step: ${formatRecommendedAction(input.assessment)}`,
    buildTemporaryGuidance(input.assessment),
  ].join(" ")
}

async function sendSummaryEmail(input: {
  conversation: ConversationRecord
  assessment: SeverityAssessment
  messages: ConversationMessage[]
  assistantMessage: string
}) {
  if (!input.conversation.summaryEmail || !env.RESEND_API_KEY) {
    return
  }

  const to = env.SUMMARY_EMAIL_OVERRIDE ?? input.conversation.summaryEmail
  const text = buildEmailText({
    conversation: input.conversation,
    assessment: input.assessment,
    messages: input.messages,
    assistantMessage: input.assistantMessage,
    requestedEmail: input.conversation.summaryEmail,
    requestedPhone: input.conversation.summaryPhone,
  })

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject: "Your Scout pest summary",
      text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Resend delivery failed: ${response.status} ${errorBody}`)
  }
}

async function sendSummarySms(input: {
  conversation: ConversationRecord
  assessment: SeverityAssessment
  assistantMessage: string
}) {
  if (
    !input.conversation.summaryPhone ||
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_PHONE_NUMBER
  ) {
    return
  }

  const body = new URLSearchParams({
    To: env.SUMMARY_SMS_OVERRIDE ?? input.conversation.summaryPhone,
    From: env.TWILIO_PHONE_NUMBER,
    Body: buildSmsText({
      assessment: input.assessment,
        assistantMessage: input.assistantMessage,
    }),
  })

  const auth = Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
  ).toString("base64")

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Twilio delivery failed: ${response.status} ${errorBody}`)
  }
}

export async function deliverSummary(input: {
  conversation: ConversationRecord
  assessment: SeverityAssessment
  messages: ConversationMessage[]
  assistantMessage: string
}) {
  const results = await Promise.allSettled([
    sendSummaryEmail(input),
    sendSummarySms(input),
  ])

  const failures = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) => String(result.reason))

  if (failures.length > 0) {
    throw new Error(failures.join(" | "))
  }
}
