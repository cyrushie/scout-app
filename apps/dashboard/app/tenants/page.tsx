import Link from "next/link"
import { createTenantAction } from "./actions"
import { requireDashboardSession } from "@/lib/auth"
import { getTenants } from "@/lib/scout-api"

function formatListPreview(items: string[], emptyLabel: string) {
  if (!items.length) {
    return emptyLabel
  }

  return items.join(", ")
}

export default async function TenantsPage() {
  await requireDashboardSession()

  const tenants = await getTenants()

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-[28px] border border-black/5 bg-white/85 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Tenants</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#132226]">
                Manage each company’s brand, widget policy, service footprint, and assistant voice.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f7176]">
                Tenant settings now live in the dashboard instead of seed data. Create a company here, then open its settings to manage allowed domains, widget availability, and the voice Scout should use.
              </p>
            </div>

            <div className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#5f7176]">
              {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Tenant Directory</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Current companies</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {tenants.length ? (
                tenants.map((tenant) => (
                  <article
                    key={tenant.id}
                    className="rounded-[22px] border border-[#e5ecee] bg-[#fbfcfc] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7e0e3] bg-white px-3 py-1 text-xs font-semibold tracking-[0.06em] text-[#132226]">
                        {tenant.id}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          tenant.widgetEnabled
                            ? "bg-[#ecf7f2] text-[#1d8f6a]"
                            : "bg-[#fff3e4] text-[#9a6200]"
                        }`}
                      >
                        {tenant.widgetEnabled ? "Widget enabled" : "Widget disabled"}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-semibold text-[#132226]">{tenant.companyName}</h2>
                    <p className="mt-1 text-sm font-medium text-[#5f7176]">{tenant.brandName}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Allowed domains</p>
                        <p className="mt-2 text-sm leading-6 text-[#132226]">
                          {formatListPreview(tenant.allowedDomains, "No restrictions configured")}
                        </p>
                      </div>
                      <div className="rounded-[16px] bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Service areas</p>
                        <p className="mt-2 text-sm leading-6 text-[#132226]">
                          {formatListPreview(tenant.serviceAreas, "No service areas configured")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Widget accent</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: tenant.widgetAccentColor ?? "#111111" }}
                        />
                        <p className="text-sm leading-6 text-[#132226]">
                          {tenant.widgetAccentColor ?? "Default Scout black"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[16px] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Assistant voice</p>
                      <p className="mt-2 text-sm leading-6 text-[#132226]">{tenant.assistantVoice}</p>
                    </div>

                    {tenant.scoutInstructions ? (
                      <div className="mt-4 rounded-[16px] bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#7b8b90]">Scout instructions</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#132226]">
                          {tenant.scoutInstructions}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f3] pt-5">
                      <span className="text-sm text-[#5f7176]">{tenant.supportEmail}</span>
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="rounded-full border border-[#d7e0e3] bg-white px-4 py-2 text-sm font-medium text-[#132226] transition hover:border-[#1d8f6a] hover:text-[#1d8f6a]"
                      >
                        Open settings
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d7e0e3] bg-[#fbfcfc] p-6 text-sm leading-6 text-[#5f7176]">
                  No tenants have been created yet.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-[#d7e0e3] bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8b90]">Create Tenant</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#132226]">Add a new company</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f7176]">
                Add the company once, then use the tenant settings page to refine domains, voice, and embed details.
              </p>
            </div>

            <form action={createTenantAction} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Tenant id</span>
                <input
                  name="id"
                  required
                  placeholder="acme-pest"
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  Use lowercase and hyphens. This becomes the stable widget tenant id.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Company name</span>
                <input
                  name="companyName"
                  required
                  placeholder="Acme Pest Control"
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Brand name</span>
                <input
                  name="brandName"
                  required
                  placeholder="Acme Pest"
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Support email</span>
                <input
                  type="email"
                  name="supportEmail"
                  required
                  placeholder="ops@acmepest.com"
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Widget accent color</span>
                <input
                  name="widgetAccentColor"
                  placeholder="#1d8f6a"
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 font-mono text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  Optional hex color for the widget, like <code>#1d8f6a</code>. Leave blank to use the default Scout theme.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Allowed domains</span>
                <textarea
                  name="allowedDomains"
                  rows={4}
                  placeholder={"acmepest.com\nwww.acmepest.com"}
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  One per line or comma-separated. Leave empty if you want the widget allowed anywhere.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Service areas</span>
                <textarea
                  name="serviceAreas"
                  rows={3}
                  placeholder={"San Jose\nSanta Clara County"}
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Assistant voice</span>
                <textarea
                  name="assistantVoice"
                  required
                  rows={4}
                  placeholder="Helpful, reassuring, and concise."
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#132226]">Scout instructions</span>
                <textarea
                  name="scoutInstructions"
                  rows={5}
                  placeholder="Add internal tenant-specific notes for Scout, like services offered, things to avoid mentioning, escalation preferences, or special business guidance."
                  className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm leading-6 text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                />
                <p className="mt-2 text-xs leading-5 text-[#7b8b90]">
                  This is a freeform internal prompt field that Scout will receive only for this tenant.
                </p>
              </label>

              <label className="flex items-center gap-3 rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm font-medium text-[#132226]">
                <input
                  type="checkbox"
                  name="widgetEnabled"
                  defaultChecked
                  className="h-4 w-4 rounded border-[#b9c8cc] text-[#1d8f6a] focus:ring-[#1d8f6a]"
                />
                Enable widget immediately
              </label>

              <button
                type="submit"
                className="w-full rounded-full bg-[#1d8f6a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#187558]"
              >
                Create tenant
              </button>
            </form>
          </article>
        </section>
      </div>
    </main>
  )
}
