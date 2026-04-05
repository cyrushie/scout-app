"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  ShieldCheck,
  X,
} from "lucide-react"
import type { TenantConfig } from "@scout/types"

const navigationItems = [
  {
    href: "/",
    label: "Overview",
    description: "Metrics and runtime controls",
    icon: LayoutDashboard,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Funnels and drop-off signals",
    icon: BarChart3,
  },
  {
    href: "/conversations",
    label: "Conversations",
    description: "Review transcripts and states",
    icon: MessagesSquare,
  },
  {
    href: "/leads",
    label: "Lead Ops",
    description: "Work the qualified lead queue",
    icon: ClipboardList,
  },
  {
    href: "/tenants",
    label: "Tenants",
    description: "Manage brands, domains, and voice",
    icon: Building2,
  },
] as const

function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarContent({
  pathname,
  search,
  username,
  tenants,
  selectedTenantId,
  switchTenantAction,
  onNavigate,
}: {
  pathname: string
  search: string
  username?: string | null
  tenants: TenantConfig[]
  selectedTenantId?: string
  switchTenantAction: (formData: FormData) => Promise<void>
  onNavigate?: () => void
}) {
  const returnTo = search ? `${pathname}?${search}` : pathname

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#132226] text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b8b90]">Scout Ops</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-[#132226]">Dashboard</h1>
          </div>
        </div>

        <div className="rounded-full border border-[#d7e0e3] bg-white px-3 py-2 text-xs font-medium text-[#5f7176] shadow-sm">
          {username ? username : "Internal"}
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-[#d7e0e3] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8b90]">Active tenant</p>
            <p className="mt-2 text-sm leading-6 text-[#5f7176]">
              Overview, analytics, conversations, and leads will follow this company.
            </p>
          </div>
        </div>

        <form action={switchTenantAction} className="mt-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="sr-only">Select tenant</span>
            <select
              key={selectedTenantId ?? "tenant-default"}
              name="tenantId"
              defaultValue={selectedTenantId ?? ""}
              disabled={!tenants.length}
              onChange={(event) => {
                onNavigate?.()
                event.currentTarget.form?.requestSubmit()
              }}
              className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm font-medium text-[#132226] outline-none transition focus:border-[#1d8f6a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tenants.length ? (
                tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.brandName} · {tenant.id}
                  </option>
                ))
              ) : (
                <option value="">No tenants available</option>
              )}
            </select>
          </label>
        </form>
      </div>

      <nav className="mt-6 space-y-2">
        {navigationItems.map((item) => {
          const active = isNavItemActive(pathname, item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-start gap-3 rounded-[20px] border px-4 py-4 transition ${
                active
                  ? "border-[#bfe0d4] bg-[#ecf7f2] text-[#132226] shadow-sm"
                  : "border-transparent bg-white/70 text-[#355058] hover:border-[#d7e0e3] hover:bg-white"
              }`}
            >
              <div
                className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                  active
                    ? "bg-[#1d8f6a] text-white"
                    : "bg-[#f1f5f6] text-[#5f7176] group-hover:bg-[#e8efef]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-sm leading-5 text-[#6f8388]">{item.description}</p>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 rounded-[22px] border border-[#d7e0e3] bg-white p-4 text-sm leading-6 text-[#5f7176] shadow-sm">
        Overview still holds the runtime model switcher. The rest of the workspace is now one tap away from here.
      </div>

      <div className="mt-auto pt-6">
        <form action="/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#d7e0e3] bg-white px-4 py-3 text-sm font-semibold text-[#132226] transition hover:border-[#b9c8cc] hover:bg-[#fbfcfc]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

export function DashboardShell({
  children,
  username,
  tenants,
  selectedTenantId,
  switchTenantAction,
}: {
  children: React.ReactNode
  username?: string | null
  tenants: TenantConfig[]
  selectedTenantId?: string
  switchTenantAction: (formData: FormData) => Promise<void>
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const search = searchParams?.toString() ?? ""

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, search])

  if (!pathname || pathname.startsWith("/login")) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-black/6 bg-[rgba(245,247,248,0.92)] px-5 py-4 backdrop-blur md:hidden">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#1d8f6a]">Scout Ops</p>
          <p className="mt-1 text-base font-semibold text-[#132226]">Dashboard</p>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d7e0e3] bg-white text-[#132226] shadow-sm"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-[#132226]/35 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[88vw] max-w-[340px] flex-col bg-[#f5f7f8] p-5 shadow-[0_24px_80px_rgba(19,34,38,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#1d8f6a]">Navigation</p>
                <p className="mt-1 text-lg font-semibold text-[#132226]">Scout Dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d7e0e3] bg-white text-[#132226]"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SidebarContent
              pathname={pathname}
              search={search}
              username={username}
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              switchTenantAction={switchTenantAction}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-[300px] shrink-0 border-r border-black/6 bg-[rgba(247,249,250,0.86)] px-5 py-6 backdrop-blur md:block">
        <div className="sticky top-6 h-[calc(100vh-3rem)] overflow-y-auto">
          <SidebarContent
            pathname={pathname}
            search={search}
            username={username}
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            switchTenantAction={switchTenantAction}
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}
