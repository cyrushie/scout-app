import { clearDashboardSession } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  await clearDashboardSession()
  return NextResponse.redirect(new URL("/login", request.url))
}
