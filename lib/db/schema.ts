import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  uuid,
  serial,
  pgEnum,
  real,
  index,
} from "drizzle-orm/pg-core";

// Enums for better type safety
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "completed",
  "abandoned",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "generated",
  "delivered",
  "viewed",
  "downloaded",
]);

// Users table - for basic user identification and session management
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique().notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),

    // User preferences and metadata
    preferences: jsonb("preferences").$type<{
      emailNotifications?: boolean;
      marketingOptIn?: boolean;
      timezone?: string;
    }>(),

    // Tracking fields
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    referrer: text("referrer"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
  })
);

// Conversations table - tracks each chat session
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    sessionId: text("session_id").notNull(), // For anonymous sessions
    status: conversationStatusEnum("status").default("active").notNull(),

    // Conversation metadata
    currentStep: integer("current_step").default(1).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    totalMessages: integer("total_messages").default(0).notNull(),

    // Variant / profile tracking
    appVariant: text("app_variant"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),

    // Context and analysis data
    contextSummary: jsonb("context_summary").$type<{
      businessType?: string;
      painPoints?: string;
      goals?: string;
      dataAvailable?: string;
      priorTechUse?: string;
      growthIntent?: string;
    }>(),

    initialContext: jsonb("initial_context"),
    websiteAnalysis: jsonb("website_analysis"),
    financialAnalysis: jsonb("financial_analysis"),

    // Research and citations
    researchBrief: text("research_brief"),
    citations: jsonb("citations").$type<
      Array<{
        sourceId: string;
        page?: number;
        url?: string;
      }>
    >(),

    // Lead scoring data
    leadSignals: jsonb("lead_signals").$type<{
      budgetBand?: string;
      authority?: string;
      urgency?: string;
      needClarity?: string;
      dataReadiness?: string;
      stackMaturity?: string;
      complexity?: string;
      geography?: string;
      industry?: string;
      websiteFound?: boolean;
      docsCount?: number;
      researchCoverage?: number;
      score?: number;
    }>(),
  },
  (table) => ({
    userIdIdx: index("conversations_user_id_idx").on(table.userId),
    sessionIdIdx: index("conversations_session_id_idx").on(table.sessionId),
    statusIdx: index("conversations_status_idx").on(table.status),
    createdAtIdx: index("conversations_created_at_idx").on(table.createdAt),
  })
);

// Messages table - individual chat messages
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, {
        onDelete: "cascade",
      })
      .notNull(),

    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),

    // Message metadata
    stepNumber: integer("step_number"),
    isBusinessPlan: boolean("is_business_plan").default(false),
    isFallback: boolean("is_fallback").default(false),

    // AI model information
    modelUsed: text("model_used"),
    tokenCount: integer("token_count"),
    responseTime: integer("response_time"), // milliseconds

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),

    // Additional metadata
    metadata: jsonb("metadata"),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(
      table.conversationId
    ),
    roleIdx: index("messages_role_idx").on(table.role),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// Business Plans table - generated business plans
export const businessPlans = pgTable(
  "business_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    userId: uuid("user_id").references(() => users.id),

    // Plan content
    title: text("title"),
    content: text("content").notNull(), // Markdown content
    htmlContent: text("html_content"), // HTML version for emails

    // Plan metadata
    status: planStatusEnum("status").default("generated").notNull(),
    planLength: integer("plan_length"), // Character count
    generationTime: integer("generation_time"), // seconds (Unix timestamp)

    // AI generation details
    modelUsed: text("model_used"),
    promptVersion: text("prompt_version"),
    templateUsed: text("template_used"),

    // Delivery tracking
    deliveredAt: timestamp("delivered_at"),
    deliveredTo: text("delivered_to"), // email address
    viewedAt: timestamp("viewed_at"),
    downloadedAt: timestamp("downloaded_at"),
    downloadCount: integer("download_count").default(0),

    // Quality metrics
    planHighlights: jsonb("plan_highlights").$type<string[]>(),
    estimatedROI: text("estimated_roi"),
    implementationTimeline: text("implementation_timeline"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("business_plans_conversation_id_idx").on(
      table.conversationId
    ),
    userIdIdx: index("business_plans_user_id_idx").on(table.userId),
    statusIdx: index("business_plans_status_idx").on(table.status),
    createdAtIdx: index("business_plans_created_at_idx").on(table.createdAt),
  })
);

// Leads table - comprehensive lead management
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    businessPlanId: uuid("business_plan_id").references(() => businessPlans.id),

    // Lead identification
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),

    // Tracking
    ipAddress: text("ip_address"),
    appVariant: text("app_variant"),

    // Lead status and scoring
    status: leadStatusEnum("status").default("new").notNull(),
    score: integer("score").default(0), // 0-100
    temperature: text("temperature"), // "hot", "warm", "cold"

    // Lead qualification data
    budgetBand: text("budget_band"),
    authority: text("authority"),
    urgency: text("urgency"),
    needClarity: text("need_clarity"),
    dataReadiness: text("data_readiness"),
    stackMaturity: text("stack_maturity"),
    complexity: text("complexity"),

    // Business context
    industry: text("industry"),
    geography: text("geography"),
    businessType: text("business_type"),
    painPoints: text("pain_points"),
    goals: text("goals"),

    // Engagement tracking
    websiteFound: boolean("website_found").default(false),
    documentsUploaded: integer("documents_uploaded").default(0),
    researchCoverage: real("research_coverage"), // 0-100%

    // Contact attempts and notes
    contactAttempts: integer("contact_attempts").default(0),
    lastContactedAt: timestamp("last_contacted_at"),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    notes: text("notes"),

    // Conversion tracking
    convertedAt: timestamp("converted_at"),
    conversionValue: real("conversion_value"),
    conversionType: text("conversion_type"), // "consultation", "contract", "referral"

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("leads_email_idx").on(table.email),
    statusIdx: index("leads_status_idx").on(table.status),
    scoreIdx: index("leads_score_idx").on(table.score),
    createdAtIdx: index("leads_created_at_idx").on(table.createdAt),
    industryIdx: index("leads_industry_idx").on(table.industry),
  })
);

// File Uploads table - track uploaded files and analysis
export const fileUploads = pgTable(
  "file_uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    userId: uuid("user_id").references(() => users.id),

    // File information
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(), // "pdf", "csv", "txt"
    fileSize: integer("file_size"), // bytes
    filePath: text("file_path"), // if stored permanently

    // Processing status
    status: text("status").default("uploaded").notNull(), // "uploaded", "processing", "analyzed", "failed"
    processingTime: integer("processing_time"), // milliseconds

    // Analysis results
    extractedText: text("extracted_text"),
    analysis: jsonb("analysis"), // Structured analysis results
    confidence: real("confidence"), // 0-1 analysis confidence

    // Error handling
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    analyzedAt: timestamp("analyzed_at"),
  },
  (table) => ({
    conversationIdIdx: index("file_uploads_conversation_id_idx").on(
      table.conversationId
    ),
    statusIdx: index("file_uploads_status_idx").on(table.status),
    createdAtIdx: index("file_uploads_created_at_idx").on(table.createdAt),
  })
);

// Website Analysis table - store website analysis results
export const websiteAnalyses = pgTable(
  "website_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id)
      .notNull(),
    userId: uuid("user_id").references(() => users.id),

    // Website information
    url: text("url").notNull(),
    domain: text("domain"),
    title: text("title"),
    description: text("description"),

    // Analysis results
    productsServices: text("products_services"),
    customerSegment: text("customer_segment"),
    techStack: text("tech_stack"),
    marketingStrengths: text("marketing_strengths"),
    marketingWeaknesses: text("marketing_weaknesses"),

    // Technical details
    contentSample: text("content_sample"),
    metaTags: jsonb("meta_tags"),
    socialLinks: jsonb("social_links").$type<string[]>(),
    contactInfo: jsonb("contact_info"),

    // Processing metadata
    analysisMethod: text("analysis_method"), // "microlink", "direct", "fallback"
    processingTime: integer("processing_time"), // processing duration in milliseconds
    confidence: real("confidence"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("website_analyses_conversation_id_idx").on(
      table.conversationId
    ),
    urlIdx: index("website_analyses_url_idx").on(table.url),
    domainIdx: index("website_analyses_domain_idx").on(table.domain),
    createdAtIdx: index("website_analyses_created_at_idx").on(table.createdAt),
  })
);

// Email Events table - track email delivery and engagement
export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessPlanId: uuid("business_plan_id").references(() => businessPlans.id),
    leadId: uuid("lead_id").references(() => leads.id),

    // Email details
    toEmail: text("to_email").notNull(),
    fromEmail: text("from_email").notNull(),
    subject: text("subject").notNull(),
    emailType: text("email_type").notNull(), // "business_plan", "lead_notification", "follow_up"

    // Delivery tracking
    messageId: text("message_id"), // from email provider
    status: text("status").notNull(), // "sent", "delivered", "opened", "clicked", "bounced", "failed"
    provider: text("provider").default("resend"), // "resend", "sendgrid", etc.

    // Engagement metrics
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    bouncedAt: timestamp("bounced_at"),
    unsubscribedAt: timestamp("unsubscribed_at"),

    // Error handling
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    toEmailIdx: index("email_events_to_email_idx").on(table.toEmail),
    statusIdx: index("email_events_status_idx").on(table.status),
    emailTypeIdx: index("email_events_email_type_idx").on(table.emailType),
    createdAtIdx: index("email_events_created_at_idx").on(table.createdAt),
  })
);

// Analytics Events table - track user behavior and system performance
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    conversationId: uuid("conversation_id").references(() => conversations.id),
    sessionId: text("session_id"),

    // Event details
    eventType: text("event_type").notNull(), // "page_view", "chat_start", "plan_generated", etc.
    eventName: text("event_name").notNull(),
    properties: jsonb("properties"),

    // Context
    page: text("page"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    referrer: text("referrer"),

    // Performance metrics
    loadTime: integer("load_time"), // milliseconds
    responseTime: integer("response_time"), // milliseconds

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    eventTypeIdx: index("analytics_events_event_type_idx").on(table.eventType),
    userIdIdx: index("analytics_events_user_id_idx").on(table.userId),
    sessionIdIdx: index("analytics_events_session_id_idx").on(table.sessionId),
    createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
  })
);

// System Health table - monitor API calls, errors, and performance
export const systemHealth = pgTable(
  "system_health",
  {
    id: serial("id").primaryKey(),

    // Service information
    service: text("service").notNull(), // "nvidia_api", "openai_api", "resend", etc.
    endpoint: text("endpoint"),
    method: text("method"), // "GET", "POST", etc.

    // Request/Response details
    requestId: text("request_id"),
    statusCode: integer("status_code"),
    responseTime: integer("response_time"), // milliseconds

    // Success/Error tracking
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    errorType: text("error_type"), // "timeout", "rate_limit", "auth", etc.

    // Performance metrics
    tokensUsed: integer("tokens_used"),
    costEstimate: real("cost_estimate"), // USD
    modelUsed: text("model_used"),

    // Context
    userId: uuid("user_id").references(() => users.id),
    conversationId: uuid("conversation_id").references(() => conversations.id),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    serviceIdx: index("system_health_service_idx").on(table.service),
    statusCodeIdx: index("system_health_status_code_idx").on(table.statusCode),
    successIdx: index("system_health_success_idx").on(table.success),
    createdAtIdx: index("system_health_created_at_idx").on(table.createdAt),
  })
);

// Type exports for use in the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type BusinessPlan = typeof businessPlans.$inferSelect;
export type NewBusinessPlan = typeof businessPlans.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type FileUpload = typeof fileUploads.$inferSelect;
export type NewFileUpload = typeof fileUploads.$inferInsert;

export type WebsiteAnalysis = typeof websiteAnalyses.$inferSelect;
export type NewWebsiteAnalysis = typeof websiteAnalyses.$inferInsert;

export type EmailEvent = typeof emailEvents.$inferSelect;
export type NewEmailEvent = typeof emailEvents.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export type SystemHealth = typeof systemHealth.$inferSelect;
export type NewSystemHealth = typeof systemHealth.$inferInsert;
