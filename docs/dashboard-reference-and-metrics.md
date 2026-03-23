# Scout Dashboard Reference And Metrics

This document explains the dashboard as it exists today:

- what pages it has
- what each page is for
- what data each metric is measuring
- how those metrics are calculated in code
- what actions are usually worth taking when a metric looks weak, strong, or unusual

This is a current-state reference, not just a roadmap.

## Primary Purpose

The dashboard currently serves 3 jobs:

1. monitor overall Scout performance
2. inspect conversation flow and drop-off
3. work qualified leads operationally

The dashboard is internal only. It is protected by dashboard auth and reads from the same API and database as the public app.

## Current Pages

### 1. Overview

File:
- `apps/dashboard/app/page.tsx`

Purpose:
- show the executive snapshot of Scout
- surface core lead and conversation metrics quickly
- let you jump into analytics, conversations, and lead ops
- let you switch the active AI runtime for testing

Main sections:
- headline metrics
- conversation funnel
- recent incomplete sessions
- recent qualified leads
- Scout runtime selector
- severity mix

### 2. Analytics

File:
- `apps/dashboard/app/analytics/page.tsx`

Purpose:
- understand product effectiveness
- see where users stop
- see what pests appear most often
- compare model performance

Main sections:
- funnel
- top pest signals
- model comparison
- state distribution
- drop-off approximation
- high-intent incomplete sessions

### 3. Conversations

File:
- `apps/dashboard/app/conversations/page.tsx`

Purpose:
- inspect all conversations, not just leads
- debug the funnel
- see how far users got before stopping

Filters:
- search
- conversation state
- severity
- source
- whether a lead was created

### 4. Conversation Detail

File:
- `apps/dashboard/app/conversations/[conversationId]/page.tsx`

Purpose:
- inspect one full conversation
- see transcript, current state, urgency, contact info, and linked lead

Main sections:
- conversation snapshot
- full transcript

### 5. Leads

File:
- `apps/dashboard/app/leads/page.tsx`

Purpose:
- operational lead queue
- search and filter actual captured leads

Filters:
- search
- lead status
- severity

### 6. Lead Detail

File:
- `apps/dashboard/app/leads/[leadId]/page.tsx`

Purpose:
- work one lead
- inspect transcript
- update lead status

Main sections:
- lead snapshot
- status management
- transcript
- current conversation state

## Data Sources

The dashboard reads from the API layer, not directly from the frontend.

Important files:
- `apps/dashboard/lib/scout-api.ts`
- `apps/api/src/server.ts`
- `apps/api/src/lib/store.ts`

The key stored objects are:
- `Conversation`
- `ConversationMessage`
- `Lead`
- `ScoutRuntimeConfig`

## Core Entities

### Conversation

A conversation is the full Scout session.

It stores:
- current state
- severity
- urgency score
- suspected pest
- name/location fields
- summary delivery contact fields
- runtime snapshot:
  - `aiProviderUsed`
  - `aiModelUsed`

Important detail:
- each conversation snapshots the active runtime when it starts
- if you switch the global model later, old conversations keep their original runtime identity
- this makes model comparison trustworthy

### Lead

A lead is created when Scout has enough information for a real follow-up opportunity.

It stores:
- contact info
- location
- suspected pest
- severity
- urgency score
- summary
- lead status

Lead statuses today:
- `new`
- `review`
- `contacted`
- `closed`

## Current Conversation States

The dashboard tracks these current conversation states:

1. `intake`
2. `intake_issue`
3. `intake_location`
4. `intake_name_optional`
5. `clarification`
6. `assessment`
7. `recommendation`
8. `summary_offer`
9. `contact_capture`
10. `handoff_offer`
11. `scheduling_capture`
12. `lead_capture`
13. `complete`

These states are used in:
- the conversations table
- conversation detail view
- funnel metrics
- analytics state distribution
- drop-off approximation

## How Metrics Are Calculated

The main calculation logic lives in:
- `apps/api/src/lib/store.ts`

### Overview Metrics

#### Conversations

What it is:
- total number of conversation records

How it is calculated:
- `prisma.conversation.count(...)`

What it tells you:
- top-of-funnel volume
- how much traffic is entering Scout

How to react:
- If low:
  - improve traffic sources
  - place the widget more visibly
  - improve landing page CTAs
- If high but lead conversion is low:
  - the product is getting attention but not converting
  - inspect clarification flow, summary offer, and handoff flow

#### Lead Conversion

What it is:
- percentage of conversations that became leads

How it is calculated:
- `Math.round((leadCount / conversationCount) * 100)`

What it tells you:
- how well Scout turns traffic into handoff opportunities

How to react:
- If low:
  - review summary offer wording
  - review handoff offer timing
  - check whether contact capture is too early or too awkward
  - inspect drop-off states in analytics
- If high:
  - make sure the leads are still good quality
  - check whether Scout is becoming too aggressive about professional help

Working heuristic:
- very low conversion usually means friction, weak trust, or poor traffic quality
- very high conversion can be good, but may also mean over-escalation if severity is inflated

#### High Severity Leads

What it is:
- number of leads with severity `high` or `urgent`

How it is calculated:
- count leads where `severity === "high" || severity === "urgent"`

What it tells you:
- how many serious cases are entering operations

How to react:
- If low:
  - traffic may be low-intent or mild
  - Scout may be under-classifying severity
- If high:
  - make sure operations can handle it
  - prioritize response speed
  - inspect whether severity logic is too aggressive

Important interpretation:
- high severity count by itself is not automatically good or bad
- it becomes more useful when compared with:
  - lead conversion
  - drop-off
  - top pest signals

#### Avg. Urgency Score

What it is:
- average urgency score across leads

How it is calculated:
- average of `lead.urgencyScore`, rounded

What it tells you:
- how intense or time-sensitive the lead mix looks

How to react:
- If low:
  - the product may be attracting informational traffic more than urgent homeowners
  - Scout may be too conservative in scoring
- If high:
  - make sure follow-up operations are fast
  - make sure high-intent incomplete sessions are reviewed

### Severity Mix

What it is:
- count of leads by severity bucket:
  - low
  - medium
  - high
  - urgent

How it is calculated:
- grouped count of leads by `severity`

What it tells you:
- the shape of current lead quality

How to react:
- If mostly low:
  - tighten qualification
  - improve clarifying questions
  - inspect traffic quality
- If mostly medium:
  - Scout may be acting reasonably, but may not be creating enough urgency for handoff
- If mostly high/urgent:
  - good if true, risky if inflated
  - audit transcripts to make sure Scout is not over-escalating

### Recent Qualified Leads

What it is:
- latest 5 leads

How it is calculated:
- `scopedLeads.slice(0, 5)`

What it tells you:
- current operational queue at a glance

How to react:
- use it as a quick sanity check:
  - are pests realistic?
  - are summaries useful?
  - are locations filled?
  - are statuses moving?

### Recent Incomplete Sessions

What it is:
- latest 5 conversations without a lead

How it is calculated:
- conversations filtered where `leadCreated === false`, then sliced

What it tells you:
- what users are currently leaving unfinished

How to react:
- inspect these often
- especially look for:
  - repeated stalls in the same state
  - high urgency with no lead
  - missing contact capture after strong engagement

## Funnel Metrics

The funnel is cumulative. A later stage is a subset of an earlier stage.

Important code:
- `funnelStages` in `apps/api/src/lib/store.ts`

### Started

What it is:
- all conversations that began

States included:
- all current conversation states

What it tells you:
- funnel entry volume

How to react:
- compare this to `Reached assessment`
- a large gap means people are stalling early

### Reached Assessment

What it is:
- conversations that reached `assessment` or beyond

States included:
- `assessment`
- `recommendation`
- `summary_offer`
- `contact_capture`
- `handoff_offer`
- `scheduling_capture`
- `lead_capture`
- `complete`

What it tells you:
- how many users gave enough information for Scout to make a real evaluation

How to react:
- If much lower than `Started`:
  - early intake is too rigid
  - clarification questions may be too repetitive
  - the assistant may not be building trust fast enough

### Summary Offer

What it is:
- conversations that reached `summary_offer` or beyond

States included:
- `summary_offer`
- `contact_capture`
- `handoff_offer`
- `scheduling_capture`
- `lead_capture`
- `complete`

What it tells you:
- how often Scout got to the value-delivery stage

How to react:
- If low relative to `Reached assessment`:
  - Scout may not be transitioning cleanly from assessment to value
  - summary path may be broken
  - assessments may be too vague to trigger summary offering

### Handoff Offer

What it is:
- conversations that reached `handoff_offer` or beyond

States included:
- `handoff_offer`
- `scheduling_capture`
- `lead_capture`
- `complete`

What it tells you:
- how often Scout moved from advice into professional follow-up

How to react:
- If very low:
  - Scout may be too cautious
  - severity or recommendation logic may be too soft
- If very high:
  - Scout may be too pushy
  - audit whether handoff is being offered before value is earned

### Scheduling

What it is:
- conversations that reached `scheduling_capture` or beyond

States included:
- `scheduling_capture`
- `lead_capture`
- `complete`

What it tells you:
- how often handoff intent became concrete follow-up intent

How to react:
- If low relative to `Handoff offer`:
  - the handoff copy may be weak
  - trust may be dropping after Scout asks for contact details
  - the handoff form may still feel heavy

### Complete

What it is:
- conversations whose final state is `complete`

What it tells you:
- the deepest successful funnel completion

How to react:
- If low relative to `Scheduling`:
  - final lead capture is too brittle
  - there may be a logic issue between scheduling capture and lead completion
- If high:
  - review lead quality to make sure completion is meaningful

## Analytics Metrics

### Top Pest Signals

What it is:
- top pest categories from `conversation.suspectedPest`
- if absent, bucketed as `Unconfirmed`

How it is calculated:
- grouped count over all conversations, top 6

What it tells you:
- what problems Scout is seeing most often

How to react:
- If `Unconfirmed` is high:
  - Scout needs better extraction or clarification
  - improve follow-up questions and pest identification
- If one pest dominates:
  - tune summaries and guidance for that pest
  - make sure landing page copy matches real demand

### Model Comparison

What it is:
- performance grouped by `aiProviderUsed` + `aiModelUsed`

Metrics shown:
- conversations
- completed leads
- conversion rate
- average urgency
- high concern count

How it is calculated:
- grouped from conversation runtime snapshots
- `conversionRate = completedLeads / conversations`
- `avgUrgency = average conversation urgencyScore`
- `highSeverityCount = count of high or urgent conversations`

What it tells you:
- which model/provider combinations perform better in the real product

How to react:
- If a model has low conversations:
  - do not over-interpret it yet
- If a model has strong conversion and reasonable urgency:
  - good candidate for default runtime
- If a model has high urgency but poor conversion:
  - it may be sounding too alarming or too confusing
- If a model has good conversion but unusually low urgency:
  - it may be too eager to push people into lead capture

Important note:
- this section is only trustworthy because conversations store the runtime they actually used

### State Distribution

What it is:
- exact count of conversations by current state

What it tells you:
- where the system is currently accumulating conversations

How to react:
- If many pile up in `intake_location`:
  - location question may feel unnatural
- If many pile up in `clarification`:
  - Scout may be too repetitive
  - it may not be accepting out-of-order answers well enough
- If many pile up in `contact_capture`:
  - summary delivery ask may feel too transactional
- If many pile up in `handoff_offer` or `scheduling_capture`:
  - professional-help trust or availability capture may need improvement

### Drop-Off Approximation

What it is:
- incomplete conversations grouped by their current state

Shown per state:
- count
- average urgency
- high severity count

Important limitation:
- this is not true time-based abandonment yet
- it is a current-state approximation only

What it tells you:
- where incomplete conversations are sitting right now

How to react:
- High count + low urgency:
  - may be normal exploration traffic
- High count + high urgency:
  - important missed opportunity
  - review this state first
- High severity count in advanced states:
  - handoff process likely needs polishing

### High-Intent Incomplete

What it is:
- incomplete conversations that either:
  - have high/urgent severity
  - or reached advanced states like assessment, recommendation, summary offer, handoff, scheduling, or lead capture

How it is calculated:
- filtered incomplete conversations, top 10

What it tells you:
- best missed-opportunity bucket

How to react:
- audit these first during product review
- ask:
  - where did trust drop?
  - did Scout become repetitive?
  - did it ask for contact too soon?
  - did the handoff feel too pushy?

## Operational Views And What They Are For

### Conversations Table

Use this when you want to understand:
- exact drop-off location
- whether a lead was created
- what severity/state/source combinations are appearing

Best uses:
- debugging new conversation flow changes
- checking whether a specific runtime causes more stalls
- finding incomplete high-intent conversations

### Conversation Detail

Use this when you want to inspect:
- full transcript
- captured contact data
- current state
- linked lead status

Best uses:
- transcript QA
- severity review
- handoff review
- prompt tuning

### Leads Table

Use this when you want to:
- work active lead queue
- filter by status or severity
- find a lead by display ID, pest, or location

Best uses:
- operations workflow
- contact follow-up
- triage by severity

### Lead Detail

Use this when you want to:
- update lead status
- inspect transcript behind the lead
- understand why Scout qualified the case

Best uses:
- sales or ops review
- validating lead quality
- checking whether transcript and lead summary align

## Runtime Control

The overview page also includes the Scout runtime selector.

What it does:
- lets you choose provider and model for new conversations
- shows the current active runtime
- shows the curated model catalog grouped by provider and strength

Important detail:
- changing runtime affects new conversations
- old conversations keep their saved runtime snapshot

This is useful for:
- model comparison testing
- quota workarounds
- switching to faster backup models

## Recommended Dashboard Review Routine

A practical daily or testing workflow:

1. Check the overview page
- look at conversations, lead conversion, high severity leads, and avg urgency

2. Check the funnel
- compare `Started` to `Reached assessment`
- compare `Handoff offer` to `Scheduling`
- compare `Scheduling` to `Complete`

3. Check analytics
- inspect drop-off approximation
- inspect high-intent incomplete
- inspect model comparison

4. Check conversations
- filter by stalled states
- read transcripts where users stopped

5. Check leads
- update statuses
- confirm transcript quality
- confirm lead summaries are useful

## Current Limitations

A few important dashboard limits today:

- drop-off is approximate, not true time-based abandonment
- no internal notes yet
- no tenant switcher UI yet
- no automated follow-up or CRM sync yet
- no time-series charts yet
- no alerting yet

## Best Next Dashboard Improvements

If we extend the dashboard from here, the strongest next steps are:

1. true time-based abandonment tracking
2. alerts for high-intent incomplete conversations
3. model comparison over time, not just grouped totals
4. notes and richer lead ops workflow
5. tenant switching and tenant-specific analytics

## Code References

Current dashboard UI:
- `apps/dashboard/app/page.tsx`
- `apps/dashboard/app/analytics/page.tsx`
- `apps/dashboard/app/conversations/page.tsx`
- `apps/dashboard/app/conversations/[conversationId]/page.tsx`
- `apps/dashboard/app/leads/page.tsx`
- `apps/dashboard/app/leads/[leadId]/page.tsx`

Current API aggregation logic:
- `apps/api/src/lib/store.ts`

Current dashboard API client:
- `apps/dashboard/lib/scout-api.ts`
