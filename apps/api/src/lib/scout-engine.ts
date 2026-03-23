import type {
  ConversationMessage,
  ConversationStatus,
  RecommendedAction,
  SeverityAssessment,
  SeverityLevel,
} from "@scout/types";

const pestSignals = [
  {
    pest: "Rodents",
    keywords: [
      "droppings",
      "dropping",
      "rat",
      "mouse",
      "mice",
      "gnaw",
      "scratching",
    ],
  },
  {
    pest: "Termites",
    keywords: ["termite", "mud tube", "swarm", "wood damage", "hollow wood"],
  },
  {
    pest: "Bed Bugs",
    keywords: ["bed bug", "bites", "bite", "mattress", "welts", "bed frame"],
  },
  {
    pest: "Cockroaches",
    keywords: ["roach", "cockroach", "egg case", "musty smell"],
  },
  { pest: "Ants", keywords: ["ant", "ants", "trail"] },
];

const severeSignals = [
  { points: 30, keywords: ["kitchen", "pantry", "bedroom", "nursery"] },
  {
    points: 35,
    keywords: [
      "every night",
      "every day",
      "keeps coming back",
      "again",
      "active",
    ],
  },
  {
    points: 40,
    keywords: [
      "damage",
      "wood damage",
      "bites",
      "bitten",
      "children",
      "baby",
      "pet",
    ],
  },
  {
    points: 45,
    keywords: ["swarm", "lots of", "infestation", "urgent", "can't sleep"],
  },
];

const greetingSignals = [
  "hi",
  "hello",
  "hey",
  "hey there",
  "good morning",
  "good afternoon",
  "good evening",
];

function inferSuspectedPest(content: string): string | null {
  const lower = content.toLowerCase();

  for (const signal of pestSignals) {
    if (signal.keywords.some((keyword) => lower.includes(keyword))) {
      return signal.pest;
    }
  }

  return null;
}

function inferSeverityLevel(score: number): SeverityLevel {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function inferRecommendedAction(severity: SeverityLevel): RecommendedAction {
  switch (severity) {
    case "urgent":
      return "urgent_professional_help";
    case "high":
      return "professional_help";
    case "medium":
      return "collect_more_context";
    default:
      return "monitor";
  }
}

function inferConversationStatus(
  severity: SeverityLevel,
  userMessageCount: number,
): ConversationStatus {
  if (severity === "urgent") return "handoff_offer";
  if (severity === "high") return "recommendation";
  if (userMessageCount >= 2) return "assessment";
  return "clarification";
}

export function assessConversation(
  messages: ConversationMessage[],
): SeverityAssessment {
  const userContent = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ")
    .toLowerCase();

  let urgencyScore = 15;
  const reasoning = ["Initial intake created."];

  const suspectedPest = inferSuspectedPest(userContent);

  if (suspectedPest) {
    urgencyScore += 20;
    reasoning.push(`Signals suggest ${suspectedPest.toLowerCase()}.`);
  }

  for (const signal of severeSignals) {
    if (signal.keywords.some((keyword) => userContent.includes(keyword))) {
      urgencyScore += signal.points;
      reasoning.push(`Matched severity cues: ${signal.keywords.join(", ")}.`);
    }
  }

  const userMessageCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  urgencyScore += Math.min(userMessageCount * 8, 16);

  if (!suspectedPest && userMessageCount <= 1) {
    reasoning.push("More clarification is still needed.");
  }

  const boundedScore = Math.max(0, Math.min(100, urgencyScore));
  const severity = inferSeverityLevel(boundedScore);
  const needsMoreContext = !suspectedPest && userMessageCount <= 2;

  return {
    severity,
    urgencyScore: boundedScore,
    suspectedPest,
    reasoning,
    recommendedAction: needsMoreContext
      ? "collect_more_context"
      : inferRecommendedAction(severity),
    professionalHelpRecommended: severity === "high" || severity === "urgent",
  };
}

function normalizeUserMessage(content: string) {
  return content
    .trim()
    .toLowerCase()
    .replace(/[!?.,]/g, "");
}

function isGreetingOnly(messages: ConversationMessage[]) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  if (!lastUserMessage) {
    return false;
  }

  return greetingSignals.includes(normalizeUserMessage(lastUserMessage));
}

export function buildAssistantReply(
  assessment: SeverityAssessment,
  messages: ConversationMessage[],
): string {
  if (assessment.recommendedAction === "collect_more_context") {
    if (isGreetingOnly(messages)) {
      return "Scout can help with that. Tell me what signs you are noticing at home, like droppings, bites, scratching sounds, smells, damaged wood, or where you have seen activity.";
    }

    return "Scout can help sort that out. Tell me what you are seeing or noticing at home, and include details like where it is happening, what the signs look like, and how often it has happened.";
  }

  if (assessment.severity === "urgent") {
    return "Scout sees signs that suggest this may be urgent. Based on what you shared, getting professional help soon would be the safest next step.";
  }

  if (assessment.severity === "high") {
    return "Scout sees signs of an active issue. A professional inspection would likely be the best next step, especially if the activity is ongoing.";
  }

  if (assessment.severity === "medium") {
    return "Scout has enough signal to say this may be more than a one-off issue. A few more details would help confirm how active it seems and whether professional help makes sense.";
  }

  return "Scout does not see strong signs of a severe issue yet. It may make sense to monitor the problem, keep notes, and watch for repeat activity.";
}

export function inferConversationStatusFromAssessment(
  assessment: SeverityAssessment,
  messages: ConversationMessage[],
): ConversationStatus {
  if (assessment.recommendedAction === "collect_more_context") {
    return "clarification";
  }

  const userMessageCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  return inferConversationStatus(assessment.severity, userMessageCount);
}
