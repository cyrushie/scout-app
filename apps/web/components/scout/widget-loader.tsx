"use client"

import { useEffect } from "react"

export function ScoutWidgetLoader() {
  useEffect(() => {
    let mountedElement: HTMLElement | null = null
    let cancelled = false

    async function mount() {
      const { mountScoutWidget } = await import("../../../widget/dist/embed.js")

      if (cancelled) {
        return
      }

      const existing = document.querySelector<HTMLElement>("scout-widget[data-scout-web='true']")

      if (existing) {
        mountedElement = existing
        return
      }

      mountedElement = mountScoutWidget({
        tenantId: "scout-direct",
        apiUrl: process.env.NEXT_PUBLIC_SCOUT_API_URL,
        position: "bottom-right",
        title: "Scout",
      })

      if (mountedElement) {
        mountedElement.setAttribute("data-scout-web", "true")
      }
    }

    void mount()

    return () => {
      cancelled = true
      mountedElement?.remove()
    }
  }, [])

  return null
}
