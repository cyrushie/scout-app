import Link from "next/link"
import { updateTenantAction } from "../actions"
import { requireDashboardSession } from "@/lib/auth"
import { getTenant } from "@/lib/scout-api"

function formatTextareaValue(values: string[]) {
  return values.join("\n")
}

function getWidgetApiUrl() {
  return (
    process.env.NEXT_PUBLIC_SCOUT_API_URL ??
    process.env.SCOUT_API_URL ??
    "http://localhost:3001"
  ).replace(/\/+$/, "")
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  await requireDashboardSession()

  const { tenantId } = await params
  const tenant = await getTenant(tenantId)
  const widgetSnippet = `<scout-widget tenant-id="${tenant.id}" api-url="${getWidgetApiUrl()}" widget-title="${tenant.brandName}"></scout-widget>`

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Tenant Settings</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                {tenant.companyName}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f7176]">
                Update widget policy, tune Scout’s tone, and keep the embed settings for this company in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226]">
                {tenant.id}
              </span>
              <span
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  tenant.widgetEnabled
                    ? "bg-[#ecf7f2] text-[#1d8f6a]"
                    : "bg-[#fff3e4] text-[#9a6200]"
                }`}
              >
                {tenant.widgetEnabled ? "Widget enabled" : "Widget disabled"}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Configuration</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Edit tenant settings</h2>
              </div>

              <Link
                href="/tenants"
                className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#b9c8cc]"
              >
                Back to tenants
              </Link>
            </div>

            <form action={updateTenantAction.bind(null, tenant.id)} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Company name</span>
                <input
                  name="companyName"
                  required
                  defaultValue={tenant.companyName}
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Brand name</span>
                <input
                  name="brandName"
                  required
                  defaultValue={tenant.brandName}
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Support email</span>
                <input
                  type="email"
                  name="supportEmail"
                  required
                  defaultValue={tenant.supportEmail}
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Widget accent color</span>
                <div className="flex items-center gap-3">
                  <span
                    className="h-11 w-11 rounded-2xl border border-black/10"
                    style={{ backgroundColor: tenant.widgetAccentColor ?? "#111111" }}
                  />
                  <input
                    name="widgetAccentColor"
                    defaultValue={tenant.widgetAccentColor ?? ""}
                    placeholder="#1d8f6a"
                    className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 font-mono text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  Optional hex color for launcher, buttons, badges, and chat accents. Leave blank to use the default Scout black.
                </p>
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#132226]">Allowed domains</span>
                  <textarea
                    name="allowedDomains"
                    rows={6}
                    defaultValue={formatTextareaValue(tenant.allowedDomains)}
                    className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                    One domain per line. Wildcards like <code>*.example.com</code> are allowed.
                  </p>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#132226]">Service areas</span>
                  <textarea
                    name="serviceAreas"
                    rows={6}
                    defaultValue={formatTextareaValue(tenant.serviceAreas)}
                    className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                    These are fed into Scout’s prompt so it can stay grounded in where the company operates.
                  </p>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Assistant voice</span>
                <textarea
                  name="assistantVoice"
                  required
                  rows={5}
                  defaultValue={tenant.assistantVoice}
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  This now feeds directly into Scout’s prompts and shapes how the assistant sounds.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Scout instructions</span>
                <textarea
                  name="scoutInstructions"
                  rows={6}
                  defaultValue={tenant.scoutInstructions}
                  placeholder="Add internal tenant-specific notes for Scout, like services offered, things to avoid mentioning, escalation preferences, or special business guidance."
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  Scout receives this only for this tenant. Use it for business-specific rules that do not fit neatly into the structured fields.
                </p>
              </label>

              <label className="flex items-center gap-3 rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm font-medium text-[#132226]">
                <input
                  type="checkbox"
                  name="widgetEnabled"
                  defaultChecked={tenant.widgetEnabled}
                  className="h-4 w-4 rounded border-[#b9c8cc] text-[#1d8f6a] focus:ring-[#1d8f6a]"
                />
                Allow this tenant’s widget to start and continue conversations
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#1d8f6a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#187558]"
                >
                  Save settings
                </button>
                <span className="text-sm text-[#5f7176]">
                  Changes persist in the database and will not be overwritten by seed data on restart.
                </span>
              </div>
            </form>
          </article>

          <div className="space-y-6">
            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Embed Summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Widget wiring</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Brand</p>
                  <p className="mt-2 text-sm font-medium text-[#132226]">{tenant.brandName}</p>
                </div>
                <div className="rounded-[18px] bg-[#fbfcfc] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Support email</p>
                  <p className="mt-2 text-sm font-medium text-[#132226]">{tenant.supportEmail}</p>
                </div>
                <div className="rounded-[18px] bg-[#fbfcfc] p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Widget accent</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: tenant.widgetAccentColor ?? "#111111" }}
                    />
                    <p className="text-sm font-medium text-[#132226]">
                      {tenant.widgetAccentColor ?? "Default Scout black"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] bg-[#fbfcfc] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Allowed domains</p>
                <p className="mt-2 text-sm leading-6 text-[#132226]">
                  {tenant.allowedDomains.length ? tenant.allowedDomains.join(", ") : "No domain restriction configured"}
                </p>
              </div>

              <div className="mt-4 rounded-[18px] bg-[#fbfcfc] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Scout instructions</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#132226]">
                  {tenant.scoutInstructions || "No tenant-specific Scout instructions configured yet."}
                </p>
              </div>
            </article>

            <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Embed Snippet</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Use this tenant id in the widget</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7176]">
                Pair this element with your hosted widget script. The tenant id is what keeps conversations and leads scoped to this company.
              </p>

              <pre className="mt-5 overflow-x-auto rounded-[18px] bg-[#132226] p-4 text-sm leading-6 text-[#e7f1f0]">
                <code>{widgetSnippet}</code>
              </pre>

              <p className="mt-3 text-xs leading-5 text-[#7b8b90]">
                API URL used here: {getWidgetApiUrl()}
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
