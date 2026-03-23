export type SeverityLevel = "low" | "medium" | "high" | "urgent"

export type ConversationStatus =
  | "intake"
  | "intake_issue"
  | "intake_location"
  | "intake_name_optional"
  | "clarification"
  | "assessment"
  | "recommendation"
  | "summary_offer"
  | "contact_capture"
  | "handoff_offer"
  | "scheduling_capture"
  | "lead_capture"
  | "complete"

export type RecommendedAction =
  | "monitor"
  | "home_action"
  | "collect_more_context"
  | "professional_help"
  | "urgent_professional_help"

export type LeadStatus = "new" | "review" | "contacted" | "closed"

export type MessageRole = "system" | "assistant" | "user"

export type SourceChannel = "web" | "widget" | "dashboard"

export type ContactMethod = "email" | "phone"
export type AiProvider = "groq" | "gemini" | "zai" | "openrouter"

export interface TenantConfig {
  id: string
  companyName: string
  brandName: string
  allowedDomains: string[]
  serviceAreas: string[]
  supportEmail: string
  widgetEnabled: boolean
  assistantVoice: string
}

export interface AiRuntimeConfig {
  provider: AiProvider
  model: string
  updatedAt: string
}

export interface ConversationRecord {
  id: string
  tenantId: string
  source: SourceChannel
  locale: string
  status: ConversationStatus
  aiProviderUsed?: AiProvider
  aiModelUsed?: string
  preferredName?: string
  city?: string
  region?: string
  summaryRequested: boolean
  summaryEmail?: string
  summaryPhone?: string
  preferredContactMethod?: ContactMethod
  availabilityNotes?: string
  severity: SeverityLevel
  suspectedPest: string | null
  urgencyScore: number
  leadOffered: boolean
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  createdAt: string
}

export interface SeverityAssessment {
  severity: SeverityLevel
  urgencyScore: number
  suspectedPest: string | null
  reasoning: string[]
  recommendedAction: RecommendedAction
  professionalHelpRecommended: boolean
}

export interface ConversationResponse {
  conversation: ConversationRecord
  greeting: string
}

export interface MessageResponse {
  conversation: ConversationRecord
  assistantMessage: string
  assessment: SeverityAssessment
  mode: "ai" | "fallback" | "guided"
}

export interface ConversationFilters {
  tenantId?: string
  status?: ConversationStatus
  severity?: SeverityLevel
  source?: SourceChannel
  search?: string
  leadCreated?: boolean
}

export interface ConversationListItem extends ConversationRecord {
  messageCount: number
  leadCreated: boolean
  leadId?: string
}

export interface ConversationDetail {
  conversation: ConversationRecord
  messages: ConversationMessage[]
  lead?: LeadRecord
}

export interface LeadRecord {
  id: string
  displayId: string
  tenantId: string
  conversationId: string
  name: string
  email?: string
  phone?: string
  preferredContactMethod?: ContactMethod
  availabilityNotes?: string
  city?: string
  region?: string
  suspectedPest?: string
  severity: SeverityLevel
  urgencyScore: number
  summary: string
  status: LeadStatus
  createdAt: string
}

export interface LeadFilters {
  tenantId?: string
  status?: LeadStatus
  severity?: SeverityLevel
  search?: string
}

export interface LeadDetail extends LeadRecord {
  conversation: ConversationRecord
  messages: ConversationMessage[]
}

export interface DashboardMetric {
  key: string
  label: string
  value: string
  detail: string
}

export interface LeadQueueItem {
  id: string
  pest: string
  severity: SeverityLevel
  location: string
  status: LeadStatus
  summary: string
}

export interface AnalyticsOverview {
  tenantId?: string
  metrics: DashboardMetric[]
  recentLeads: LeadQueueItem[]
  recentConversations: ConversationListItem[]
  severityMix: Array<{
    severity: SeverityLevel
    count: number
  }>
  funnel: Array<{
    key: string
    label: string
    count: number
  }>
}

export interface ConversationStateCount {
  status: ConversationStatus
  count: number
}

export interface DropOffStateMetric {
  status: ConversationStatus
  count: number
  avgUrgency: number
  highSeverityCount: number
}

export interface PestCategoryMetric {
  pest: string
  count: number
}

export interface ConversationAnalytics {
  tenantId?: string
  funnel: Array<{
    key: string
    label: string
    count: number
  }>
  stateDistribution: ConversationStateCount[]
  dropOffByState: DropOffStateMetric[]
  highIntentIncomplete: ConversationListItem[]
  topPests: PestCategoryMetric[]
  modelPerformance: Array<{
    provider: AiProvider
    model: string
    conversations: number
    completedLeads: number
    conversionRate: number
    avgUrgency: number
    highSeverityCount: number
  }>
}
