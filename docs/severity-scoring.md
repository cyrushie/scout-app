# Scout Severity Scoring

This document explains how Scout measures pest severity today.

It covers:
- the rule-based baseline scoring engine
- the AI layer on top of that baseline
- how the API stores the result
- what the dashboard is actually showing

## Short Version

Scout currently uses a two-layer severity system:

1. A rule-based baseline score in `apps/api/src/lib/scout-engine.ts`
2. An AI refinement layer in `apps/api/src/lib/scout-ai.ts`

If AI is available, Scout:
- computes the rule-based baseline first
- sends that baseline plus the transcript to the model
- accepts the AI's structured severity assessment

If AI is unavailable or fails, Scout:
- falls back to the rule-based baseline only

The final result is saved on the conversation after every turn, and copied onto the lead when a lead is submitted.

## Files Involved

- `apps/api/src/lib/scout-engine.ts`
- `apps/api/src/lib/scout-ai.ts`
- `apps/api/src/server.ts`
- `apps/api/src/lib/store.ts`
- `packages/types/src/index.ts`

## End-to-End Flow

When a user sends a message:

1. `POST /v1/chat/messages` receives the new message in `apps/api/src/server.ts`
2. The API saves the user's message
3. The API loads the full conversation history
4. The API calls `generateScoutTurn(...)`
5. `generateScoutTurn(...)` either:
   - uses AI mode
   - or falls back to rule-based mode
6. The API saves Scout's assistant reply
7. The API updates the conversation with:
   - `status`
   - `severity`
   - `suspectedPest`
   - `urgencyScore`
   - `leadOffered`
8. The frontend receives the final `assessment`

The dashboard later reads those saved values.

## Layer 1: Rule-Based Baseline

The baseline engine lives in `apps/api/src/lib/scout-engine.ts`.

The main function is:

```ts
export function assessConversation(
  messages: ConversationMessage[],
): SeverityAssessment
```

### Step 1: Gather User Text

Scout joins all user messages into one lowercase string:

```ts
const userContent = messages
  .filter((message) => message.role === "user")
  .map((message) => message.content)
  .join(" ")
  .toLowerCase();
```

So the baseline is based on the entire user-side transcript, not just the latest message.

### Step 2: Start With a Base Urgency Score

Scout starts every conversation at:

```ts
let urgencyScore = 15;
```

This means every case begins with a small amount of default concern.

### Step 3: Infer the Suspected Pest

Scout checks the combined text against keyword groups:

```ts
const pestSignals = [
  { pest: "Rodents", keywords: ["droppings", "rat", "mouse", "mice", "gnaw", "scratching"] },
  { pest: "Termites", keywords: ["termite", "mud tube", "swarm", "wood damage", "hollow wood"] },
  { pest: "Bed Bugs", keywords: ["bed bug", "bites", "mattress", "welts", "bed frame"] },
  { pest: "Cockroaches", keywords: ["roach", "cockroach", "egg case", "musty smell"] },
  { pest: "Ants", keywords: ["ant", "ants", "trail"] },
];
```

The first matching pest becomes `suspectedPest`.

If Scout finds a pest signal, it adds:

```ts
urgencyScore += 20;
```

And records reasoning like:

```ts
Signals suggest rodents.
```

### Step 4: Add Severity Cue Points

Scout looks for groups of severity-related keywords:

```ts
const severeSignals = [
  { points: 30, keywords: ["kitchen", "pantry", "bedroom", "nursery"] },
  { points: 35, keywords: ["every night", "every day", "keeps coming back", "again", "active"] },
  { points: 40, keywords: ["damage", "wood damage", "bites", "bitten", "children", "baby", "pet"] },
  { points: 45, keywords: ["swarm", "lots of", "infestation", "urgent", "can't sleep"] },
];
```

For each matched group, Scout adds its point value.

Important detail:
- these are group-level bonuses
- if any keyword in the group matches, Scout adds the full group's points
- multiple groups can stack

### Step 5: Add a Small Turn Count Bonus

Scout adds a little more urgency as the user keeps talking:

```ts
urgencyScore += Math.min(userMessageCount * 8, 16);
```

So:
- 1 user message -> `+8`
- 2 user messages -> `+16`
- 3+ user messages -> still capped at `+16`

This is a rough proxy for "the user has more context / the issue may be more real."

### Step 6: Clamp the Score to 0-100

```ts
const boundedScore = Math.max(0, Math.min(100, urgencyScore));
```

So the final urgency score can never go below `0` or above `100`.

### Step 7: Convert Urgency Score to Severity

Scout maps the final score to one of four levels:

```ts
function inferSeverityLevel(score: number): SeverityLevel {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}
```

That means:
- `0-34` -> `low`
- `35-64` -> `medium`
- `65-84` -> `high`
- `85-100` -> `urgent`

### Step 8: Decide the Recommended Action

The baseline maps severity to action:

```ts
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
```

But there is one extra override:

```ts
const needsMoreContext = !suspectedPest && userMessageCount <= 2;
```

If Scout still cannot identify a pest and the user has only given a little information, it forces:

```ts
recommendedAction: "collect_more_context"
```

even if the raw score would otherwise suggest something else.

### Step 9: Decide Whether Pro Help Should Be Offered

Baseline rule:

```ts
professionalHelpRecommended: severity === "high" || severity === "urgent"
```

So the current fallback engine only recommends professional help at `high` or `urgent`.

## Baseline Example

Take this user message:

```txt
I found droppings in my kitchen again.
```

The baseline likely does:

- start at `15`
- `droppings` -> suspected pest `Rodents` -> `+20`
- `kitchen` -> location severity cue -> `+30`
- `again` -> repeat activity severity cue -> `+35`
- 1 user message -> `+8`

Total:

```txt
15 + 20 + 30 + 35 + 8 = 108
```

Bounded to:

```txt
100
```

So fallback severity would become:

```txt
urgent
```

This is one reason the baseline is useful but also still rough. It is intentionally simple and can be aggressive in some phrasing.

## Layer 2: AI Refinement

The AI layer lives in `apps/api/src/lib/scout-ai.ts`.

The main function is:

```ts
export async function generateScoutTurn(input: {
  tenant: TenantConfig
  messages: ConversationMessage[]
}): Promise<AssistantTurnResult>
```

### Step 1: If No API Key, Use Fallback

```ts
if (!env.GROQ_API_KEY) {
  return buildFallbackResult(input.messages)
}
```

So without a provider key, Scout runs only the baseline engine.

### Step 2: Compute the Baseline Anyway

Even in AI mode, Scout still computes the baseline first:

```ts
const baselineAssessment = assessConversation(input.messages)
```

This baseline is then passed into the prompt as context.

### Step 3: Build the AI Prompt

Scout gives the model:
- tenant brand and service areas
- user message count
- latest user message
- baseline suspected pest
- baseline severity
- baseline urgency score
- baseline reasoning
- the last part of the conversation transcript

That happens in `buildGuidancePrompt(...)`.

### Step 4: Ask the AI for Structured Output

Scout tells the model to return JSON with:

```ts
{
  assistantMessage,
  conversationStatus,
  severity,
  urgencyScore,
  suspectedPest,
  reasoning,
  informationGaps,
  recommendedAction,
  professionalHelpRecommended
}
```

The AI is therefore not only generating text. It is also generating the severity object itself.

### Step 5: Normalize the AI Output

Because providers can return slightly inconsistent JSON, Scout normalizes it in:

```ts
normalizeAiDraft(...)
```

This does things like:
- accept `urgency` if the model returns that instead of `urgencyScore`
- turn a single reasoning string into a reasoning array
- fall back to baseline values if some fields are missing

This is important because the AI layer is not trusted blindly. It is repaired and validated before use.

### Step 6: Normalize the Conversation Status

Scout then adjusts the AI status slightly using business rules:

```ts
if (input.assessment.professionalHelpRecommended) {
  return "handoff_offer"
}
```

and:

```ts
if (input.assessment.recommendedAction === "collect_more_context") {
  return input.userMessageCount > 1 ? "assessment" : "clarification"
}
```

So even after AI scoring, Scout still applies some product rules to the conversation stage.

## What the AI Is Actually Doing

The AI is not replacing the whole system. It is refining it.

Today the AI is doing these jobs:
- reading the full transcript more flexibly than keyword matching
- deciding whether the baseline seems too low or too high
- choosing a better `severity`
- choosing a better `urgencyScore`
- choosing a better `suspectedPest`
- deciding whether Scout should still ask follow-up questions
- deciding whether professional help should be offered
- writing the assistant's next reply

So the practical relationship is:

- baseline engine = hard-coded safety net and initial score
- AI = smarter interpretation and refinement

## Where the Final Severity Is Saved

After Scout generates a turn, `apps/api/src/server.ts` saves the result onto the conversation:

```ts
const updatedConversation = await updateConversation(payload.conversationId, {
  status: turn.status,
  severity: turn.assessment.severity,
  suspectedPest: turn.assessment.suspectedPest,
  urgencyScore: turn.assessment.urgencyScore,
  leadOffered: turn.assessment.professionalHelpRecommended,
})
```

So the conversation always stores the latest known:
- severity
- suspected pest
- urgency score
- whether the lead handoff is being offered

## Where Lead Severity Comes From

When a user submits the professional-help form, the frontend sends the current assessment to:

```txt
POST /v1/leads
```

The lead record stores:
- `severity`
- `urgencyScore`
- `suspectedPest`
- `summary`

So the lead does not recalculate severity on its own.

It inherits the latest assessment already produced during the chat.

## What the Dashboard Is Showing

The dashboard is reading stored lead values, not recomputing them.

That means:
- `High Severity Leads` is based on saved lead severities
- `Avg. Urgency Score` is based on saved lead urgency scores
- `Severity Mix` is based on saved lead severities

So the dashboard reflects the latest assessment that existed when the lead was created.

## Important Current Limitations

This is a good Phase 1 severity system, but it is still simple.

### 1. The baseline can be too aggressive

Because scores stack by keyword groups, phrases like:
- `kitchen`
- `again`
- `droppings`

can push the score very high very fast.

### 2. It is not pest-specific enough yet

A rodent issue, termite issue, and cockroach issue should probably not all use the same weighting logic forever.

### 3. It does not yet model spread or duration deeply

It uses rough phrases like:
- `again`
- `every day`
- `active`

but not a richer structured history.

### 4. Lead quality and severity are not separate

Right now severity and urgency do a lot of the business work.

Long term, you may want:
- `severity score`
- `lead quality score`
- `sales readiness score`

as separate concepts.

## Mental Model

The easiest way to think about the current system is:

```txt
user messages
  -> baseline keyword scoring
  -> AI refinement using transcript + baseline
  -> final severity assessment
  -> saved on conversation
  -> copied into lead when lead is submitted
  -> shown in dashboard metrics and lead queue
```

## Current Truth

If someone asks "how does Scout measure severity today?", the most accurate short answer is:

> Scout first uses a rule-based urgency score built from pest keywords, severity cues, and conversation depth, then uses AI to refine that baseline into the final severity, urgency score, suspected pest, and recommended next step. The final result is saved on the conversation and then reused for lead records and dashboard analytics.

