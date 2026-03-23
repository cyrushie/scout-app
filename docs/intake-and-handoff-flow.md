# Scout Intake And Handoff Flow

Note:
- this document describes the earlier structured intake design
- the newer conversational design is documented in [scout-conversation-flow-v2.md](/home/cyrus/Desktop/webdev/scout-app/docs/scout-conversation-flow-v2.md)
- use the v2 document as the main reference for the next Scout flow upgrade

This document describes the recommended chat flow for Scout's next intake upgrade.

Goals:
- collect useful context early without hurting trust
- give value before asking for high-friction contact details
- create better leads
- prepare for future appointment scheduling

Update:
- Scout now follows the conversational v2 direction
- summary delivery should happen before professional handoff in most cases
- high-severity users should still receive useful temporary guidance, not just a lead form

## Product Principle

Scout should feel like:
- a helpful pest assessment guide first
- a lead capture and scheduling tool second

That means the chat should earn each new question.

Bad pattern:
- ask for name
- ask for email
- ask for phone
- ask for address
- only then provide advice

Better pattern:
- understand the issue
- collect light context
- provide a useful assessment
- offer follow-up value
- then collect contact details if the user wants more

## Recommended Conversation Flow

### 1. Problem First

Opening message:

```txt
Scout can help you sort through signs of pests at home. What have you noticed?
```

Why:
- starts with the user's problem
- keeps friction low
- gets real diagnostic signal immediately

Captured fields:
- `issue_description`

### 2. Location Early

After the user's first message:

```txt
What city or area are you in? Pest activity can vary by location.
```

Why:
- feels justified
- helps with later routing
- helps lead qualification
- feels less invasive than address

Captured fields:
- `city`
- `region`
- optionally `country`

Do not ask for exact address yet.

### 3. Optional Name

After location:

```txt
What should I call you?
```

Why:
- personalizes the chat
- lower friction than asking for full legal name first
- keeps tone warm

Captured fields:
- `first_name` or `preferred_name`

This should be optional.

### 4. Clarification Questions

Scout asks only the minimum useful follow-ups.

Examples:
- where in the home is it happening?
- how often have you seen it?
- what do the signs look like?
- have you noticed damage, smells, or sounds?

Why:
- this improves severity accuracy
- this should still feel like help, not a form

Captured fields:
- `affected_area`
- `frequency`
- `evidence_types`
- `duration`
- `health_risk_flags`

### 5. First Assessment

Scout should give a structured but human answer:

```txt
This may be a rodent issue. Since you've seen droppings more than once in the kitchen, it sounds more like active activity than a one-off sign.
```

Then:

```txt
Scout's current level of concern is moderate.
```

Then:

```txt
The next best step is to check for fresh droppings, food access, and entry points nearby.
```

Why:
- this is the first value moment
- the user now feels helped

Captured fields:
- `suspected_pest`
- `severity`
- `urgency_score`
- `recommended_action`

### 6. Offer Summary Delivery

After Scout has given useful advice:

```txt
If you'd like, Scout can send a short summary of these recommendations to your email or phone.
```

Why:
- creates a natural reason to collect contact info
- gives immediate value
- feels helpful rather than pushy

If accepted, capture:
- `email`
- `phone`
- `contact_consent_email`
- `contact_consent_sms`

Important:
- email and phone should be optional alternatives, not both required
- if SMS is used, make consent explicit

Important update:
- this should be offered after any real assessment, not only lower-severity conversations
- once the user accepts, Scout should send the summary as soon as it has the required email or phone number
- the summary should include the assessment and practical next steps, not just a generic thank-you
- if the issue is more severe, the summary can also include temporary guidance while the user decides about professional help

### 7. Professional Help Offer

Only when severity or repeated activity justifies it:

```txt
If you'd like, Scout can also help you request an appointment with a pest control professional.
```

Why:
- this should feel earned
- it should not happen too early

Important update:
- if the user accepted summary delivery, Scout should confirm the summary was sent before pivoting into professional help
- professional help should usually feel like the next optional step after value delivery, not a replacement for it

Trigger examples:
- severity is `high` or `urgent`
- repeated signs of activity
- health/safety concerns
- clear infestation cues

### 8. Scheduling Intent Capture

If the user wants professional help:

```txt
What day or time usually works best for you?
```

Then:

```txt
What's the best email or phone number for follow-up?
```

Optional later:

```txt
What address or service location should the provider keep in mind?
```

Why:
- availability is useful lead value
- it makes the lead more appointment-ready

Captured fields:
- `wants_professional_help`
- `preferred_contact_method`
- `preferred_day`
- `preferred_time_window`
- `service_address` or `service_location_notes`

### 9. Completion

Scout closes with a clear summary:

```txt
Scout has your request. A pest control professional can follow up using your preferred contact details and schedule preferences.
```

Captured fields:
- `lead_ready`
- `handoff_ready`

## Recommended State Machine

The chat should move through explicit states.

Suggested states:

1. `intake_issue`
2. `intake_location`
3. `intake_name_optional`
4. `clarification`
5. `assessment`
6. `summary_offer`
7. `contact_capture`
8. `handoff_offer`
9. `scheduling_capture`
10. `complete`

Implementation note:
- the current flow can keep these same states
- summary sending itself can remain an immediate backend action after `contact_capture`
- no extra rigid delivery state is required unless it becomes useful later for reporting

## Suggested Transition Rules

### `intake_issue` -> `intake_location`

When:
- the user has described at least one pest sign

### `intake_location` -> `intake_name_optional`

When:
- city or region is captured

### `intake_name_optional` -> `clarification`

When:
- name is provided or skipped

### `clarification` -> `assessment`

When:
- Scout has enough signal for:
  - likely pest
  - concern level
  - next step

### `assessment` -> `summary_offer`

When:
- Scout has already delivered useful guidance

### `summary_offer` -> `contact_capture`

When:
- user says yes to receiving a summary

### `contact_capture` -> immediate summary delivery action

When:
- the user has chosen email or text
- and Scout has valid contact information for that channel

### `assessment` or `summary_offer` -> `handoff_offer`

When:
- severity is high enough
- or user explicitly asks for a professional

Recommended nuance:
- if the user accepted summary delivery, `handoff_offer` should usually happen after the summary is sent

### `handoff_offer` -> `scheduling_capture`

When:
- user accepts professional help

### `scheduling_capture` -> `complete`

When:
- contact method and availability are captured

## What Should Be Required Vs Optional

### Required early

- issue description
- city or region

### Optional early

- preferred name

### Optional after value

- email
- phone

These should feel tied to summary delivery, not demanded before help is given.

### Required only for professional handoff

- at least one contact method
- availability preference

### Still avoid early

- exact address
- full legal name
- too many form fields at once

## Database/Data Model Changes

Right now the lead model is focused on:
- name
- email
- phone
- city
- region
- severity
- urgency
- summary

To support the new flow well, we will likely want:

### Conversation-level intake fields

- `preferredName`
- `city`
- `region`
- `issueDescription`
- `preferredContactMethod`
- `summaryRequested`
- `summaryDeliveryEmail`
- `summaryDeliveryPhone`
- `wantsProfessionalHelp`
- `preferredDay`
- `preferredTimeWindow`
- `serviceAddress`

### Lead-level fields

- `displayId`
- `preferredName`
- `contactMethod`
- `summaryRequested`
- `appointmentRequested`
- `preferredDay`
- `preferredTimeWindow`
- `serviceAddress`
- `leadSource`
- `leadStage`

Important note:
- some of these belong on the conversation before a lead exists
- once the user commits to follow-up or scheduling, relevant fields can be copied into the lead

## API Changes Needed

### Current state

Today Scout mostly supports:
- create conversation
- send chat message
- create lead

### Recommended additions

1. Persist structured intake state on the conversation

Possible route:

```txt
PATCH /v1/conversations/:conversationId/intake
```

Used for:
- name
- city
- region
- summary delivery preferences
- availability

2. Include structured intake fields in the chat turn payload or conversation store

So the AI can reason with:
- location
- preferred name
- summary opt-in
- scheduling intent

3. Split lead creation into clearer moments

Possible pattern:
- `summary lead`
- `professional handoff lead`

or one lead with a richer `leadStage`

## AI Behavior Changes Needed

The AI should not just answer pest questions.

It also needs controlled conversational behavior around data collection.

### The AI should know:

- when to ask location
- when to ask optional name
- when enough value has been given to offer summary delivery
- when professional help should be offered
- when to capture availability

### The AI should not decide everything freely

Best approach:
- combine AI generation with explicit product rules

For example:
- product state machine decides the current stage
- AI writes the wording for that stage
- backend validates and stores the structured fields

This is better than fully freeform chat.

## Suggested Prompt Responsibilities

The AI should be responsible for:
- phrasing the next question naturally
- interpreting the user's latest message
- producing structured assessment output

The backend/product logic should be responsible for:
- stage transitions
- required-field enforcement
- contact-consent rules
- when to create a lead
- when to trigger scheduling capture

## Suggested UX Copy

### Opening

```txt
Scout can help you sort through signs of pests at home. What have you noticed?
```

### Location

```txt
What city or area are you in? Pest activity can vary by location.
```

### Name

```txt
What should I call you?
```

### Summary offer

```txt
If you'd like, Scout can send a short summary of these recommendations to your email or phone.
```

Better version:

```txt
If you'd like, I can send you a short summary of Scout's assessment and the best next steps by email or text.
```

### Professional handoff

```txt
This may be worth professional attention. If you'd like, Scout can help you request an appointment with a pest control professional.
```

### Availability

```txt
What day or time usually works best for you?
```

## Lead Quality Benefits

This flow improves lead quality because each lead can include:
- location
- likely pest
- severity
- urgency
- whether the user wanted only advice or actual professional help
- contact method
- availability

That is much more valuable than a plain contact form.

## Phase Recommendation

### Phase A

Build:
- location capture
- optional name capture
- better stage handling
- summary offer

### Phase B

Build:
- summary delivery capture
- professional help intent capture
- preferred day/time

Updated note:
- summary delivery should now be treated as a core user-value feature, not just a lead-capture mechanism

### Phase C

Build:
- actual scheduling workflows
- provider routing
- appointment tracking

## Recommended First Implementation Slice

If we build this incrementally, the best first slice is:

1. Add conversation intake fields for:
   - `preferredName`
   - `city`
   - `region`
2. Update the state machine to ask:
   - issue first
   - location second
   - name third
3. Keep lead capture where it is for now
4. Add summary-delivery capture next

That gives a real product improvement without trying to solve scheduling immediately.
