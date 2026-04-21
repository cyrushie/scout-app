import { z } from "zod"

export const severityEnum = z.enum(["low", "medium", "high", "urgent"])
export const sourceEnum = z.enum(["web", "widget", "dashboard"])
export const leadStatusEnum = z.enum(["new", "review", "contacted", "closed"])
export const contactMethodEnum = z.enum(["email", "phone"])
export const aiProviderEnum = z.enum(["groq", "gemini", "zai", "openrouter"])

export const createConversationSchema = z.object({
  tenantId: z.string().min(1),
  source: sourceEnum.default("web"),
  locale: z.string().default("en-US"),
})

export const createMessageSchema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
  message: z.string().min(1),
})

export const createLeadSchema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  preferredContactMethod: contactMethodEnum.optional(),
  availabilityNotes: z.string().min(1).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  suspectedPest: z.string().optional(),
  severity: severityEnum,
  urgencyScore: z.number().min(0).max(100),
  summary: z.string().min(1),
})

export const tenantQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
})

const tenantIdSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Tenant ids must be lowercase and use hyphens only.")

const tenantSettingsSchema = z.object({
  companyName: z.string().trim().min(1),
  brandName: z.string().trim().min(1),
  widgetAccentColor: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Widget accent color must be a valid hex color.")
    .optional(),
  allowedDomains: z.array(z.string().trim().min(1)),
  serviceAreas: z.array(z.string().trim().min(1)),
  supportEmail: z.string().trim().email(),
  widgetEnabled: z.boolean(),
  assistantVoice: z.string().trim().min(1),
  scoutInstructions: z.string().trim(),
})

export const createTenantSchema = tenantSettingsSchema.extend({
  id: tenantIdSchema,
})

export const updateTenantSchema = tenantSettingsSchema

export const leadQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  status: leadStatusEnum.optional(),
  severity: severityEnum.optional(),
  search: z.string().trim().min(1).optional(),
})

export const conversationStatusEnum = z.enum([
  "intake",
  "intake_issue",
  "intake_location",
  "intake_name_optional",
  "clarification",
  "assessment",
  "recommendation",
  "summary_offer",
  "contact_capture",
  "handoff_offer",
  "scheduling_capture",
  "lead_capture",
  "complete",
])

export const conversationQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  status: conversationStatusEnum.optional(),
  severity: severityEnum.optional(),
  source: sourceEnum.optional(),
  search: z.string().trim().min(1).optional(),
  leadCreated: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
})

export const tenantParamsSchema = z.object({
  tenantId: z.string().min(1),
})

export const leadParamsSchema = z.object({
  leadId: z.string().min(1),
})

export const conversationParamsSchema = z.object({
  conversationId: z.string().min(1),
})

export const updateLeadSchema = z.object({
  status: leadStatusEnum.optional(),
})

export const updateAiRuntimeSchema = z.object({
  provider: aiProviderEnum,
  model: z.string().trim().min(1),
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateAiRuntimeInput = z.infer<typeof updateAiRuntimeSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
