import Link from "next/link"
import { notFound } from "next/navigation"
import { requireDashboardSession } from "@/lib/auth"
import { getConversationDetail } from "@/lib/scout-api"
import type { SeverityLevel, SourceChannel } from "@scout/types"

function formatSeverityLabel(severity: SeverityLevel) {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatSourceLabel(source: SourceChannel) {
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  await requireDashboardSession()

  const { conversationId } = await params

  let detail
  try {
    detail = await getConversationDetail(conversationId)
  } catch {
    notFound()
  }

  const { conversation, messages, lead } = detail

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Conversation Detail</p>
              <p className="mt-3 inline-flex rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#132226]">
                {conversation.id}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                {conversation.preferredName ?? "Anonymous"} · {conversation.suspectedPest ?? "Still assessing"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f7176]">
                This view shows the full Scout session, current state, captured contact details, and whether the conversation turned into a lead.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/conversations"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Back to conversations
              </Link>
              {lead ? (
                <Link
                  href={`/leads/${lead.id}`}
                  className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
                >
                  Open linked lead
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <div className="grid gap-6">
            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Conversation Snapshot</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                  {formatStatusLabel(conversation.status)}
                </span>
                <span className="rounded-full bg-[#fff3e4] px-3 py-1 text-xs font-medium text-[#9a6200]">
                  {formatSeverityLabel(conversation.severity)}
                </span>
                <span className="rounded-full bg-[#ecf7f2] px-3 py-1 text-xs font-medium text-[#1d8f6a]">
                  {lead ? "Lead created" : "No lead yet"}
                </span>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="text-[#7b8b90]">Updated</dt>
                  <dd className="mt-1 text-[#132226]">{formatDate(conversation.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Source</dt>
                  <dd className="mt-1 text-[#132226]">{formatSourceLabel(conversation.source)}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Urgency</dt>
                  <dd className="mt-1 text-[#132226]">{conversation.urgencyScore}/100</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Location</dt>
                  <dd className="mt-1 text-[#132226]">
                    {[conversation.city, conversation.region].filter(Boolean).join(", ") || "Location pending"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Summary email</dt>
                  <dd className="mt-1 text-[#132226]">{conversation.summaryEmail ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Summary phone</dt>
                  <dd className="mt-1 text-[#132226]">{conversation.summaryPhone ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Preferred contact</dt>
                  <dd className="mt-1 text-[#132226]">{conversation.preferredContactMethod ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Availability</dt>
                  <dd className="mt-1 text-[#132226]">{conversation.availabilityNotes ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Linked lead</dt>
                  <dd className="mt-1 text-[#132226]">{lead ? lead.displayId : "No lead created"}</dd>
                </div>
              </dl>
            </article>
          </div>

          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Conversation Transcript</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Full Scout session</h2>

            <div className="mt-6 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-[#132226] text-white"
                      : "border border-[#e5ecee] bg-[#fbfcfc] text-[#132226]"
                  }`}
                >
                  <p className="mb-1 text-[11px] uppercase tracking-[0.12em] opacity-60">
                    {message.role}
                  </p>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
