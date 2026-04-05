"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { requireDashboardSession } from "@/lib/auth"
import { ALL_AI_PROVIDERS, parseRuntimeSelectionValue } from "@/lib/runtime-catalog"
import { updateAiRuntime } from "@/lib/scout-api"
import { DASHBOARD_TENANT_COOKIE } from "@/lib/tenant-selection"
import type { AiProvider } from "@scout/types"

const validProviders = new Set<AiProvider>(ALL_AI_PROVIDERS)

export async function saveAiRuntime(formData: FormData) {
  await requireDashboardSession()

  const runtimeSelection = String(formData.get("runtimeSelection") ?? "").trim()
  const customModel = String(formData.get("customModel") ?? "").trim()
  const parsedSelection = parseRuntimeSelectionValue(runtimeSelection)

  if (!parsedSelection || !validProviders.has(parsedSelection.provider)) {
    throw new Error("Invalid Scout AI runtime settings.")
  }

  await updateAiRuntime({
    provider: parsedSelection.provider,
    model: customModel || parsedSelection.model,
  })

  revalidatePath("/")
  revalidatePath("/analytics")
}

export async function switchDashboardTenant(formData: FormData) {
  await requireDashboardSession()

  const tenantId = String(formData.get("tenantId") ?? "").trim()
  const returnTo = String(formData.get("returnTo") ?? "/").trim() || "/"

  if (!tenantId) {
    throw new Error("Tenant selection is required.")
  }

  const cookieStore = await cookies()
  cookieStore.set(DASHBOARD_TENANT_COOKIE, tenantId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  })

  redirect(returnTo)
}
