import Link from "next/link"
import { requireDashboardSession } from "@/lib/auth"
import { getConversationAnalytics } from "@/lib/scout-api"
import type { ConversationStatus, SeverityLevel } from "@scout/types"

function formatStatusLabel(status: ConversationStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatSeverityLabel(severity: SeverityLevel) {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

export default async function AnalyticsPage() {
  await requireDashboardSession()

  const analytics = await getConversationAnalytics()

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Analytics</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                Measure drop-off, high-intent incomplete sessions, and how conversations move through Scout.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f7176]">
                This view focuses on product effectiveness: where users stop, which states they reach, and which incomplete sessions still look valuable.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Back to overview
              </Link>
              <Link
                href="/conversations"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Open conversations
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Funnel</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Stage progression</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {analytics.funnel.map((step) => (
                <div key={step.key} className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <p className="text-sm text-[#7b8b90]">{step.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#132226]">{step.count}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Top Pest Signals</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#132226]">What people report most</h2>

            <div className="mt-6 space-y-4">
              {analytics.topPests.length ? (
                analytics.topPests.map((entry) => (
                  <div key={entry.pest}>
                    <div className="mb-2 flex items-center justify-between text-sm text-[#5f7176]">
                      <span>{entry.pest}</span>
                      <span>{entry.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#eef2f3]">
                      <div
                        className="h-3 rounded-full bg-[#132226]"
                        style={{
                          width: `${Math.min(100, Math.max(entry.count * 18, entry.count ? 16 : 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-5 text-sm leading-6 text-[#5f7176]">
                  Pest category data will appear here once conversations have enough variety.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Model Comparison</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">How each runtime is performing</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7176]">
                This section is dynamic. Any provider/model pair stored on conversations will appear here automatically.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {analytics.modelPerformance.length ? (
              analytics.modelPerformance.map((entry) => (
                <article
                  key={`${entry.provider}:${entry.model}`}
                  className="rounded-[20px] border border-[#e5ecee] bg-[#fbfcfc] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#eef2f3] px-3 py-1 text-xs font-medium text-[#5f7176]">
                      {entry.provider}
                    </span>
                    <span className="rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.04em] text-[#132226]">
                      {entry.model}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Conversations</p>
                      <p className="mt-2 text-2xl font-semibold text-[#132226]">{entry.conversations}</p>
                    </div>
                    <div className="rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Completed leads</p>
                      <p className="mt-2 text-2xl font-semibold text-[#132226]">{entry.completedLeads}</p>
                    </div>
                    <div className="rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Conversion</p>
                      <p className="mt-2 text-2xl font-semibold text-[#132226]">{entry.conversionRate}%</p>
                    </div>
                    <div className="rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Avg urgency</p>
                      <p className="mt-2 text-2xl font-semibold text-[#132226]">{entry.avgUrgency}</p>
                    </div>
                    <div className="rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">High concern</p>
                      <p className="mt-2 text-2xl font-semibold text-[#132226]">{entry.highSeverityCount}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-5 text-sm leading-6 text-[#5f7176]">
                Model comparison data will appear here once new conversations are created with runtime snapshots.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">State Distribution</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Where conversations currently sit</h2>

            <div className="mt-6 space-y-4">
              {analytics.stateDistribution.map((entry) => (
                <div key={entry.status}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[#5f7176]">
                    <span>{formatStatusLabel(entry.status)}</span>
                    <span>{entry.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#eef2f3]">
                    <div
                      className="h-3 rounded-full bg-[#1d8f6a]"
                      style={{
                        width: `${Math.min(100, Math.max(entry.count * 16, entry.count ? 14 : 0))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Drop-Off Approximation</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Incomplete conversations by current state</h2>
            <p className="mt-3 text-sm leading-6 text-[#5f7176]">
              This is a current-state approximation of drop-off. It shows where incomplete conversations are currently sitting, along with urgency and high-severity mix.
            </p>

            <div className="mt-6 space-y-4">
              {analytics.dropOffByState.length ? (
                analytics.dropOffByState.map((entry) => (
                  <div key={entry.status} className="rounded-[18px] bg-[#fbfcfc] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#132226]">{formatStatusLabel(entry.status)}</p>
                        <p className="mt-1 text-sm text-[#5f7176]">
                          {entry.count} incomplete · avg urgency {entry.avgUrgency} · {entry.highSeverityCount} high concern
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-5 text-sm leading-6 text-[#5f7176]">
                  Incomplete-state metrics will appear here once more conversations accumulate.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">High-Intent Incomplete</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Sessions worth a closer look</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7176]">
                These are incomplete conversations that either reached advanced states or show high severity. They are likely your best missed-opportunity bucket.
              </p>
            </div>

            <Link
              href="/conversations?leadCreated=false"
              className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
            >
              View incomplete sessions
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {analytics.highIntentIncomplete.length ? (
              analytics.highIntentIncomplete.map((conversation) => (
                <article
                  key={conversation.id}
                  className="rounded-[20px] border border-[#e5ecee] bg-[#fbfcfc] p-5"
                >
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
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-[#132226]">
                    {conversation.preferredName ?? "Anonymous"} · {conversation.suspectedPest ?? "Still assessing"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f7176]">
                    {[conversation.city, conversation.region].filter(Boolean).join(", ") || "Location pending"} · urgency {conversation.urgencyScore}/100 · {conversation.messageCount} messages
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
              <div className="rounded-[20px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-5 text-sm leading-6 text-[#5f7176]">
                High-intent incomplete sessions will appear here once more users move through the new flow.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
