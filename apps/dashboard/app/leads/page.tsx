import Link from "next/link"
import { getLeads } from "@/lib/scout-api"
import { requireDashboardSession } from "@/lib/auth"
import { getDashboardTenantId } from "@/lib/tenant-selection"
import type { LeadFilters, LeadStatus, SeverityLevel } from "@scout/types"

const statusOptions: Array<LeadStatus | ""> = ["", "new", "review", "contacted", "closed"]
const severityOptions: Array<SeverityLevel | ""> = ["", "low", "medium", "high", "urgent"]

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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireDashboardSession()
  const tenantId = await getDashboardTenantId()

  const params = await searchParams
  const filters: LeadFilters = {
    tenantId,
    search: typeof params.search === "string" ? params.search : undefined,
    status: typeof params.status === "string" ? (params.status as LeadStatus) : undefined,
    severity:
      typeof params.severity === "string" ? (params.severity as SeverityLevel) : undefined,
  }

  const leads = await getLeads(filters)

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Lead Operations</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                Work the queue, review transcripts, and update lead status.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f7176]">
                Phase 2A turns Scout’s dashboard into an operational workspace for qualifying and following up on leads.
              </p>
            </div>

            <div className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#5f7176]">
              Work the queue from here
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Search</span>
              <input
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="LEAD-ABC123, name, pest, summary, city..."
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Status</span>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
              >
                {statusOptions.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option ? formatStatusLabel(option) : "All statuses"}
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

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-full bg-[#1d8f6a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#187558]"
              >
                Apply filters
              </button>
              <Link
                href="/leads"
                className="rounded-full border border-[#d7e0e3] bg-white px-5 py-3 text-sm font-semibold text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          {leads.length ? (
            leads.map((lead) => (
              <article
                key={lead.id}
                className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.06em] text-[#132226]">
                        {lead.displayId}
                      </span>
                      <span className="rounded-full bg-[#fff3e4] px-3 py-1 text-xs font-medium text-[#9a6200]">
                        {formatSeverityLabel(lead.severity)}
                      </span>
                      <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                        {formatStatusLabel(lead.status)}
                      </span>
                      <span className="text-xs text-[#7b8b90]">Urgency {lead.urgencyScore}/100</span>
                    </div>

                    <h2 className="mt-4 text-xl font-semibold text-[#132226]">
                      {lead.name} · {lead.suspectedPest ?? "Unconfirmed pest"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#5f7176]">{lead.summary}</p>
                  </div>

                  <div className="text-right text-sm text-[#5f7176]">
                    <p>{[lead.city, lead.region].filter(Boolean).join(", ") || "Location pending"}</p>
                    <p className="mt-1">{formatDate(lead.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#eef2f3] pt-5">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#5f7176]">
                    <span>{lead.email ?? "No email provided"}</span>
                    <span>{lead.phone ?? "No phone provided"}</span>
                  </div>

                  <Link
                    href={`/leads/${lead.id}`}
                    className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#1d8f6a] hover:text-[#1d8f6a]"
                  >
                    Open lead
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-6 text-sm leading-6 text-[#5f7176]">
              No leads matched the current filters yet.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
