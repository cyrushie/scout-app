# Scout Conversation Flow V2

This document describes the next version of Scout's conversation flow.

V2 keeps the existing internal conversation states, but changes how Scout uses them:

- states should guide the conversation
- states should not script the conversation
- Scout should respond naturally to what the user actually says
- Scout should still gently collect the information we need for assessment, follow-up, and lead creation

## Why V2 Exists

The current flow is useful structurally, but it can feel robotic because Scout often behaves like:

- state -> canned reply
- user goes off-script -> Scout pulls them back too abruptly
- user gives information out of order -> Scout still asks in the original order

That makes the chat feel like a form.

V2 is meant to feel more like a real assistant:

- it acknowledges the user's actual message
- it extracts useful information even if the user gives it early
- it answers short side questions when appropriate
- it still moves toward the next business goal

## Product Principle

Scout should feel like a pest guidance assistant first and a lead-generation workflow second.

That means:

- the user should feel understood
- the states should be invisible
- the data collection should feel earned
- the lead capture should be subtle but intentional

## Summary-First Behavior

The current v2 flow should be extended with a summary-first value path.

This means:

- after a real assessment, Scout should usually offer to send a useful summary
- if the user accepts, Scout should capture the preferred delivery method naturally
- once valid contact info is available, Scout should send the summary immediately
- only after that should Scout pivot into professional help if the situation justifies it

This is meant to fit smoothly into the natural v2 conversation style, not replace it with a rigid new branch.

The guiding rule is:

```txt
help first, handoff second
```

## Core V2 Design

The state machine should decide the goal of the turn, not the exact wording of the turn.

Old model:

```txt
state -> fixed assistant message
```

V2 model:

```txt
state + known conversation data + latest user message -> AI-generated guided reply
```

## Three-Layer Turn Model

Each Scout turn should run in three layers.

### 1. Understand

Figure out what the user just said.

Extract or infer:

- issue details
- signs or evidence
- city
- region
- preferred name
- email
- phone
- preferred contact method
- availability
- professional-help intent
- summary-delivery intent
- side questions
- emotional tone

### 2. Decide

Figure out what Scout should do next.

This includes:

- current state
- missing fields
- whether the user answered the current question
- whether they answered multiple questions at once
- whether they changed the subject
- whether the state should advance
- what the next best objective is

### 3. Respond

Generate a short natural reply that:

- acknowledges the user's actual message
- answers a short side question if needed
- avoids repeating the same canned phrasing
- gently moves the conversation toward the next missing piece of information
- does not expose internal states or business logic

## States In V2

The states still matter, but their meaning changes slightly.

They are no longer "the next script line."

They become "the current objective."

### `intake_issue`

Goal:
- understand what signs the user is noticing

### `intake_location`

Goal:
- collect city or region

### `intake_name_optional`

Goal:
- collect an optional preferred name without blocking the flow forever

### `clarification`

Goal:
- collect the minimum missing details needed for a useful assessment

### `assessment`

Goal:
- give a clear likely-pest and concern-level readout

### `summary_offer`

Goal:
- offer useful recap delivery by email or SMS after a real assessment
- make the value of the summary clear before asking for contact details

### `contact_capture`

Goal:
- collect summary-delivery contact details naturally
- ask for the user's preferred delivery method first, then only the missing contact field needed to send it

### `handoff_offer`

Goal:
- offer professional help when the situation justifies it
- do this after summary delivery when possible, not instead of it

### `scheduling_capture`

Goal:
- collect follow-up availability and preferred contact method

### `lead_capture`

Goal:
- collect or confirm any remaining details needed for a complete lead

### `complete`

Goal:
- confirm what Scout will do next and close the loop cleanly

## State Transitions In V2

In V2, state transitions should be based on missing information, not just the last question asked.

That means the user can answer out of order and Scout should still move forward correctly.

Example:

```txt
Hi, I'm Cyrus from San Jose and I keep waking up with bites.
```

Scout should extract:

- preferredName = Cyrus
- city = San Jose
- issueDescription = waking up with bites

Then Scout should skip past location and optional-name collection automatically.

The same principle should apply later in the flow:

- if the user already gave an email, Scout should not ask for it again
- if the user changes from text to email, Scout should adapt naturally
- if the user asks for professional help early, Scout can still give value first and then move forward

## Conversation Profile

Each conversation should maintain a structured profile that updates every turn.

Suggested fields:

- `issueDescription`
- `preferredName`
- `city`
- `region`
- `summaryEmail`
- `summaryPhone`
- `preferredContactMethod`
- `availabilityNotes`
- `suspectedPest`
- `severity`
- `urgencyScore`
- `recommendedAction`
- `summaryRequested`
- `summarySent`
- `professionalHelpInterested`
- `leadReady`
- `assessmentDelivered`
- `summaryOffered`
- `handoffOffered`
- `temporaryGuidanceOffered`
- `nameSkipped`

This profile is the source of truth for deciding what Scout should do next.

## Summary Content

When Scout sends a summary, it should not simply dump the transcript.

The summary should include:

- likely pest or main concern
- level of concern
- why Scout thinks that
- recommended next steps
- temporary guidance when appropriate

For higher-severity situations, the summary should still be useful even if the user is likely to become a lead.

That means it can include:

- safe temporary mitigation steps
- what not to do
- what signs would justify urgent follow-up

The user should feel that Scout gave them something valuable immediately.

## How Scout Should Behave When Users Go Off-Script

V2 should not punish normal human conversation.

### If the user just says hello

Bad:

```txt
What city or area are you in?
```

Better:

```txt
Tell me what signs you've noticed at home, like bites, droppings, scratching sounds, smells, or damage.
```

### If the user asks a side question

Example:

```txt
Can cockroaches cause bites?
```

Better behavior:

- answer briefly
- then guide back toward the missing intake detail

Example reply:

```txt
Cockroaches usually are not the most common cause of bites. What signs have you noticed, and what city or area are you in?
```

### If the user gives partial information

Example:

```txt
Every day.
```

Scout should:

- connect it to the previous question
- not pretend the answer is complete
- ask only the next useful follow-up

### If the user changes the subject

Scout should not ignore it completely.

It should:

- acknowledge it
- answer briefly if reasonable
- then continue the main flow

## Prompting Strategy

The LLM should not be asked to fully control the whole flow.

Instead, the backend should supply:

- current state
- known conversation profile
- missing fields
- recent transcript
- internal objective for this turn
- tone and safety rules

Then the model should generate:

- a natural assistant reply
- optional structured extraction updates
- optional recommendations about whether the state should advance

## Recommended AI Responsibilities

The AI should be responsible for:

- natural phrasing
- acknowledging the user's latest message
- extracting flexible conversational signals
- generating the likely-pest assessment
- producing a short next question

The backend should be responsible for:

- enforcing state transitions
- deciding required vs optional fields
- deciding when a lead is ready
- deciding when summary delivery should trigger
- sending the summary as soon as valid contact info is captured
- deciding when professional handoff should happen

## Recommended Turn Pipeline

For each user turn:

1. Load conversation and recent transcript.
2. Run structured extraction on the new user message.
3. Merge extracted fields into the conversation profile.
4. Recompute the most appropriate current state based on missing fields and assessment status.
5. Decide the turn objective for that state.
6. Ask the model to produce a natural response for that objective.
7. Save:
   - extracted fields
   - updated state
   - updated assessment
   - assistant reply

If the user has accepted summary delivery and supplied valid contact info, the backend should also:

8. trigger summary delivery immediately
9. confirm in chat that the summary was sent
10. then decide whether the next objective is handoff or completion

## Suggested State Resolver Logic

The next state should be derived from what is still missing.

Suggested order:

1. If no issue is known, use `intake_issue`.
2. Else if no location is known, use `intake_location`.
3. Else if preferred name is missing and not skipped, use `intake_name_optional`.
4. Else if Scout still lacks enough diagnostic detail, use `clarification`.
5. Else if a useful assessment has not yet been delivered, use `assessment`.
6. Else if summary has not been offered and the user has received useful guidance, use `summary_offer`.
7. Else if the user wants a summary but contact info is missing, use `contact_capture`.
8. Else if the user accepted a summary and contact info is now sufficient, send the summary immediately.
9. Else if professional help is justified or requested and it has not yet been offered, use `handoff_offer`.
10. Else if the user wants professional help and availability or preferred contact details are missing, use `scheduling_capture`.
11. Else if lead details are nearly complete but still need confirmation, use `lead_capture`.
12. Else use `complete`.

## Suggested Response Rules

Scout replies should follow these rules:

- short by default
- ask at most one or two things at a time
- do not repeat the same opener every turn
- do not expose internal scoring
- do not sound like a support ticket form
- use the user's name occasionally, not constantly
- guide toward the next missing field without sounding pushy
- do not skip the summary offer just because the issue is severe
- once a user accepts the summary, prioritize sending it quickly before asking for more lead questions

## Example Comparison

### Old feeling

User:

```txt
hey
```

Scout:

```txt
What city or area are you in?
```

### V2 feeling

User:

```txt
hey
```

Scout:

```txt
Tell me what signs you've noticed at home, like bites, droppings, scratching sounds, smells, or damage.
```

### Another V2 example

User:

```txt
Hi, I'm Cyrus from San Jose and I keep getting bites.
```

Scout:

```txt
Thanks, Cyrus. Bites can come from a few different things. Are they mostly happening overnight, and have you noticed anything on bedding or around the mattress?
```

Notice what happened:

- Scout did not ask again for name
- Scout did not ask again for location
- Scout moved naturally to the next missing diagnostic detail

### Summary-first example

User:

```txt
Yes, send me the summary by text.
```

Scout:

```txt
Absolutely. What number should I send it to?
```

User:

```txt
+14085550123
```

Scout:

```txt
Done. Scout sent that summary over. If you'd like, I can also help you request follow-up from a pest professional.
```

Notice what happened:

- Scout did not delay the summary behind more lead questions
- Scout confirmed value delivery immediately
- the professional handoff came after the value moment

## Implementation Design For This Codebase

The current implementation is spread mainly across:

- [apps/api/src/lib/intake-flow.ts](/home/cyrus/Desktop/webdev/scout-app/apps/api/src/lib/intake-flow.ts)
- [apps/api/src/lib/scout-ai.ts](/home/cyrus/Desktop/webdev/scout-app/apps/api/src/lib/scout-ai.ts)
- [apps/api/src/server.ts](/home/cyrus/Desktop/webdev/scout-app/apps/api/src/server.ts)
- [apps/api/src/lib/store.ts](/home/cyrus/Desktop/webdev/scout-app/apps/api/src/lib/store.ts)

Recommended refactor:

### 1. Add a turn-extraction step

Create a helper such as:

```ts
extractTurnSignals()
```

Responsibilities:

- parse structured fields from the latest user message
- detect side-question intent
- detect summary opt-in
- detect professional-help intent

### 2. Add a state resolver

Create a helper such as:

```ts
resolveConversationObjective()
```

Responsibilities:

- inspect known fields and assessment state
- decide the most appropriate current state
- list missing fields for that state

### 3. Add a guided reply generator

Create a helper such as:

```ts
generateGuidedReply()
```

Responsibilities:

- receive current state, missing fields, recent transcript, and latest user message
- generate short natural copy for the turn
- keep Scout conversational while still advancing the flow

### 4. Shrink hardcoded responses

Keep hardcoded text only for:

- initial greeting
- AI failure fallback
- rare edge-case safety responses

Everything else should become model-generated with product rules.

## Recommended Rollout Plan

### Step 1

Refactor intake and clarification turns so the state machine supplies goals, not exact phrasing.

### Step 2

Allow slot extraction from out-of-order user messages.

### Step 3

Move summary-offer and handoff-offer wording to the same guided-response approach, and make summary delivery immediate once contact capture is complete.

### Step 4

Once V2 is live, update dashboard analytics to measure richer drop-off and state progression against the new flow.

## Dashboard Implications

V2 should eventually make the dashboard more meaningful because it will create cleaner state data for:

- drop-off by state
- summary acceptance
- handoff acceptance
- scheduling intent
- high-intent incomplete conversations

That dashboard work should happen after V2 flow behavior is implemented.

## Final Recommendation

V2 should keep the current state machine, but demote it from "conversation script" to "conversation objective engine."

That gives Scout the structure the product needs without making the assistant feel mechanical.

The summary-first update should be layered into that same architecture:

- keep the natural conversational behavior
- keep the internal objectives
- deliver useful guidance as soon as the user accepts it
- then transition into professional help smoothly when appropriate
