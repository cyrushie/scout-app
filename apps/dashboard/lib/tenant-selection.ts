import "server-only"

import { cookies } from "next/headers"
import { getTenants } from "@/lib/scout-api"

export const DASHBOARD_TENANT_COOKIE = "scout_dashboard_tenant"
export const DEFAULT_DASHBOARD_TENANT_ID = "scout-direct"

export async function getDashboardTenantId() {
  const cookieStore = await cookies()
  return cookieStore.get(DASHBOARD_TENANT_COOKIE)?.value ?? DEFAULT_DASHBOARD_TENANT_ID
}

export async function getDashboardTenantContext() {
  const tenants = await getTenants()
  const requestedTenantId = await getDashboardTenantId()

  const selectedTenant =
    tenants.find((tenant) => tenant.id === requestedTenantId) ??
    tenants.find((tenant) => tenant.id === DEFAULT_DASHBOARD_TENANT_ID) ??
    tenants[0] ??
    null

  return {
    tenants,
    selectedTenant,
    selectedTenantId: selectedTenant?.id ?? DEFAULT_DASHBOARD_TENANT_ID,
  }
}
