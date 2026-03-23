"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardSession } from "@/lib/auth"
import { ALL_AI_PROVIDERS, parseRuntimeSelectionValue } from "@/lib/runtime-catalog"
import { updateAiRuntime } from "@/lib/scout-api"
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
