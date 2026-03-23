import type {
  ConversationResponse,
  LeadRecord,
  MessageResponse,
  SeverityAssessment,
  TenantConfig,
} from "@scout/types";

type WidgetPosition = "bottom-right" | "bottom-left";

interface WidgetOptions {
  tenantId: string;
  apiUrl?: string;
  position?: WidgetPosition;
  accentColor?: string;
  title?: string;
}

interface WidgetMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface LeadState {
  name: string;
  email: string;
  phone: string;
  availabilityNotes: string;
  city: string;
  region: string;
}

type CollapsibleSection = "summary" | "lead";

declare global {
  interface Window {
    ScoutWidget?: {
      mount: (options: WidgetOptions) => HTMLElement;
    };
  }
}

const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_TITLE = "Scout";
const DEFAULT_ACCENT = "#111111";
function normalizeApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

const HIDDEN_ASSESSMENT_STATES = new Set([
  "intake",
  "intake_issue",
  "intake_location",
  "intake_name_optional",
]);
const LEAD_CAPTURE_STATES = new Set([
  "scheduling_capture",
  "lead_capture",
]);

const styles = `
  :host {
    all: initial;
  }

  .scout-shell {
    position: fixed;
    inset: auto 24px 24px auto;
    z-index: 2147483000;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #102521;
  }

  .scout-shell[data-position="bottom-left"] {
    inset: auto auto 24px 24px;
  }

  .launcher {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    border: 1px solid rgba(17, 17, 17, 0.12);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    color: #111111;
    cursor: pointer;
    padding: 10px 14px 10px 10px;
    box-shadow: 0 18px 48px rgba(17, 17, 17, 0.12);
    font: inherit;
    backdrop-filter: blur(14px);
    transition:
      transform 140ms ease,
      box-shadow 140ms ease,
      border-color 140ms ease;
  }

  .launcher:hover {
    transform: translateY(-1px);
    border-color: rgba(17, 17, 17, 0.2);
    box-shadow: 0 20px 54px rgba(17, 17, 17, 0.16);
  }

  .launcher-icon {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #111111;
    color: white;
    flex: 0 0 auto;
  }

  .launcher-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .launcher-label {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.1;
    color: #111111;
  }

  .launcher-hint {
    font-size: 11px;
    line-height: 1.2;
    color: #6b6b6b;
  }

  .panel {
    width: min(420px, calc(100vw - 28px));
    height: min(700px, calc(100vh - 88px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(17, 17, 17, 0.1);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 28px 90px rgba(17, 17, 17, 0.14);
    backdrop-filter: blur(20px);
  }

  .header {
    padding: 16px 16px 14px;
    background: #ffffff;
    border-bottom: 1px solid rgba(17, 17, 17, 0.08);
  }

  .eyebrow {
    display: none;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .title {
    font-size: 17px;
    line-height: 1.2;
    font-weight: 700;
    margin: 0;
    color: #111111;
  }

  .subtitle {
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.45;
    color: #6b6b6b;
  }

  .close-button {
    border: 1px solid rgba(17, 17, 17, 0.08);
    background: #fafafa;
    color: #111111;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    cursor: pointer;
    flex: 0 0 auto;
    font-size: 17px;
  }

  .assessment {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 16px;
    background: #fafafa;
    border: 1px solid rgba(17, 17, 17, 0.06);
  }

  .assessment-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .assessment-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: #111111;
    color: #ffffff;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .assessment-meta {
    font-size: 12px;
    font-weight: 700;
    color: #111111;
  }

  .assessment-copy {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: #6b6b6b;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b6b6b;
  }

  .section-toggle {
    border: 1px solid rgba(17, 17, 17, 0.08);
    background: #ffffff;
    color: #111111;
    border-radius: 999px;
    padding: 5px 9px;
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .messages {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 14px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
  }

  .message {
    max-width: 88%;
    margin-bottom: 10px;
    padding: 11px 13px;
    border-radius: 18px;
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message.assistant {
    background: #f7f7f7;
    color: #111111;
    border: 1px solid rgba(17, 17, 17, 0.06);
  }

  .message.user {
    margin-left: auto;
    background: #111111;
    color: #ffffff;
  }

  .typing {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 18px;
    border: 1px solid rgba(17, 17, 17, 0.06);
    background: #f7f7f7;
    color: #707070;
    padding: 14px 15px;
  }

  .typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
    animation: scout-dot-bounce 1.1s infinite ease-in-out;
  }

  .typing-dot:nth-child(2) {
    animation-delay: 0.14s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: 0.28s;
  }

  .empty-state {
    padding: 16px;
    border-radius: 18px;
    background: #fafafa;
    border: 1px dashed rgba(17, 17, 17, 0.12);
    color: #6b6b6b;
    font-size: 12px;
    line-height: 1.6;
  }

  .error {
    margin: 0 14px 12px;
    padding: 10px 12px;
    border-radius: 14px;
    background: #fff3f3;
    color: #8c1d1d;
    font-size: 12px;
  }

  .composer {
    border-top: 1px solid rgba(17, 17, 17, 0.08);
    padding: 12px 14px 14px;
    background: #ffffff;
  }

  .composer textarea,
  .lead-form input,
  .lead-form textarea {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    color: #111111;
    border: 1px solid rgba(17, 17, 17, 0.1);
    background: #ffffff;
    border-radius: 16px;
  }

  .composer textarea {
    min-height: 74px;
    padding: 11px 13px;
    resize: vertical;
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
  }

  .composer-copy {
    font-size: 11px;
    line-height: 1.4;
    color: #7a7a7a;
  }

  .button {
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 10px 15px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .button.primary {
    background: #111111;
    color: white;
  }

  .button.secondary {
    background: #f6f6f6;
    color: #111111;
    border-color: rgba(17, 17, 17, 0.08);
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .lead-card {
    margin: 0 14px 12px;
    padding: 12px;
    border-radius: 16px;
    background: #fafafa;
    border: 1px solid rgba(17, 17, 17, 0.08);
  }

  .lead-card h3 {
    margin: 0;
    font-size: 13px;
    color: #111111;
  }

  .lead-card p {
    margin: 6px 0 0;
    font-size: 11px;
    line-height: 1.45;
    color: #6b6b6b;
  }

  .lead-form {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }

  .lead-form input,
  .lead-form textarea {
    padding: 9px 11px;
    font-size: 12px;
    border-radius: 14px;
  }

  .lead-form textarea {
    min-height: 72px;
    resize: vertical;
  }

  .lead-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lead-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  .lead-actions-copy {
    font-size: 10px;
    line-height: 1.4;
    color: #7a7a7a;
  }

  .lead-success {
    margin: 0 14px 12px;
    padding: 12px;
    border-radius: 16px;
    background: #f5f5f5;
    color: #111111;
    font-size: 12px;
    line-height: 1.5;
  }

  .collapsed-card {
    margin: 0 14px 12px;
    padding: 10px 12px;
    border-radius: 16px;
    background: #fafafa;
    border: 1px solid rgba(17, 17, 17, 0.08);
  }

  .collapsed-card-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .collapsed-card-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .collapsed-card-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b6b6b;
  }

  .collapsed-card-text {
    font-size: 12px;
    color: #111111;
    line-height: 1.4;
  }

  .collapsed-card-action {
    flex: 0 0 auto;
  }

  @keyframes scout-dot-bounce {
    0%,
    80%,
    100% {
      transform: translateY(0);
      opacity: 0.35;
    }
    40% {
      transform: translateY(-3px);
      opacity: 1;
    }
  }
`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSeverityLabel(severity: SeverityAssessment["severity"]) {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function formatActionLabel(action: SeverityAssessment["recommendedAction"]) {
  return action.replaceAll("_", " ");
}

function formatConcernLabel(severity: SeverityAssessment["severity"]) {
  switch (severity) {
    case "urgent":
      return "Urgent concern";
    case "high":
      return "High concern";
    case "medium":
      return "Moderate concern";
    default:
      return "Low concern";
  }
}

function buildAssessmentSummary(assessment: SeverityAssessment) {
  if (assessment.recommendedAction === "urgent_professional_help") {
    return "Scout thinks this may be urgent and professional help is the safest next step.";
  }

  if (
    assessment.professionalHelpRecommended ||
    assessment.recommendedAction === "professional_help"
  ) {
    if (assessment.suspectedPest) {
      return `Scout is leaning toward ${assessment.suspectedPest.toLowerCase()} and thinks this may need professional attention.`;
    }

    return "Scout thinks this may need professional attention based on what has been shared so far.";
  }

  if (assessment.recommendedAction === "collect_more_context") {
    if (assessment.suspectedPest) {
      return `Scout is leaning toward ${assessment.suspectedPest.toLowerCase()}, but a little more detail will help confirm the next step.`;
    }

    return "Scout is still narrowing this down and needs a bit more context to guide the next step.";
  }

  if (assessment.suspectedPest) {
    if (assessment.severity === "medium") {
      return `Scout thinks this may be related to ${assessment.suspectedPest.toLowerCase()} and sees signs that it may be more than a one-off issue.`;
    }

    return `Scout thinks this may be related to ${assessment.suspectedPest.toLowerCase()} and does not see strong urgency so far.`;
  }

  if (assessment.severity === "medium") {
    return "Scout sees signs that this may be more than a one-off issue, but it does not look highly urgent yet.";
  }

  return "Scout is still narrowing this down based on the signs shared so far.";
}

function renderLauncherIcon() {
  return `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8.5H17M7 12H14M21 11.2C21 15.95 17.02 19.8 12 19.8C10.78 19.8 9.61 19.58 8.54 19.17L4 20.8L5.45 16.84C4.54 15.62 4 14.14 4 12.55C4 7.8 7.98 3.95 13 3.95C18.02 3.95 21 6.45 21 11.2Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

async function request<T>(
  apiUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${normalizeApiBaseUrl(apiUrl)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Scout widget request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

class ScoutWidgetElement extends HTMLElement {
  private root: ShadowRoot;
  private open = false;
  private booted = false;
  private booting = false;
  private sending = false;
  private submittingLead = false;
  private conversationId: string | null = null;
  private conversationStatus: MessageResponse["conversation"]["status"] | null =
    null;
  private messages: WidgetMessage[] = [];
  private assessment: SeverityAssessment | null = null;
  private error: string | null = null;
  private lead: LeadRecord | null = null;
  private tenant: TenantConfig | null = null;
  private draft = "";
  private summaryCollapsed = false;
  private leadCollapsed = false;
  private leadState: LeadState = {
    name: "",
    email: "",
    phone: "",
    availabilityNotes: "",
    city: "",
    region: "",
  };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.loadTenant();
    this.render();
  }

  static get observedAttributes() {
    return ["tenant-id", "api-url", "position", "accent-color", "widget-title"];
  }

  attributeChangedCallback() {
    this.render();
  }

  private get tenantId() {
    return this.getAttribute("tenant-id") ?? "scout-direct";
  }

  private get apiUrl() {
    return this.getAttribute("api-url") ?? DEFAULT_API_URL;
  }

  private get position() {
    return (
      (this.getAttribute("position") as WidgetPosition | null) ?? "bottom-right"
    );
  }

  private get accentColor() {
    return this.getAttribute("accent-color") ?? DEFAULT_ACCENT;
  }

  private get widgetTitle() {
    return (
      this.getAttribute("widget-title") ??
      this.tenant?.brandName ??
      DEFAULT_TITLE
    );
  }

  private get canShowLeadForm() {
    return (
      !HIDDEN_ASSESSMENT_STATES.has(this.conversationStatus ?? "intake") &&
      LEAD_CAPTURE_STATES.has(this.conversationStatus ?? "intake") &&
      !this.lead &&
      Boolean(this.assessment?.professionalHelpRecommended) &&
      Boolean(this.conversationId)
    );
  }

  private get summary() {
    const lastUserMessage = [...this.messages]
      .reverse()
      .find((message) => message.role === "user")?.content;

    if (!lastUserMessage || !this.assessment) {
      return "";
    }

    return `${lastUserMessage} Severity: ${this.assessment.severity}. Recommended action: ${this.assessment.recommendedAction}.`;
  }

  private async loadTenant() {
    try {
      this.tenant = await request<TenantConfig>(
        this.apiUrl,
        `/v1/tenants/${this.tenantId}`,
      );
      this.render();
    } catch {
      this.tenant = null;
      this.render();
    }
  }

  private async ensureConversation() {
    if (this.booted || this.booting) {
      return;
    }

    this.booting = true;
    this.error = null;
    this.render();

    try {
      const response = await request<ConversationResponse>(
        this.apiUrl,
        "/v1/conversations",
        {
          method: "POST",
          body: JSON.stringify({
            tenantId: this.tenantId,
            source: "widget",
            locale: "en-US",
          }),
        },
      );

      this.conversationId = response.conversation.id;
      this.conversationStatus = response.conversation.status;
      this.messages = [
        {
          id: `${response.conversation.id}-greeting`,
          role: "assistant",
          content: response.greeting,
        },
      ];
      this.leadState = {
        ...this.leadState,
        name: response.conversation.preferredName ?? this.leadState.name,
        email: response.conversation.summaryEmail ?? this.leadState.email,
        phone: response.conversation.summaryPhone ?? this.leadState.phone,
        availabilityNotes:
          response.conversation.availabilityNotes ?? this.leadState.availabilityNotes,
        city: response.conversation.city ?? this.leadState.city,
        region: response.conversation.region ?? this.leadState.region,
      };
      this.booted = true;
    } catch {
      this.error = "Scout could not start right now.";
    } finally {
      this.booting = false;
      this.render();
    }
  }

  private async handleSend() {
    const message = this.draft.trim();

    if (!message || !this.conversationId || this.sending) {
      return;
    }

    this.sending = true;
    this.error = null;
    this.messages = [
      ...this.messages,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      },
    ];
    this.draft = "";
    this.render();

    try {
      const response = await request<MessageResponse>(
        this.apiUrl,
        "/v1/chat/messages",
        {
          method: "POST",
          body: JSON.stringify({
            tenantId: this.tenantId,
            conversationId: this.conversationId,
            message,
          }),
        },
      );

      this.assessment = response.assessment;
      this.conversationStatus = response.conversation.status;
      this.leadState = {
        ...this.leadState,
        name: response.conversation.preferredName ?? this.leadState.name,
        email: response.conversation.summaryEmail ?? this.leadState.email,
        phone: response.conversation.summaryPhone ?? this.leadState.phone,
        availabilityNotes:
          response.conversation.availabilityNotes ?? this.leadState.availabilityNotes,
        city: response.conversation.city ?? this.leadState.city,
        region: response.conversation.region ?? this.leadState.region,
      };
      this.messages = [
        ...this.messages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.assistantMessage,
        },
      ];
    } catch {
      this.error = "Scout could not process that message. Please try again.";
    } finally {
      this.sending = false;
      this.render();
    }
  }

  private async handleLeadSubmit() {
    if (
      !this.conversationId ||
      !this.assessment ||
      !this.leadState.name.trim() ||
      this.submittingLead
    ) {
      return;
    }

    this.submittingLead = true;
    this.error = null;
    this.render();

    try {
      this.lead = await request<LeadRecord>(this.apiUrl, "/v1/leads", {
        method: "POST",
        body: JSON.stringify({
          tenantId: this.tenantId,
          conversationId: this.conversationId,
          name: this.leadState.name.trim(),
          email: this.leadState.email.trim() || undefined,
          phone: this.leadState.phone.trim() || undefined,
          preferredContactMethod: this.leadState.phone.trim()
            ? "phone"
            : this.leadState.email.trim()
              ? "email"
              : undefined,
          availabilityNotes: this.leadState.availabilityNotes.trim() || undefined,
          city: this.leadState.city.trim() || undefined,
          region: this.leadState.region.trim() || undefined,
          suspectedPest: this.assessment.suspectedPest ?? undefined,
          severity: this.assessment.severity,
          urgencyScore: this.assessment.urgencyScore,
          summary: this.summary,
        }),
      });
    } catch {
      this.error = "Scout could not save your details right now.";
    } finally {
      this.submittingLead = false;
      this.render();
    }
  }

  private toggleSection(section: CollapsibleSection) {
    if (section === "summary") {
      this.summaryCollapsed = !this.summaryCollapsed;
    }

    if (section === "lead") {
      this.leadCollapsed = !this.leadCollapsed;
    }

    this.render();
  }

  private bindEvents() {
    const launcher = this.root.querySelector<HTMLButtonElement>(
      "[data-role='launcher']",
    );
    launcher?.addEventListener("click", async () => {
      this.open = !this.open;
      this.render();

      if (this.open) {
        await this.ensureConversation();
      }
    });

    const closeButton = this.root.querySelector<HTMLButtonElement>(
      "[data-role='close']",
    );
    closeButton?.addEventListener("click", () => {
      this.open = false;
      this.render();
    });

    const textarea = this.root.querySelector<HTMLTextAreaElement>(
      "[data-role='composer']",
    );
    textarea?.addEventListener("input", (event) => {
      this.draft = (event.currentTarget as HTMLTextAreaElement).value;
    });
    textarea?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.handleSend();
      }
    });

    const sendButton =
      this.root.querySelector<HTMLButtonElement>("[data-role='send']");
    sendButton?.addEventListener("click", () => {
      void this.handleSend();
    });

    const leadForm = this.root.querySelector<HTMLFormElement>(
      "[data-role='lead-form']",
    );
    leadForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.handleLeadSubmit();
    });

    this.root
      .querySelectorAll<HTMLButtonElement>("[data-toggle-section]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const section = button.dataset.toggleSection as
            | CollapsibleSection
            | undefined;

          if (!section) {
            return;
          }

          this.toggleSection(section);
        });
      });

    this.root
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-lead]")
      .forEach((input) => {
        input.addEventListener("input", (event) => {
          const target = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
          const field = target.dataset.lead as keyof LeadState;
          this.leadState = {
            ...this.leadState,
            [field]: target.value,
          };
        });
      });

    const messagesContainer = this.root.querySelector<HTMLElement>(".messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private renderMessages() {
    if (this.booting) {
      return `<div class="empty-state">Starting Scout...</div>`;
    }

    if (!this.messages.length) {
      return `<div class="empty-state">Describe what you are seeing at home and Scout will help sort it out.</div>`;
    }

    const renderedMessages = this.messages
      .map(
        (message) =>
          `<div class="message ${message.role}">${escapeHtml(message.content)}</div>`,
      )
      .join("");

    const typingIndicator = this.sending
      ? `
        <div class="typing" aria-label="Scout is typing">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      `
      : "";

    return `${renderedMessages}${typingIndicator}`;
  }

  private renderAssessment() {
    if (
      !this.assessment ||
      HIDDEN_ASSESSMENT_STATES.has(this.conversationStatus ?? "intake")
    ) {
      return "";
    }

    if (this.summaryCollapsed) {
      return `
        <section class="collapsed-card">
          <div class="collapsed-card-row">
            <div class="collapsed-card-copy">
              <span class="collapsed-card-title">Summary</span>
              <span class="collapsed-card-text">${escapeHtml(formatConcernLabel(this.assessment.severity))} · ${escapeHtml(this.assessment.suspectedPest ?? "Still assessing")}</span>
            </div>
            <button class="section-toggle collapsed-card-action" type="button" data-toggle-section="summary">Show</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="assessment">
        <div class="section-header">
          <span class="section-title">Summary</span>
          <button class="section-toggle" type="button" data-toggle-section="summary">Hide</button>
        </div>
        <div class="assessment-top" style="margin-top: 10px;">
          <span class="assessment-badge">${escapeHtml(formatConcernLabel(this.assessment.severity))}</span>
          <span class="assessment-meta">${escapeHtml(this.assessment.suspectedPest ?? "Still assessing")}</span>
        </div>
        <p class="assessment-copy">${escapeHtml(buildAssessmentSummary(this.assessment))}</p>
      </section>
    `;
  }

  private renderLeadBlock() {
    if (this.lead) {
      return `<div class="lead-success">Details saved. A follow-up can happen from here.</div>`;
    }

    if (!this.canShowLeadForm) {
      return "";
    }

    if (this.leadCollapsed) {
      return `
        <section class="collapsed-card">
          <div class="collapsed-card-row">
            <div class="collapsed-card-copy">
              <span class="collapsed-card-title">Professional Help</span>
            </div>
            <button class="section-toggle collapsed-card-action" type="button" data-toggle-section="lead">Show</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="lead-card">
        <div class="section-header">
          <div>
            <span class="section-title">Professional Help</span>
            <h3>Need professional help?</h3>
            <p>Leave a few details for follow-up.</p>
          </div>
          <button class="section-toggle" type="button" data-toggle-section="lead">Hide</button>
        </div>
        <form class="lead-form" data-role="lead-form">
          <input data-lead="name" name="name" placeholder="Name" value="${escapeHtml(this.leadState.name)}" />
          <div class="lead-grid">
            <input data-lead="email" name="email" placeholder="Email" value="${escapeHtml(this.leadState.email)}" />
            <input data-lead="phone" name="phone" placeholder="Phone" value="${escapeHtml(this.leadState.phone)}" />
          </div>
          <textarea data-lead="availabilityNotes" name="availabilityNotes" placeholder="Preferred day or time">${escapeHtml(this.leadState.availabilityNotes)}</textarea>
          <div class="lead-grid">
            <input data-lead="city" name="city" placeholder="City" value="${escapeHtml(this.leadState.city)}" />
            <input data-lead="region" name="region" placeholder="State" value="${escapeHtml(this.leadState.region)}" />
          </div>
          <div class="lead-actions">
            <span class="lead-actions-copy">Only shared if they ask for follow-up.</span>
            <button class="button primary" type="submit" ${this.submittingLead ? "disabled" : ""}>
              ${this.submittingLead ? "Saving..." : "Share"}
            </button>
          </div>
        </form>
      </section>
    `;
  }

  private render() {
    const body = this.open
      ? `
        <section class="panel">
          <div class="header">
            <div class="title-row">
              <div>
                <h2 class="title">${escapeHtml(this.widgetTitle)}</h2>
                <p class="subtitle">Describe the signs and get a calm next step.</p>
              </div>
              <button class="close-button" data-role="close" aria-label="Close Scout widget">×</button>
            </div>
            ${this.renderAssessment()}
          </div>
          <div class="messages">${this.renderMessages()}</div>
          ${this.error ? `<div class="error">${escapeHtml(this.error)}</div>` : ""}
          ${this.renderLeadBlock()}
          <div class="composer">
            <textarea
              data-role="composer"
              placeholder="What signs are you noticing?"
            >${escapeHtml(this.draft)}</textarea>
            <div class="composer-footer">
              <div class="composer-copy">Short, clear details work best.</div>
              <button
                class="button primary"
                data-role="send"
                ${!this.conversationId || this.sending ? "disabled" : ""}
              >
                ${this.sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>
      `
      : `
        <button class="launcher" data-role="launcher" aria-label="Open Scout widget">
          <span class="launcher-icon">${renderLauncherIcon()}</span>
          <span class="launcher-copy">
            <span class="launcher-label">${escapeHtml(this.widgetTitle)}</span>
            <span class="launcher-hint">Ask about pests</span>
          </span>
        </button>
      `;

    const shell = `
      <style>
        :host { --accent: ${this.accentColor}; }
        ${styles}
      </style>
      <div class="scout-shell" data-position="${this.position}">
        ${body}
      </div>
    `;

    this.root.innerHTML = shell;
    this.bindEvents();
  }
}

export function mountScoutWidget(options: WidgetOptions) {
  const element = document.createElement("scout-widget");

  element.setAttribute("tenant-id", options.tenantId);

  if (options.apiUrl) {
    element.setAttribute("api-url", options.apiUrl);
  }

  if (options.position) {
    element.setAttribute("position", options.position);
  }

  if (options.accentColor) {
    element.setAttribute("accent-color", options.accentColor);
  }

  if (options.title) {
    element.setAttribute("widget-title", options.title);
  }

  document.body.appendChild(element);
  return element;
}

if (!customElements.get("scout-widget")) {
  customElements.define("scout-widget", ScoutWidgetElement);
}

window.ScoutWidget = {
  mount: mountScoutWidget,
};
