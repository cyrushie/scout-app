"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, LoaderCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  type ChatMessageItem,
  sendMessage,
  startConversation,
  submitLead,
} from "@/lib/scout-api"
import type { LeadRecord, MessageResponse, SeverityAssessment } from "@scout/types"

const hiddenAssessmentStates = new Set([
  "intake",
  "intake_issue",
  "intake_location",
  "intake_name_optional",
])
const leadCaptureStates = new Set([
  "scheduling_capture",
  "lead_capture",
])

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

function buildAssessmentSummary(assessment: SeverityAssessment) {
  if (assessment.recommendedAction === "urgent_professional_help") {
    return "Scout thinks this may be urgent and professional help is the safest next step."
  }

  if (assessment.professionalHelpRecommended || assessment.recommendedAction === "professional_help") {
    if (assessment.suspectedPest) {
      return `Scout is leaning toward ${assessment.suspectedPest.toLowerCase()} and thinks this may need professional attention.`
    }

    return "Scout thinks this may need professional attention based on what has been shared so far."
  }

  if (assessment.recommendedAction === "collect_more_context") {
    if (assessment.suspectedPest) {
      return `Scout is leaning toward ${assessment.suspectedPest.toLowerCase()}, but a little more detail will help confirm the next step.`
    }

    return "Scout is still narrowing this down and needs a bit more context to guide the next step."
  }

  if (assessment.suspectedPest) {
    if (assessment.severity === "medium") {
      return `Scout thinks this may be related to ${assessment.suspectedPest.toLowerCase()} and sees signs that it may be more than a one-off issue.`
    }

    return `Scout thinks this may be related to ${assessment.suspectedPest.toLowerCase()} and does not see strong urgency so far.`
  }

  if (assessment.severity === "medium") {
    return "Scout sees signs that this may be more than a one-off issue, but it does not look highly urgent yet."
  }

  return "Scout is still narrowing this down based on the signs shared so far."
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1 rounded-[24px] border border-black/6 bg-[#f7f7f7] px-4 py-4 text-[#6b6b6b] shadow-sm">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-bounce [animation-duration:1s]"
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-bounce [animation-duration:1s]"
          style={{ animationDelay: "0.14s" }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-bounce [animation-duration:1s]"
          style={{ animationDelay: "0.28s" }}
        />
      </div>
    </div>
  )
}

function SummaryCard({
  assessment,
  collapsed,
  onToggle,
}: {
  assessment: SeverityAssessment
  collapsed: boolean
  onToggle: () => void
}) {
  if (collapsed) {
    return (
      <section className="rounded-[22px] border border-black/6 bg-[#f7f7f7] px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
            <p className="mt-1 text-sm text-foreground">
              {formatConcernLabel(assessment.severity)} · {assessment.suspectedPest ?? "Still assessing"}
            </p>
          </div>
          <Button type="button" variant="outline" className="rounded-full border-black/10 px-3 text-xs" onClick={onToggle}>
            Show
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[22px] border border-black/6 bg-[#f7f7f7] px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
        <Button type="button" variant="outline" className="rounded-full border-black/10 px-3 text-xs" onClick={onToggle}>
          Hide
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-white">
          {formatConcernLabel(assessment.severity)}
        </span>
        <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-[11px] font-medium text-foreground">
          {assessment.suspectedPest ?? "Still assessing"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{buildAssessmentSummary(assessment)}</p>
    </section>
  )
}

export function ScoutChat() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [draft, setDraft] = useState("")
  const [isBooting, setIsBooting] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<MessageResponse | null>(null)
  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [leadState, setLeadState] = useState({
    name: "",
    email: "",
    phone: "",
    availabilityNotes: "",
    city: "",
    region: "",
  })
  const [summaryCollapsed, setSummaryCollapsed] = useState(false)
  const [leadCollapsed, setLeadCollapsed] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      try {
        const response = await startConversation()

        if (!isMounted) return

        setConversationId(response.conversation.id)
        setMessages([
          {
            id: `${response.conversation.id}-greeting`,
            role: "assistant",
            content: response.greeting,
          },
        ])
        setLeadState((current) => ({
          ...current,
          name: response.conversation.preferredName ?? current.name,
          email: response.conversation.summaryEmail ?? current.email,
          phone: response.conversation.summaryPhone ?? current.phone,
          availabilityNotes: response.conversation.availabilityNotes ?? current.availabilityNotes,
          city: response.conversation.city ?? current.city,
          region: response.conversation.region ?? current.region,
        }))
      } catch {
        if (!isMounted) return
        setError("Scout could not start a conversation right now.")
      } finally {
        if (isMounted) {
          setIsBooting(false)
        }
      }
    }

    void bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [messages, error, lastResponse, lead, isSending, summaryCollapsed, leadCollapsed])

  const assessment = lastResponse?.assessment
  const shouldShowAssessment =
    Boolean(assessment) &&
    !hiddenAssessmentStates.has(lastResponse?.conversation.status ?? "intake")
  const canShowLeadForm =
    shouldShowAssessment &&
    leadCaptureStates.has(lastResponse?.conversation.status ?? "intake") &&
    !lead &&
    Boolean(lastResponse?.assessment.professionalHelpRecommended) &&
    Boolean(conversationId)

  const summary = useMemo(() => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content

    if (!assessment || !lastUserMessage) {
      return ""
    }

    return `${lastUserMessage} Severity: ${assessment.severity}. Recommended action: ${assessment.recommendedAction}.`
  }, [assessment, messages])

  async function handleSendMessage() {
    const trimmed = draft.trim()

    if (!trimmed || !conversationId || isSending) {
      return
    }

    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    }

    setMessages((current) => [...current, userMessage])
    setDraft("")
    setIsSending(true)
    setError(null)

    try {
      const response = await sendMessage(conversationId, trimmed)

      setLastResponse(response)
      setLeadState((current) => ({
        ...current,
        name: response.conversation.preferredName ?? current.name,
        email: response.conversation.summaryEmail ?? current.email,
        phone: response.conversation.summaryPhone ?? current.phone,
        availabilityNotes: response.conversation.availabilityNotes ?? current.availabilityNotes,
        city: response.conversation.city ?? current.city,
        region: response.conversation.region ?? current.region,
      }))
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.assistantMessage,
        },
      ])
    } catch {
      setError("Scout could not process that message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  async function handleLeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!conversationId || !assessment || !leadState.name.trim()) {
      return
    }

    setError(null)

    try {
      const response = await submitLead({
        conversationId,
        name: leadState.name.trim(),
        email: leadState.email.trim() || undefined,
        phone: leadState.phone.trim() || undefined,
        preferredContactMethod: leadState.phone.trim()
          ? "phone"
          : leadState.email.trim()
            ? "email"
            : undefined,
        availabilityNotes: leadState.availabilityNotes.trim() || undefined,
        city: leadState.city.trim() || undefined,
        region: leadState.region.trim() || undefined,
        suspectedPest: assessment.suspectedPest ?? undefined,
        severity: assessment.severity,
        urgencyScore: assessment.urgencyScore,
        summary,
      })

      setLead(response)
    } catch {
      setError("Scout could not save your contact details right now.")
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_100%)]">
      <header className="sticky top-0 z-20 border-b border-black/6 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Scout</p>
            <h1 className="mt-1 text-base font-semibold text-foreground sm:text-lg">Pest guidance chat</h1>
          </div>
          <Button asChild variant="ghost" className="rounded-full px-3 text-sm text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6">
          <div className="flex-1 py-8 sm:py-10">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {!assessment && !isBooting ? (
                <section className="rounded-[28px] border border-black/6 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Describe what you are seeing.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Keep it simple. Droppings, bites, odors, scratching sounds, damage, or where the activity is happening are all helpful.
                  </p>
                </section>
              ) : null}

              {shouldShowAssessment ? (
                <SummaryCard
                  assessment={assessment!}
                  collapsed={summaryCollapsed}
                  onToggle={() => setSummaryCollapsed((current) => !current)}
                />
              ) : null}

              {isBooting ? (
                <div className="flex items-center gap-3 rounded-[22px] border border-black/6 bg-white px-4 py-4 text-sm text-muted-foreground shadow-sm">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Starting Scout...
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex", message.role === "assistant" ? "justify-start" : "justify-end")}
                >
                  <article
                    className={cn(
                      "max-w-[85%] rounded-[24px] px-4 py-3 text-[15px] leading-7 shadow-sm sm:max-w-[78%]",
                      message.role === "assistant"
                        ? "border border-black/6 bg-[#f7f7f7] text-foreground"
                        : "bg-black text-white",
                    )}
                  >
                    {message.content}
                  </article>
                </div>
              ))}

              {isSending ? <TypingIndicator /> : null}

              {lead ? (
                <section className="rounded-[24px] border border-black/6 bg-white px-5 py-5 shadow-sm">
                  <p className="text-sm font-medium text-foreground">Professional follow-up requested.</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Scout saved your details for follow-up. Lead ID: <span className="font-medium text-foreground">{lead.id}</span>
                  </p>
                </section>
              ) : null}

              {canShowLeadForm ? (
                leadCollapsed ? (
                  <section className="rounded-[22px] border border-black/6 bg-[#f7f7f7] px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Professional Help</p>
                        <p className="mt-1 text-sm text-foreground">Follow-up form is ready if needed.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-black/10 px-3 text-xs"
                        onClick={() => setLeadCollapsed(false)}
                      >
                        Show
                      </Button>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-[24px] border border-black/6 bg-white px-5 py-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Professional Help</p>
                        <h2 className="mt-2 text-lg font-semibold text-foreground">Need professional help?</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">Leave a few details for follow-up.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-black/10 px-3 text-xs"
                        onClick={() => setLeadCollapsed(true)}
                      >
                        Hide
                      </Button>
                    </div>
                    <form className="mt-4 space-y-3" onSubmit={(event) => void handleLeadSubmit(event)}>
                      <Input
                        placeholder="Name"
                        value={leadState.name}
                        onChange={(event) => setLeadState((current) => ({ ...current, name: event.target.value }))}
                        className="h-10 rounded-2xl border-black/10 bg-[#fbfbfb] shadow-none"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          placeholder="Email"
                          value={leadState.email}
                          onChange={(event) => setLeadState((current) => ({ ...current, email: event.target.value }))}
                          className="h-10 rounded-2xl border-black/10 bg-[#fbfbfb] shadow-none"
                        />
                        <Input
                          placeholder="Phone"
                          value={leadState.phone}
                          onChange={(event) => setLeadState((current) => ({ ...current, phone: event.target.value }))}
                          className="h-10 rounded-2xl border-black/10 bg-[#fbfbfb] shadow-none"
                        />
                      </div>
                      <Textarea
                        placeholder="Preferred day or time"
                        value={leadState.availabilityNotes}
                        onChange={(event) =>
                          setLeadState((current) => ({ ...current, availabilityNotes: event.target.value }))
                        }
                        className="min-h-24 rounded-2xl border-black/10 bg-[#fbfbfb] shadow-none"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          placeholder="City"
                          value={leadState.city}
                          onChange={(event) => setLeadState((current) => ({ ...current, city: event.target.value }))}
                          className="h-10 rounded-2xl border-black/10 bg-[#fbfbfb] shadow-none"
                        />
                        <Input
                          placeholder="State"
                          value={leadState.region}
                          onChange={(event) => setLeadState((current) => ({ ...current, region: event.target.value }))}
                          className="h-10 rounded-2xl border-black/10 bg-[#fbfbfb] shadow-none"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-muted-foreground">Only used for follow-up.</p>
                        <Button type="submit" className="rounded-full bg-black px-5 text-white hover:bg-black/90">
                          Share
                        </Button>
                      </div>
                    </form>
                  </section>
                )
              ) : null}

              {error ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {lastResponse?.mode === "fallback" ? (
                <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Scout is using its backup mode right now. Restart the API if you recently changed the AI key or model.
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 z-20 border-t border-black/6 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-black/8 bg-white p-3 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] sm:p-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSendMessage()
                }
              }}
              placeholder="What signs are you noticing?"
              className="min-h-24 resize-none border-0 bg-transparent px-1 text-[15px] shadow-none focus-visible:ring-0"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Press Enter to send</p>
              <Button
                type="button"
                className="rounded-full bg-black px-5 text-white hover:bg-black/90"
                disabled={!draft.trim() || !conversationId || isSending}
                onClick={() => void handleSendMessage()}
              >
                {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
