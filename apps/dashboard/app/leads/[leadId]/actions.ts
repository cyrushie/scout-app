"use server"

import { requireDashboardSession } from "@/lib/auth"
import { updateLead } from "@/lib/scout-api"
import { revalidatePath } from "next/cache"

export async function saveLeadOps(formData: FormData) {
  await requireDashboardSession()

  const leadId = String(formData.get("leadId") ?? "").trim()
  const status = String(formData.get("status") ?? "").trim() || undefined

  if (!leadId) {
    throw new Error("Missing lead id")
  }

  await updateLead({
    leadId,
    status: status as
      | "new"
      | "review"
      | "contacted"
      | "closed"
      | undefined,
  })

  revalidatePath("/")
  revalidatePath("/leads")
  revalidatePath(`/leads/${leadId}`)
}
