import { PrismaClient } from "@prisma/client"

try {
  process.loadEnvFile("apps/api/.env")
} catch {}

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const prisma = new PrismaClient()
const shouldReset = process.argv.includes("--reset")

const seededTenants = [
  {
    id: "scout-direct",
    companyName: "Scout Direct",
    brandName: "Scout",
    allowedDomains: ["localhost", "scoutai.app"],
    serviceAreas: ["Florida", "Texas", "Arizona"],
    supportEmail: "support@scoutai.app",
    widgetEnabled: true,
    assistantVoice: "Calm, practical, and non-alarmist.",
  },
  {
    id: "sunrise-pest",
    companyName: "Sunrise Pest Control",
    brandName: "Sunrise Pest",
    allowedDomains: ["sunrisepest.example"],
    serviceAreas: ["Florida"],
    supportEmail: "ops@sunrisepest.example",
    widgetEnabled: true,
    assistantVoice: "Helpful, reassuring, and concise.",
  },
]

const runtimeVariants = [
  { provider: "groq", model: "llama-3.1-8b-instant" },
  { provider: "gemini", model: "gemini-2.5-flash" },
  { provider: "zai", model: "glm-4.5-flash" },
]

const scenarios = [
  {
    topic: "bed bugs",
    suspectedPest: "bed bugs",
    severity: "high",
    urgencyScore: 82,
    source: "web",
    status: "complete",
    lead: true,
    city: "San Jose",
    region: "California",
    preferredName: "Cyrus",
    summaryRequested: true,
    summaryEmail: "cyrus@example.com",
    preferredContactMethod: "email",
    availabilityNotes: "weekday afternoons work best",
    leadOffered: true,
    summary:
      "Possible bed bug activity with repeated bites overnight. User requested professional follow-up.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "I keep getting bites every night and I noticed tiny spots on the mattress seams."],
      ["assistant", "That does sound worth checking. What city or area are you in?"],
      ["user", "San Jose, California."],
      ["assistant", "Thanks. What should I call you?"],
      ["user", "Cyrus."],
      ["assistant", "Based on the repeated overnight bites and mattress spotting, this could be bed bugs. This sounds like a high concern issue. If you'd like, Scout can send a short summary and help arrange follow-up with a pest professional."],
      ["user", "Yes, email me the summary and I can do weekday afternoons."],
      ["assistant", "Thanks, Cyrus. I have enough to pass this along for follow-up."],
    ],
  },
  {
    topic: "mice",
    suspectedPest: "mice",
    severity: "high",
    urgencyScore: 76,
    source: "widget",
    status: "scheduling_capture",
    lead: false,
    city: "Phoenix",
    region: "Arizona",
    preferredName: "Dana",
    summaryRequested: false,
    preferredContactMethod: "phone",
    summaryPhone: "+14805550102",
    availabilityNotes: "mornings are best",
    leadOffered: true,
    summary:
      "Repeated droppings and scratching suggest active mouse activity. User is considering professional help.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "I found droppings under the sink and hear scratching in the wall every night."],
      ["assistant", "That may point to active rodent activity. What city or area are you in?"],
      ["user", "Phoenix."],
      ["assistant", "What should I call you?"],
      ["user", "Dana."],
      ["assistant", "Thanks, Dana. This sounds like a high concern mouse issue rather than a one-off sign. If you'd like, Scout can help arrange follow-up with a pest professional."],
      ["user", "Yes, phone is best and mornings usually work."],
      ["assistant", "Perfect. I have your preference and availability. One more step and Scout can package that for follow-up."],
    ],
  },
  {
    topic: "termites",
    suspectedPest: "termites",
    severity: "urgent",
    urgencyScore: 91,
    source: "web",
    status: "handoff_offer",
    lead: false,
    city: "Tampa",
    region: "Florida",
    preferredName: "Miguel",
    leadOffered: true,
    summary:
      "Possible termite activity with wood damage and swarm signs. Professional help strongly recommended.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "I found what looks like wings by the window and some wood around the frame feels hollow."],
      ["assistant", "That can be serious. What city or area are you in?"],
      ["user", "Tampa, Florida."],
      ["assistant", "And what should I call you?"],
      ["user", "Miguel."],
      ["assistant", "Thanks, Miguel. Hollow-sounding wood and discarded wings can point to termite activity. This sounds urgent enough that professional attention is worth considering. If you'd like, Scout can help arrange that."],
    ],
  },
  {
    topic: "cockroaches",
    suspectedPest: "cockroaches",
    severity: "medium",
    urgencyScore: 58,
    source: "widget",
    status: "contact_capture",
    lead: false,
    city: "Houston",
    region: "Texas",
    preferredName: "Janelle",
    summaryRequested: true,
    preferredContactMethod: "email",
    summary:
      "Likely roach activity in the kitchen. User wants a written summary before deciding on next steps.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "I saw a couple roaches in the kitchen at night and there are little dark specks near the stove."],
      ["assistant", "That does sound worth narrowing down. What city or area are you in?"],
      ["user", "Houston."],
      ["assistant", "What should I call you?"],
      ["user", "Janelle."],
      ["assistant", "Thanks, Janelle. This sounds consistent with a moderate cockroach issue, especially with activity around the stove at night. If you'd like, Scout can send a short summary of what to check next."],
      ["user", "Yes please, send it to my email."],
      ["assistant", "Happy to. What email should Scout use?"],
    ],
  },
  {
    topic: "ants",
    suspectedPest: "ants",
    severity: "low",
    urgencyScore: 29,
    source: "web",
    status: "summary_offer",
    lead: false,
    city: "Orlando",
    region: "Florida",
    preferredName: "Avery",
    summaryRequested: false,
    summary:
      "Low concern pantry ants. Scout offered a summary of simple next steps.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "There are tiny ants around the pantry shelf every morning."],
      ["assistant", "What city or area are you in?"],
      ["user", "Orlando."],
      ["assistant", "And what should I call you?"],
      ["user", "Avery."],
      ["assistant", "Thanks, Avery. This sounds like a low concern ant issue. Cleaning the trail and checking for food access points is a good start. If you want, Scout can send you a short summary of those next steps."],
    ],
  },
  {
    topic: "fleas",
    suspectedPest: "fleas",
    severity: "medium",
    urgencyScore: 61,
    source: "widget",
    status: "clarification",
    lead: false,
    city: "Mesa",
    region: "Arizona",
    preferredName: "Rob",
    summary:
      "Possible flea issue, but Scout still needs more context about pets and where bites occur.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "We keep getting bites around the ankles and my dog is scratching a lot."],
      ["assistant", "That could fit a flea issue. What city or area are you in?"],
      ["user", "Mesa."],
      ["assistant", "What should I call you?"],
      ["user", "Rob."],
      ["assistant", "Thanks, Rob. A couple quick details will help: are you noticing bites mostly near carpets or pet bedding, and have you seen any tiny jumping insects?"],
    ],
  },
  {
    topic: "wasps",
    suspectedPest: "wasps",
    severity: "medium",
    urgencyScore: 55,
    source: "web",
    status: "assessment",
    lead: false,
    city: "Austin",
    region: "Texas",
    preferredName: "Lena",
    summary:
      "Possible wasp nest near the attic vent. Assessment delivered but follow-up path not yet chosen.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "There are wasps flying around the attic vent outside and I think there may be a nest."],
      ["assistant", "What city or area are you in?"],
      ["user", "Austin, Texas."],
      ["assistant", "What should I call you?"],
      ["user", "Lena."],
      ["assistant", "Thanks, Lena. This may be a wasp nest near the attic vent. That is usually more than a watch-and-wait issue, especially if activity is steady. I can help you think through next steps."],
    ],
  },
  {
    topic: "unknown bites",
    suspectedPest: null,
    severity: "low",
    urgencyScore: 24,
    source: "widget",
    status: "intake_location",
    lead: false,
    city: null,
    region: null,
    preferredName: null,
    summary:
      "Very early intake conversation with minimal detail so far.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "I think something bit me."],
      ["assistant", "I can help narrow that down. What city or area are you in?"],
    ],
  },
  {
    topic: "hello",
    suspectedPest: null,
    severity: "low",
    urgencyScore: 15,
    source: "web",
    status: "intake_issue",
    lead: false,
    city: null,
    region: null,
    preferredName: null,
    summary:
      "Conversation started but user has not described the issue yet.",
    messages: [
      ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
      ["user", "Hi there."],
      ["assistant", "Tell me what signs you've noticed at home, like bites, droppings, scratching, odors, or visible insects."],
    ],
  },
]

const additionalScenarios = [
  ["rats", "high", 74, "lead_capture"],
  ["spiders", "low", 22, "recommendation"],
  ["mosquitoes", "low", 26, "summary_offer"],
  ["silverfish", "low", 21, "clarification"],
  ["carpenter ants", "medium", 52, "assessment"],
  ["bees", "medium", 63, "handoff_offer"],
  ["rodents", "urgent", 88, "complete"],
  ["bed bugs", "high", 79, "complete"],
  ["roaches", "high", 68, "scheduling_capture"],
  ["termites", "urgent", 94, "complete"],
  ["fleas", "medium", 57, "contact_capture"],
  ["ants", "low", 31, "recommendation"],
]

const names = ["Noah", "Emma", "Sophia", "Liam", "Maya", "Ethan", "Alicia", "Kai", "Nina", "Owen", "Ivy", "Mason"]
const cities = [
  ["Dallas", "Texas"],
  ["Scottsdale", "Arizona"],
  ["Miami", "Florida"],
  ["Tempe", "Arizona"],
  ["Jacksonville", "Florida"],
  ["Plano", "Texas"],
  ["Gilbert", "Arizona"],
  ["St. Petersburg", "Florida"],
  ["Fort Worth", "Texas"],
  ["Chandler", "Arizona"],
  ["Fort Lauderdale", "Florida"],
  ["San Antonio", "Texas"],
]

function titleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildSyntheticScenario(entry, index) {
  const [pest, severity, urgencyScore, status] = entry
  const [city, region] = cities[index % cities.length]
  const preferredName = names[index % names.length]
  const runtime = runtimeVariants[index % runtimeVariants.length]
  const source = index % 2 === 0 ? "web" : "widget"
  const complete = status === "complete"
  const lead = complete
  const leadOffered = ["handoff_offer", "scheduling_capture", "lead_capture", "complete"].includes(status)
  const summaryRequested = ["contact_capture", "handoff_offer", "scheduling_capture", "lead_capture", "complete"].includes(status)
  const summaryEmail = summaryRequested ? `${preferredName.toLowerCase()}${index + 1}@example.com` : null
  const summaryPhone = leadOffered ? `+14085550${String(100 + index).slice(-3)}` : null
  const preferredContactMethod = leadOffered ? (index % 2 === 0 ? "phone" : "email") : summaryRequested ? "email" : null
  const availabilityNotes = leadOffered ? (index % 2 === 0 ? "weekday mornings" : "after 3pm most days") : null
  const suspectedPest = pest
  const summary = `${titleCase(pest)} concern in ${city}. Current stage: ${status.replaceAll("_", " ")}.`

  const messages = [
    ["assistant", "Scout can help you sort through signs of pests at home. Start by describing what you have noticed."],
    ["user", `I think we have ${pest} signs at home. It keeps happening and I want to know how serious it is.`],
    ["assistant", "I can help with that. What city or area are you in?"],
    ["user", `${city}, ${region}.`],
    ["assistant", "And what should I call you?"],
    ["user", preferredName],
    ["assistant", `Thanks, ${preferredName}. Based on what you've described, this could be ${pest}.`],
  ]

  if (["clarification", "assessment"].includes(status)) {
    messages.push(["assistant", "A couple quick details will help Scout narrow this down a bit more."])
  }

  if (["recommendation", "summary_offer", "contact_capture"].includes(status)) {
    messages.push(["assistant", "This does not sound urgent right now, but Scout can outline the next best steps."])
  }

  if (leadOffered) {
    messages.push(["assistant", "This may be worth professional attention. If you want, Scout can help arrange follow-up."])
  }

  if (lead) {
    messages.push(["user", "Yes, please go ahead and set that up."])
    messages.push(["assistant", "Thanks. I have enough to package this as a completed lead."])
  }

  return {
    topic: pest,
    suspectedPest,
    severity,
    urgencyScore,
    source,
    status,
    lead,
    city,
    region,
    preferredName,
    summaryRequested,
    summaryEmail,
    summaryPhone,
    preferredContactMethod,
    availabilityNotes,
    leadOffered,
    summary,
    messages,
    runtime,
    tenantId: index % 4 === 0 ? "sunrise-pest" : "scout-direct",
  }
}

async function ensureSeededTenants() {
  await Promise.all(
    seededTenants.map((tenant) =>
      prisma.tenant.upsert({
        where: { id: tenant.id },
        create: tenant,
        update: tenant,
      }),
    ),
  )
}

async function resetConversationData() {
  await prisma.lead.deleteMany({})
  await prisma.conversationMessage.deleteMany({})
  await prisma.conversation.deleteMany({})
}

async function createScenarioConversation(scenario, index) {
  const runtime = scenario.runtime ?? runtimeVariants[index % runtimeVariants.length]
  const tenantId = scenario.tenantId ?? (index % 5 === 0 ? "sunrise-pest" : "scout-direct")
  const start = new Date(Date.now() - (index + 1) * 1000 * 60 * 37)
  const lastMessageAt = new Date(start.getTime() + scenario.messages.length * 1000 * 60 * 3)

  const conversation = await prisma.conversation.create({
    data: {
      tenantId,
      source: scenario.source,
      locale: "en-US",
      status: scenario.status,
      aiProviderUsed: runtime.provider,
      aiModelUsed: runtime.model,
      preferredName: scenario.preferredName,
      city: scenario.city,
      region: scenario.region,
      summaryRequested: Boolean(scenario.summaryRequested),
      summaryEmail: scenario.summaryEmail ?? null,
      summaryPhone: scenario.summaryPhone ?? null,
      preferredContactMethod: scenario.preferredContactMethod ?? null,
      availabilityNotes: scenario.availabilityNotes ?? null,
      severity: scenario.severity,
      suspectedPest: scenario.suspectedPest,
      urgencyScore: scenario.urgencyScore,
      leadOffered: Boolean(scenario.leadOffered),
      createdAt: start,
      updatedAt: lastMessageAt,
    },
  })

  await prisma.conversationMessage.createMany({
    data: scenario.messages.map(([role, content], messageIndex) => ({
      conversationId: conversation.id,
      role,
      content,
      createdAt: new Date(start.getTime() + messageIndex * 1000 * 60 * 3),
    })),
  })

  if (scenario.lead) {
    await prisma.lead.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        name: scenario.preferredName ?? `Lead ${index + 1}`,
        email: scenario.summaryEmail ?? `${(scenario.preferredName ?? `lead${index + 1}`).toLowerCase()}@example.com`,
        phone: scenario.summaryPhone ?? `+1408555${String(1000 + index).slice(-4)}`,
        preferredContactMethod: scenario.preferredContactMethod ?? "email",
        availabilityNotes: scenario.availabilityNotes ?? "weekday mornings",
        city: scenario.city,
        region: scenario.region,
        suspectedPest: scenario.suspectedPest,
        severity: scenario.severity,
        urgencyScore: scenario.urgencyScore,
        summary: scenario.summary,
        status: index % 3 === 0 ? "review" : index % 3 === 1 ? "contacted" : "new",
        createdAt: new Date(lastMessageAt.getTime() + 1000 * 60 * 5),
      },
    })
  }
}

async function main() {
  await ensureSeededTenants()

  if (shouldReset) {
    await resetConversationData()
  }

  const combined = [
    ...scenarios.map((scenario, index) => ({
      ...scenario,
      runtime: runtimeVariants[index % runtimeVariants.length],
      tenantId: index % 4 === 0 ? "sunrise-pest" : "scout-direct",
    })),
    ...additionalScenarios.map(buildSyntheticScenario),
  ]

  for (const [index, scenario] of combined.entries()) {
    await createScenarioConversation(scenario, index)
  }

  const [conversationCount, leadCount, incompleteCount] = await Promise.all([
    prisma.conversation.count(),
    prisma.lead.count(),
    prisma.conversation.count({
      where: {
        lead: null,
      },
    }),
  ])

  console.log(
    JSON.stringify(
      {
        reset: shouldReset,
        conversationsCreated: combined.length,
        totalConversations: conversationCount,
        totalLeads: leadCount,
        incompleteConversations: incompleteCount,
        modelMix: runtimeVariants,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
