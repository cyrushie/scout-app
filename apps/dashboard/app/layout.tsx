import type { Metadata } from "next"
import { switchDashboardTenant } from "./actions"
import { DashboardShell } from "@/components/dashboard-shell"
import { getDashboardSession } from "@/lib/auth"
import { getDashboardTenantContext } from "@/lib/tenant-selection"
import "./globals.css"

export const metadata: Metadata = {
  title: "Scout Dashboard",
  description: "Internal analytics and lead operations for Scout.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getDashboardSession()
  let tenants: Awaited<ReturnType<typeof getDashboardTenantContext>>["tenants"] = []
  let selectedTenantId: string | undefined

  if (session) {
    try {
      const tenantContext = await getDashboardTenantContext()
      tenants = tenantContext.tenants
      selectedTenantId = tenantContext.selectedTenantId
    } catch {
      tenants = []
      selectedTenantId = undefined
    }
  }

  return (
    <html lang="en">
      <body>
        <DashboardShell
          username={session?.username}
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          switchTenantAction={switchDashboardTenant}
        >
          {children}
        </DashboardShell>
      </body>
    </html>
  )
}
