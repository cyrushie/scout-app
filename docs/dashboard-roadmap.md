# Scout Dashboard Roadmap

This document captures the current dashboard state, the next dashboard ideas we discussed, and the dependency on Scout's upcoming conversation-flow upgrade.

## Current Position

The dashboard already supports:
- overview metrics
- recent lead queue
- severity mix
- dashboard auth
- lead operations list
- lead detail view
- transcript view
- lead status updates
- human-friendly lead display IDs like `LEAD-ABC123`

Current operational pages:
- dashboard overview
- leads list
- lead detail

## Important Product Dependency

Before building the next analytics-heavy dashboard features, we should first upgrade Scout's conversation flow and state machine.

Why:
- many of the best dashboard metrics depend on richer conversation states
- we need to know not just that a chat exists, but how far the user got
- we want to measure drop-off, handoff acceptance, summary acceptance, and scheduling intent

So the current recommendation is:

1. Upgrade Scout's conversation flow first
2. Introduce the richer intake/handoff states
3. Persist those states properly on conversations
4. Then build the next dashboard analytics layer

Primary reference for that flow upgrade:
- [scout-conversation-flow-v2.md](/home/cyrus/Desktop/webdev/scout-app/docs/scout-conversation-flow-v2.md)

## Planned Future Conversation States

These are the proposed states the dashboard should eventually rely on:

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

These are more expressive than the current simpler state model and will make the dashboard much more useful.

In the v2 flow, these states should be treated as internal objectives rather than user-visible scripted steps.

## Why These States Matter For Analytics

Once the richer states exist, the dashboard will be able to answer:
- how many users start a conversation
- how many provide location
- how many reach assessment
- how many accept a summary by email or phone
- how many accept professional help
- how many provide scheduling information
- how many fully complete the handoff flow
- where users most often drop off

That is much more valuable than only measuring completed leads.

## Planned Dashboard Direction

We discussed separating the dashboard into two core data areas:

### 1. Leads

This should remain the operational queue for:
- completed or lead-ready handoff cases
- sales/ops work
- follow-up and status management

This area should focus on:
- lead detail
- transcript
- contact info
- severity
- urgency
- lead status

### 2. Conversations

This should become a broader product/funnel view that includes:
- all conversations
- complete and incomplete sessions
- current conversation state
- drop-off analysis
- severity at time of exit
- whether a lead was created

This is where we can understand product effectiveness, not just lead ops.

## Recommendation: Keep Leads And Conversations Separate

We explicitly do **not** want to mix incomplete conversations into the lead queue by default.

Recommended structure:

- `Leads`
  - only operational lead records
  - used for handoff, follow-up, and ops

- `Conversations`
  - all sessions, including incomplete ones
  - used for funnel analysis and product debugging

Why this separation is better:
- the lead queue stays clean
- incomplete conversations do not pollute sales operations
- product analytics still sees everything
- we can compare complete vs incomplete behavior more clearly

## Planned Dashboard Navigation

Recommended future dashboard sections:

1. `Overview`
2. `Conversations`
3. `Leads`
4. `Analytics`

### Overview

Should show:
- total conversations
- completed leads
- lead conversion rate
- average urgency
- high-severity conversations
- drop-off rate
- recent leads
- recent incomplete conversations

### Conversations

Should show all conversation records, including incomplete ones.

Useful columns:
- conversation id
- current state
- suspected pest
- severity
- urgency
- source
- created at
- last activity
- lead created? yes/no

Useful filters:
- conversation state
- severity
- source
- date range
- tenant
- lead created / no lead
- suspected pest

### Conversation Detail

Should show:
- full transcript
- current state
- severity and urgency
- suspected pest
- recommended action
- whether professional help was offered
- whether contact capture happened
- whether a lead was created

### Leads

Should remain the main operations queue.

Useful filters:
- lead status
- severity
- tenant
- date range
- suspected pest
- search by lead ID, name, or location

### Lead Detail

Should show:
- contact details
- transcript
- conversation summary
- severity
- urgency
- lead status controls
- scheduling fields later

### Analytics

Should focus on funnel and performance analysis.

## Planned Metrics Once Richer States Exist

### Funnel Metrics

- `Conversation Starts`
- `Reached Assessment`
- `Reached Summary Offer`
- `Accepted Summary Delivery`
- `Reached Handoff Offer`
- `Accepted Professional Help`
- `Reached Scheduling Capture`
- `Completed Leads`

### Conversion Metrics

- `Conversation -> Assessment Rate`
- `Assessment -> Handoff Rate`
- `Handoff -> Complete Rate`
- `Conversation -> Lead Rate`
- `Summary Offer Acceptance Rate`
- `Professional Help Acceptance Rate`

### Severity Metrics

- `Average Urgency Score`
- `High Severity Conversations`
- `High Severity Leads`
- `Severity Mix By Final State`
- `Severity Mix By Tenant`
- `Severity Mix By Source`

### Drop-Off Metrics

- `Most Common Drop-Off State`
- `Drop-Off Count By State`
- `Drop-Off Rate By State`
- `Average Severity At Drop-Off`
- `Average Urgency At Drop-Off`

### Opportunity Metrics

- `High Severity But Incomplete Conversations`
- `Reached Handoff Offer But Did Not Complete`
- `Assessment Reached But No Contact Captured`

These "missed opportunity" metrics are especially valuable.

## High-Value Future Dashboard Views

### 1. Funnel Card

Visual progression:

- started
- clarified
- assessed
- offered summary
- offered handoff
- scheduling captured
- complete

### 2. Drop-Off By State

This should show where people stop most often.

Example questions it should answer:
- Are users leaving at location capture?
- Are users leaving when contact info is requested?
- Are users accepting professional help but not sharing availability?

### 3. High-Intent Incomplete Conversations

This should show users who:
- reached `assessment` or `handoff_offer`
- had `high` or `urgent` severity
- but never completed the lead

These are potentially valuable missed leads.

### 4. Conversation State Distribution

This should show how many current conversations sit in:
- `clarification`
- `assessment`
- `summary_offer`
- `handoff_offer`
- etc.

## Phased Dashboard Plan

### Already Built

- overview
- lead queue
- lead detail
- transcript
- lead status updates
- display IDs

### Next, But Delayed Until Scout Flow Update

- conversations list page
- conversation detail page
- filter by conversation state
- funnel analytics
- drop-off analytics
- incomplete conversation tracking

### After New States Are Live

Build in this order:

1. conversation list page
2. conversation detail page
3. overview funnel metrics
4. analytics page
5. missed-opportunity views

## Immediate Recommendation

Do not build the next analytics layer yet.

Instead:

1. update Scout's conversation flow
2. implement the richer state machine
3. persist those richer states
4. return to the dashboard once the new data exists

That will prevent us from building analytics on top of a state model that is about to change.
