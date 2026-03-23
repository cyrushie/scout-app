process.loadEnvFile("apps/api/.env")

const runtimeCatalog = {
  groq: [
    "openai/gpt-oss-120b",
    "moonshotai/kimi-k2-instruct-0905",
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-20b",
    "moonshotai/kimi-k2-instruct",
    "llama-3.1-8b-instant",
  ],
  gemini: [
    "gemini-3.1-pro-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-pro",
    "gemini-pro-latest",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
  ],
  zai: [
    "glm-5",
    "glm-4.7",
    "glm-4.6",
    "glm-4.5",
    "glm-5-turbo",
    "glm-4.5-air",
  ],
  openrouter: [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-coder:free",
  ],
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function summarizeError(error) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

async function testOpenAiCompatible({ baseUrl, apiKey, model, extraHeaders = {} }) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly OK." }],
        temperature: 0,
        max_tokens: 8,
      }),
    })

    const text = await response.text()
    let parsed

    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = undefined
    }

    return {
      model,
      ok: response.ok,
      status: response.status,
      sample:
        parsed?.choices?.[0]?.message?.content ??
        parsed?.choices?.[0]?.text ??
        null,
      error:
        parsed?.error?.message ??
        parsed?.message ??
        (!response.ok ? text.slice(0, 240) : null),
    }
  } catch (error) {
    return {
      model,
      ok: false,
      status: 0,
      sample: null,
      error: summarizeError(error),
    }
  }
}

async function testGemini(model) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with exactly OK." }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8,
          },
        }),
      },
    )

    const text = await response.text()
    let parsed

    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = undefined
    }

    return {
      model,
      ok: response.ok,
      status: response.status,
      sample:
        parsed?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ??
        null,
      error:
        parsed?.error?.message ??
        parsed?.message ??
        (!response.ok ? text.slice(0, 240) : null),
    }
  } catch (error) {
    return {
      model,
      ok: false,
      status: 0,
      sample: null,
      error: summarizeError(error),
    }
  }
}

async function run() {
  const results = {
    groq: [],
    gemini: [],
    zai: [],
    openrouter: [],
  }

  for (const model of runtimeCatalog.groq) {
    results.groq.push(
      await testOpenAiCompatible({
        baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY,
        model,
      }),
    )
    await delay(200)
  }

  for (const model of runtimeCatalog.gemini) {
    results.gemini.push(await testGemini(model))
    await delay(250)
  }

  for (const model of runtimeCatalog.zai) {
    results.zai.push(
      await testOpenAiCompatible({
        baseUrl: process.env.ZAI_BASE_URL || "https://api.z.ai/api/paas/v4",
        apiKey: process.env.ZAI_API_KEY,
        model,
      }),
    )
    await delay(250)
  }

  for (const model of runtimeCatalog.openrouter) {
    results.openrouter.push(
      await testOpenAiCompatible({
        baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        model,
        extraHeaders: {
          "HTTP-Referer": "https://scout.local",
          "X-Title": "Scout Runtime Smoke Test",
        },
      }),
    )
    await delay(300)
  }

  const summarize = (items) => ({
    working: items
      .filter((item) => item.ok)
      .map((item) => ({ model: item.model, status: item.status, sample: item.sample })),
    failing: items
      .filter((item) => !item.ok)
      .map((item) => ({ model: item.model, status: item.status, error: item.error })),
  })

  console.log(
    JSON.stringify(
      {
        summary: {
          groq: summarize(results.groq),
          gemini: summarize(results.gemini),
          zai: summarize(results.zai),
          openrouter: summarize(results.openrouter),
        },
        raw: results,
      },
      null,
      2,
    ),
  )
}

await run()
