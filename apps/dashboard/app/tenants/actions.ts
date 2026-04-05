"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireDashboardSession } from "@/lib/auth"
import { createTenant, updateTenant } from "@/lib/scout-api"
import { DASHBOARD_TENANT_COOKIE } from "@/lib/tenant-selection"

function parseListField(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeTenantId(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseTenantSettings(formData: FormData) {
  return {
    companyName: String(formData.get("companyName") ?? "").trim(),
    brandName: String(formData.get("brandName") ?? "").trim(),
    allowedDomains: parseListField(formData.get("allowedDomains")),
    serviceAreas: parseListField(formData.get("serviceAreas")),
    supportEmail: String(formData.get("supportEmail") ?? "").trim(),
    widgetEnabled: formData.get("widgetEnabled") === "on",
    assistantVoice: String(formData.get("assistantVoice") ?? "").trim(),
    scoutInstructions: String(formData.get("scoutInstructions") ?? "").trim(),
  }
}

export async function createTenantAction(formData: FormData) {
  await requireDashboardSession()

  const id = normalizeTenantId(formData.get("id"))

  if (!id) {
    throw new Error("Tenant id is required.")
  }

  const tenant = await createTenant({
    id,
    ...parseTenantSettings(formData),
  })

  const cookieStore = await cookies()
  cookieStore.set(DASHBOARD_TENANT_COOKIE, tenant.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath("/tenants")
  revalidatePath(`/tenants/${tenant.id}`)
  redirect(`/tenants/${tenant.id}`)
}

export async function updateTenantAction(tenantId: string, formData: FormData) {
  await requireDashboardSession()

  await updateTenant({
    tenantId,
    data: parseTenantSettings(formData),
  })

  revalidatePath("/tenants")
  revalidatePath(`/tenants/${tenantId}`)
}
