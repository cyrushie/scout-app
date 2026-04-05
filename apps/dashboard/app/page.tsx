import Link from "next/link"
import { saveAiRuntime } from "./actions"
import {
  ALL_AI_PROVIDERS,
  buildRuntimeSelectionValue,
  findRuntimeCatalogEntry,
  PROVIDER_LABELS,
  RUNTIME_MODEL_CATALOG,
  TIER_LABELS,
  type RuntimeAvailability,
  type RuntimeTier,
} from "@/lib/runtime-catalog"
import { getAiRuntimeConfig, getAnalyticsOverview } from "@/lib/scout-api"
import { requireDashboardSession } from "@/lib/auth"
import { getDashboardTenantId } from "@/lib/tenant-selection"
import type { AiProvider, AnalyticsOverview, DashboardMetric, LeadStatus, SeverityLevel } from "@scout/types"
import { AlertTriangle, ArrowUpRight, CircleDot, Users } from "lucide-react"

const metricIcons: Record<DashboardMetric["key"], typeof CircleDot> = {
  conversations: CircleDot,
  "lead-conversion": Users,
  "high-severity-leads": AlertTriangle,
  "avg.-urgency-score": ArrowUpRight,
}

function formatSeverityLabel(severity: SeverityLevel) {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

function formatStatusLabel(status: LeadStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatConversationStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatProviderLabel(provider: AiProvider) {
  return PROVIDER_LABELS[provider] ?? provider
}

function formatAvailabilityLabel(availability?: RuntimeAvailability) {
  switch (availability) {
    case "verified":
      return "Verified now"
    case "temporary_limit":
      return "Limited now"
    case "listed":
      return "In account"
    default:
      return null
  }
}

function getRuntimeOptionLabel(input: {
  model: string
  availability?: RuntimeAvailability
}) {
  const availabilityLabel = formatAvailabilityLabel(input.availability)
  return availabilityLabel ? `${input.model} · ${availabilityLabel}` : input.model
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-5 text-sm leading-6 text-[#5f7176]">
      {message}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await requireDashboardSession()
  const tenantId = await getDashboardTenantId()
  let overview: AnalyticsOverview | null = null
  let aiRuntime: { provider: AiProvider; model: string } | null = null
  let loadError: string | null = null

  try {
    ;[overview, aiRuntime] = await Promise.all([
      getAnalyticsOverview(tenantId),
      getAiRuntimeConfig(),
    ])
  } catch (error) {
    loadError = "Scout dashboard could not reach the API. Make sure the API is running and the SCOUT_API_URL env var is correct."
  }

  const metrics = overview?.metrics ?? []
  const recentLeads = overview?.recentLeads ?? []
  const severityMix = overview?.severityMix ?? []
  const recentConversations = overview?.recentConversations ?? []
  const funnel = overview?.funnel ?? []
  const currentRuntimeSelection = aiRuntime
    ? buildRuntimeSelectionValue(aiRuntime.provider, aiRuntime.model)
    : ""
  const currentRuntimeCatalogEntry = aiRuntime
    ? findRuntimeCatalogEntry(aiRuntime.provider, aiRuntime.model)
    : null
  const runtimeTiers = Object.keys(TIER_LABELS) as RuntimeTier[]

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Scout Dashboard</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#132226]">
                Monitor lead quality, severity, and conversion signals across the Scout platform.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f7176]">
                This internal view now reads from the live Scout API so you can monitor lead quality and urgency from the same data layer that powers the app.
              </p>
            </div>

            <div className="rounded-full bg-[#ecf7f2] px-4 py-2 text-sm font-medium text-[#1d8f6a]">
              Signed in as {session.username}
            </div>
          </div>
        </section>

        {loadError ? (
          <section className="rounded-[24px] border border-[#f5d5d5] bg-[#fff7f7] p-5 text-sm leading-6 text-[#9a3a3a] shadow-sm">
            {loadError}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metricIcons[metric.key] ?? CircleDot

            return (
              <article key={metric.label} className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
                <Icon className="h-5 w-5 text-[#1d8f6a]" />
                <p className="mt-4 text-sm text-[#5f7176]">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[#132226]">{metric.value}</p>
                <p className="mt-2 text-sm text-[#7b8b90]">{metric.detail}</p>
              </article>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Conversation Funnel</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#132226]">How far people are getting</h2>
              </div>
              <Link
                href="/conversations"
                className="text-sm font-medium text-[#1d8f6a] transition hover:text-[#187558]"
              >
                Open conversations
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {funnel.length ? (
                funnel.map((step) => (
                  <div key={step.key} className="rounded-[18px] bg-[#fbfcfc] p-4">
                    <p className="text-sm text-[#7b8b90]">{step.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#132226]">{step.count}</p>
                  </div>
                ))
              ) : (
                <EmptyState message="Funnel data will appear here once conversations move through the new Scout states." />
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Incomplete Sessions</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Recent conversations still in progress</h2>
              </div>
              <Link
                href="/conversations?leadCreated=false"
                className="text-sm font-medium text-[#1d8f6a] transition hover:text-[#187558]"
              >
                View all
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {recentConversations.length ? (
                recentConversations.map((conversation) => (
                  <article key={conversation.id} className="rounded-[20px] border border-[#e5ecee] bg-[#fbfcfc] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.06em] text-[#132226]">
                        {conversation.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                        {formatConversationStatusLabel(conversation.status)}
                      </span>
                      <span className="rounded-full bg-[#fff3e4] px-3 py-1 text-xs font-medium text-[#9a6200]">
                        {formatSeverityLabel(conversation.severity)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-[#132226]">
                      {conversation.preferredName ?? "Anonymous"} · {conversation.suspectedPest ?? "Still assessing"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#5f7176]">
                      {[conversation.city, conversation.region].filter(Boolean).join(", ") || "Location pending"} ·{" "}
                      {conversation.messageCount} messages
                    </p>

                    <div className="mt-4">
                      <Link
                        href={`/conversations/${conversation.id}`}
                        className="text-sm font-medium text-[#1d8f6a] transition hover:text-[#187558]"
                      >
                        Open transcript
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState message="Incomplete conversations will appear here once users start chatting through the new flow." />
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Lead Queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Recent Qualified Leads</h2>
              </div>
              <span className="rounded-full bg-[#ecf7f2] px-4 py-2 text-sm font-medium text-[#1d8f6a]">
                Severity-aware pricing ready
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {recentLeads.length ? (
                recentLeads.map((lead) => (
                  <article key={lead.id} className="rounded-[20px] border border-[#e5ecee] bg-[#fbfcfc] p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-[#132226]">{lead.id}</span>
                      <span className="rounded-full bg-[#fff3e4] px-3 py-1 text-xs font-medium text-[#9a6200]">
                        {formatSeverityLabel(lead.severity)}
                      </span>
                      <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                        {formatStatusLabel(lead.status)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[#132226]">
                      {lead.pest} · {lead.location || "Location pending"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#5f7176]">{lead.summary}</p>
                    <div className="mt-4">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-[#1d8f6a] transition hover:text-[#187558]"
                      >
                        Open transcript and lead ops
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState message="No leads have been captured yet. Once users request professional follow-up, they will appear here." />
              )}
            </div>
          </article>

          <div className="grid gap-6">
            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Scout Runtime</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Active test model</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7176]">
                This is for internal testing only. Users never see it, and new conversations keep the runtime they started with.
              </p>

              {aiRuntime ? (
                <form action={saveAiRuntime} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#132226]">Runtime option</span>
                    <select
                      name="runtimeSelection"
                      defaultValue={currentRuntimeSelection}
                      className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                    >
                      {!currentRuntimeCatalogEntry ? (
                        <option value={currentRuntimeSelection}>
                          {formatProviderLabel(aiRuntime.provider)} · {aiRuntime.model} · Custom
                        </option>
                      ) : null}
                      {ALL_AI_PROVIDERS.map((provider) =>
                        runtimeTiers.map((tier) => {
                          const options = RUNTIME_MODEL_CATALOG.filter(
                            (entry) => entry.provider === provider && entry.tier === tier,
                          )

                          if (!options.length) {
                            return null
                          }

                          return (
                            <optgroup
                              key={`${provider}-${tier}`}
                              label={`${formatProviderLabel(provider)} — ${TIER_LABELS[tier]}`}
                            >
                              {options.map((entry) => (
                                <option
                                  key={`${entry.provider}-${entry.model}`}
                                  value={buildRuntimeSelectionValue(entry.provider, entry.model)}
                                >
                                  {getRuntimeOptionLabel({
                                    model: entry.model,
                                    availability: entry.availability,
                                  })}
                                </option>
                              ))}
                            </optgroup>
                          )
                        }),
                      )}
                    </select>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-[#132226]">Manual model override</span>
                      <input
                        name="customModel"
                        className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                        placeholder="Optional: leave blank to use the selected catalog model"
                      />
                    </label>

                    <div className="rounded-[18px] bg-[#fbfcfc] p-4 text-sm leading-6 text-[#5f7176]">
                      Current:
                      <span className="ml-1 font-medium text-[#132226]">
                        {formatProviderLabel(aiRuntime.provider)}
                      </span>
                      <span className="mx-1 text-[#7b8b90]">·</span>
                      <span className="font-medium text-[#132226]">{aiRuntime.model}</span>
                      <br />
                      {currentRuntimeCatalogEntry ? (
                        <>
                          Tier:
                          <span className="ml-1 font-medium text-[#132226]">
                            {TIER_LABELS[currentRuntimeCatalogEntry.tier]}
                          </span>
                          {currentRuntimeCatalogEntry.note ? (
                            <>
                              <br />
                              {currentRuntimeCatalogEntry.note}
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="text-[#7b8b90]">Current runtime is using a custom model name.</span>
                          <br />
                          Pick a catalog entry above or keep using a manual override.
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="rounded-full bg-[#132226] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0d1719]"
                  >
                    Update Scout model
                  </button>
                </form>
              ) : (
                <EmptyState message="Runtime settings will appear here once the dashboard can reach the API." />
              )}

              <div className="mt-6 space-y-4 border-t border-[#eef2f3] pt-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Model Catalog</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f7176]">
                    Grouped by provider and strength so you can swap quickly when free or trial limits get tight.
                  </p>
                </div>

                <div className="grid gap-4">
                  {ALL_AI_PROVIDERS.map((provider) => {
                    const providerModels = RUNTIME_MODEL_CATALOG.filter((entry) => entry.provider === provider)

                    if (!providerModels.length) {
                      return null
                    }

                    return (
                      <article key={provider} className="rounded-[20px] border border-[#e5ecee] bg-[#fbfcfc] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#132226]">{formatProviderLabel(provider)}</h3>
                          <span className="rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-medium text-[#5f7176]">
                            {providerModels.length} models
                          </span>
                        </div>

                        <div className="mt-4 space-y-4">
                          {runtimeTiers.map((tier) => {
                            const tierModels = providerModels.filter((entry) => entry.tier === tier)

                            if (!tierModels.length) {
                              return null
                            }

                            return (
                              <div key={`${provider}-${tier}`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b8b90]">
                                  {TIER_LABELS[tier]}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {tierModels.map((entry) => {
                                    const availabilityLabel = formatAvailabilityLabel(entry.availability)

                                    return (
                                      <span
                                        key={`${entry.provider}-${entry.model}`}
                                        className="rounded-full border border-[#d7e0e3] bg-white px-3 py-2 text-xs text-[#132226]"
                                        title={entry.note ?? undefined}
                                      >
                                        {entry.model}
                                        {availabilityLabel ? (
                                          <span className="ml-2 text-[#7b8b90]">{availabilityLabel}</span>
                                        ) : null}
                                      </span>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </article>
                    )
                  })}
                </div>

                <p className="text-xs leading-5 text-[#7b8b90]">
                  OpenRouter free routes marked <span className="font-medium text-[#132226]">Verified now</span> were
                  smoke-tested successfully. Models marked <span className="font-medium text-[#132226]">Limited now</span>{" "}
                  are valid but were rate-limited during the latest check.
                </p>
              </div>
            </article>

            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Severity Mix</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">How urgent current leads look</h2>
              <div className="mt-6 space-y-4">
                {severityMix.length ? (
                  severityMix.map((entry) => (
                    <div key={entry.severity}>
                      <div className="mb-2 flex items-center justify-between text-sm text-[#5f7176]">
                        <span>{formatSeverityLabel(entry.severity)}</span>
                        <span>{entry.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#eef2f3]">
                        <div
                          className="h-3 rounded-full bg-[#1d8f6a]"
                          style={{ width: `${Math.min(100, Math.max(entry.count * 24, entry.count ? 18 : 0))}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="Severity distribution will appear here once leads start coming through the live API." />
                )}
              </div>
            </article>

            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Phase 1 Focus</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">What this dashboard should measure</h2>
              <ul className="mt-6 space-y-4 text-sm leading-6 text-[#5f7176]">
                <li>Conversation starts, completions, and lead conversion rate</li>
                <li>Severity mix by tenant, pest type, and service area</li>
                <li>Lead queue status from new to contacted to closed</li>
                <li>Which issues most often trigger professional-help handoff</li>
                <li>How lead quality maps to downstream pricing and routing</li>
              </ul>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
