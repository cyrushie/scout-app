import Link from "next/link"
import { getConversations } from "@/lib/scout-api"
import { requireDashboardSession } from "@/lib/auth"
import type {
  ConversationFilters,
  ConversationStatus,
  SeverityLevel,
  SourceChannel,
} from "@scout/types"

const statusOptions: Array<ConversationStatus | ""> = [
  "",
  "intake_issue",
  "intake_location",
  "intake_name_optional",
  "clarification",
  "assessment",
  "recommendation",
  "summary_offer",
  "contact_capture",
  "handoff_offer",
  "scheduling_capture",
  "lead_capture",
  "complete",
]
const severityOptions: Array<SeverityLevel | ""> = ["", "low", "medium", "high", "urgent"]
const sourceOptions: Array<SourceChannel | ""> = ["", "web", "widget", "dashboard"]

function formatSeverityLabel(severity: SeverityLevel) {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatStatusLabel(status: ConversationStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatSourceLabel(source: SourceChannel) {
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireDashboardSession()

  const params = await searchParams
  const filters: ConversationFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    status: typeof params.status === "string" ? (params.status as ConversationStatus) : undefined,
    severity:
      typeof params.severity === "string" ? (params.severity as SeverityLevel) : undefined,
    source: typeof params.source === "string" ? (params.source as SourceChannel) : undefined,
    leadCreated:
      typeof params.leadCreated === "string"
        ? params.leadCreated === "true"
        : undefined,
  }

  const conversations = await getConversations(filters)

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Conversations</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                See all Scout sessions, including incomplete conversations and drop-off points.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f7176]">
                This view shows the broader product funnel, not just completed leads. Use it to understand where users stop, what states they reach, and which high-intent sessions may need attention.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/analytics"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Open analytics
              </Link>
              <Link
                href="/"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Back to overview
              </Link>
              <Link
                href="/leads"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Open lead ops
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_0.8fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Search</span>
              <input
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="conversation id, pest, location, name..."
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">State</span>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              >
                {statusOptions.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option ? formatStatusLabel(option) : "All states"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Severity</span>
              <select
                name="severity"
                defaultValue={filters.severity ?? ""}
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              >
                {severityOptions.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option ? formatSeverityLabel(option) : "All severities"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Source</span>
              <select
                name="source"
                defaultValue={filters.source ?? ""}
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              >
                {sourceOptions.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option ? formatSourceLabel(option) : "All sources"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Lead</span>
              <select
                name="leadCreated"
                defaultValue={
                  typeof filters.leadCreated === "boolean" ? String(filters.leadCreated) : ""
                }
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              >
                <option value="">All conversations</option>
                <option value="false">No lead yet</option>
                <option value="true">Lead created</option>
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-full bg-[#1d8f6a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#187558]"
              >
                Apply filters
              </button>
              <Link
                href="/conversations"
                className="rounded-full border border-[#d7e0e3] bg-white px-5 py-3 text-sm font-semibold text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          {conversations.length ? (
            conversations.map((conversation) => (
              <article
                key={conversation.id}
                className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.06em] text-[#132226]">
                        {conversation.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                        {formatStatusLabel(conversation.status)}
                      </span>
                      <span className="rounded-full bg-[#fff3e4] px-3 py-1 text-xs font-medium text-[#9a6200]">
                        {formatSeverityLabel(conversation.severity)}
                      </span>
                      <span className="rounded-full bg-[#ecf7f2] px-3 py-1 text-xs font-medium text-[#1d8f6a]">
                        {conversation.leadCreated ? "Lead created" : "No lead yet"}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-semibold text-[#132226]">
                      {conversation.preferredName ?? "Anonymous"} · {conversation.suspectedPest ?? "Still assessing"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#5f7176]">
                      {[conversation.city, conversation.region].filter(Boolean).join(", ") || "Location pending"} ·{" "}
                      {formatSourceLabel(conversation.source)} · {conversation.messageCount} messages
                    </p>
                  </div>

                  <div className="text-right text-sm text-[#5f7176]">
                    <p>Urgency {conversation.urgencyScore}/100</p>
                    <p className="mt-1">{formatDate(conversation.updatedAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#eef2f3] pt-5">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#5f7176]">
                    <span>{conversation.summaryEmail ?? "No email"}</span>
                    <span>{conversation.summaryPhone ?? "No phone"}</span>
                    {conversation.leadId ? <span>Lead: {conversation.leadId.slice(-8).toUpperCase()}</span> : null}
                  </div>

                  <div className="flex items-center gap-3">
                    {conversation.leadId ? (
                      <Link
                        href={`/leads/${conversation.leadId}`}
                        className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#1d8f6a] hover:text-[#1d8f6a]"
                      >
                        Open lead
                      </Link>
                    ) : null}
                    <Link
                      href={`/conversations/${conversation.id}`}
                      className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#1d8f6a] hover:text-[#1d8f6a]"
                    >
                      Open conversation
                    </Link>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-6 text-sm leading-6 text-[#5f7176]">
              No conversations matched the current filters yet.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
