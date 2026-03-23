import {
  createDashboardSession,
  isDashboardAuthConfigured,
  validateDashboardCredentials,
} from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  if (!isDashboardAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", request.url))
  }

  const formData = await request.formData()
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!validateDashboardCredentials(username, password)) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url))
  }

  await createDashboardSession(username)
  return NextResponse.redirect(new URL("/", request.url))
}
