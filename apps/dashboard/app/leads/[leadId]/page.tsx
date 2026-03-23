import Link from "next/link"
import { notFound } from "next/navigation"
import { requireDashboardSession } from "@/lib/auth"
import { getLeadDetail } from "@/lib/scout-api"
import { saveLeadOps } from "./actions"
import type { LeadStatus, SeverityLevel } from "@scout/types"

const statusOptions: LeadStatus[] = ["new", "review", "contacted", "closed"]

function formatSeverityLabel(severity: SeverityLevel) {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatStatusLabel(status: LeadStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  await requireDashboardSession()

  const { leadId } = await params

  let lead
  try {
    lead = await getLeadDetail(leadId)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Lead Detail</p>
              <p className="mt-3 inline-flex rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#132226]">
                {lead.displayId}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                {lead.name} · {lead.suspectedPest ?? "Unconfirmed pest"}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f7176]">{lead.summary}</p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/leads"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Back to leads
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <div className="grid gap-6">
            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Lead Snapshot</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#fff3e4] px-3 py-1 text-xs font-medium text-[#9a6200]">
                  {formatSeverityLabel(lead.severity)}
                </span>
                <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                  {formatStatusLabel(lead.status)}
                </span>
                <span className="rounded-full bg-[#ecf7f2] px-3 py-1 text-xs font-medium text-[#1d8f6a]">
                  Urgency {lead.urgencyScore}/100
                </span>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="text-[#7b8b90]">Lead ID</dt>
                  <dd className="mt-1 text-[#132226]">{lead.displayId}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Created</dt>
                  <dd className="mt-1 text-[#132226]">{formatDate(lead.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Location</dt>
                  <dd className="mt-1 text-[#132226]">
                    {[lead.city, lead.region].filter(Boolean).join(", ") || "Location pending"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Email</dt>
                  <dd className="mt-1 text-[#132226]">{lead.email ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Phone</dt>
                  <dd className="mt-1 text-[#132226]">{lead.phone ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Preferred contact</dt>
                  <dd className="mt-1 text-[#132226]">{lead.preferredContactMethod ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Availability</dt>
                  <dd className="mt-1 text-[#132226]">{lead.availabilityNotes ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-[#7b8b90]">Conversation ID</dt>
                  <dd className="mt-1 break-all text-[#132226]">{lead.conversationId}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Lead Ops</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Status management</h2>

              <form action={saveLeadOps} className="mt-6 space-y-4">
                <input type="hidden" name="leadId" value={lead.id} />

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#132226]">Status</span>
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="rounded-full bg-[#1d8f6a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#187558]"
                >
                  Save changes
                </button>
              </form>
            </article>
          </div>

          <div className="grid gap-6">
            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Conversation Transcript</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Why Scout qualified this lead</h2>

              <div className="mt-6 space-y-3">
                {lead.messages.map((message) => (
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

            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Conversation State</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Current Scout assessment</h2>

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <dt className="text-[#7b8b90]">Status</dt>
                  <dd className="mt-1 font-medium text-[#132226]">{lead.conversation.status}</dd>
                </div>
                <div className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <dt className="text-[#7b8b90]">Source</dt>
                  <dd className="mt-1 font-medium text-[#132226]">{lead.conversation.source}</dd>
                </div>
                <div className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <dt className="text-[#7b8b90]">Severity</dt>
                  <dd className="mt-1 font-medium text-[#132226]">{lead.conversation.severity}</dd>
                </div>
                <div className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <dt className="text-[#7b8b90]">Suspected pest</dt>
                  <dd className="mt-1 font-medium text-[#132226]">
                    {lead.conversation.suspectedPest ?? "Still assessing"}
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
