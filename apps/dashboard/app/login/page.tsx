import { getDashboardSession, isDashboardAuthConfigured } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getDashboardSession()

  if (session) {
    redirect("/")
  }

  const params = await searchParams
  const failed = params.error === "invalid_credentials"
  const unconfiguredError = params.error === "unconfigured"
  const unconfigured = !isDashboardAuthConfigured()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(29,143,106,0.16),_transparent_32%),linear-gradient(180deg,#f6fbf8_0%,#eef4f2_100%)] px-6 py-10 md:px-10">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <section className="w-full max-w-md rounded-[28px] border border-black/5 bg-white/90 p-8 shadow-[0_20px_80px_rgba(19,34,38,0.08)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.2em] text-[#1d8f6a]">Scout Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#132226]">Sign in to continue</h1>
          <p className="mt-3 text-sm leading-6 text-[#5f7176]">
            This dashboard is for internal lead operations and analytics only.
          </p>

          {unconfigured ? (
            <div className="mt-6 rounded-[20px] border border-[#f4d7a7] bg-[#fff9ef] p-4 text-sm leading-6 text-[#8a6420]">
              Set <code>DASHBOARD_AUTH_USERNAME</code>, <code>DASHBOARD_AUTH_PASSWORD</code>, and{" "}
              <code>DASHBOARD_SESSION_SECRET</code> before using the dashboard login.
            </div>
          ) : null}

          {unconfiguredError ? (
            <div className="mt-6 rounded-[20px] border border-[#f4d7a7] bg-[#fff9ef] p-4 text-sm leading-6 text-[#8a6420]">
              Dashboard auth is not configured yet. Add the auth values in{" "}
              <code>apps/dashboard/.env</code> and restart the dashboard.
            </div>
          ) : null}

          {failed ? (
            <div className="mt-6 rounded-[20px] border border-[#f5d5d5] bg-[#fff7f7] p-4 text-sm leading-6 text-[#9a3a3a]">
              The username or password was incorrect.
            </div>
          ) : null}

          <form action="/login/submit" method="post" className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Username</span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                placeholder="admin"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#132226]">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-[18px] border border-[#d7e0e3] bg-[#fbfcfc] px-4 py-3 text-sm text-[#132226] outline-none transition focus:border-[#1d8f6a]"
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-[#1d8f6a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#187558] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
