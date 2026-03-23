import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const SESSION_COOKIE_NAME = "scout_dashboard_session"
const SESSION_TTL_MS = 1000 * 60 * 60 * 12

function getRequiredAuthEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required dashboard auth environment variable: ${name}`)
  }

  return value
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function getAuthConfig() {
  return {
    username: getRequiredAuthEnv("DASHBOARD_AUTH_USERNAME"),
    password: getRequiredAuthEnv("DASHBOARD_AUTH_PASSWORD"),
    secret: getRequiredAuthEnv("DASHBOARD_SESSION_SECRET"),
  }
}

function createSessionSignature(username: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`${username}:${expiresAt}`).digest("hex")
}

function buildSessionToken(username: string, secret: string) {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const signature = createSessionSignature(username, expiresAt, secret)
  return `${username}:${expiresAt}:${signature}`
}

function parseSessionToken(token: string) {
  const [username, expiresAtValue, signature] = token.split(":")
  const expiresAt = Number(expiresAtValue)

  if (!username || !signature || Number.isNaN(expiresAt)) {
    return null
  }

  return {
    username,
    expiresAt,
    signature,
  }
}

export function isDashboardAuthConfigured() {
  return Boolean(
    process.env.DASHBOARD_AUTH_USERNAME?.trim() &&
      process.env.DASHBOARD_AUTH_PASSWORD?.trim() &&
      process.env.DASHBOARD_SESSION_SECRET?.trim(),
  )
}

export async function createDashboardSession(username: string) {
  const { secret } = getAuthConfig()
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, buildSessionToken(username, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function clearDashboardSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getDashboardSession() {
  if (!isDashboardAuthConfigured()) {
    return null
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const parsed = parseSessionToken(token)

  if (!parsed || parsed.expiresAt < Date.now()) {
    return null
  }

  const { username, secret } = getAuthConfig()
  const expectedSignature = createSessionSignature(parsed.username, parsed.expiresAt, secret)

  if (!safeEqual(parsed.signature, expectedSignature)) {
    return null
  }

  if (!safeEqual(parsed.username, username)) {
    return null
  }

  return {
    username: parsed.username,
  }
}

export async function requireDashboardSession() {
  const session = await getDashboardSession()

  if (!session) {
    redirect("/login")
  }

  return session
}

export function validateDashboardCredentials(username: string, password: string) {
  if (!isDashboardAuthConfigured()) {
    return false
  }

  const config = getAuthConfig()

  return safeEqual(username, config.username) && safeEqual(password, config.password)
}
