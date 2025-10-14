import { pgTable, index, foreignKey, uuid, text, timestamp, integer, jsonb, boolean, real, unique, serial, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const conversationStatus = pgEnum("conversation_status", ['active', 'completed', 'abandoned'])
export const leadStatus = pgEnum("lead_status", ['new', 'contacted', 'qualified', 'converted', 'lost'])
export const planStatus = pgEnum("plan_status", ['generated', 'delivered', 'viewed', 'downloaded'])


export const emailEvents = pgTable("email_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	businessPlanId: uuid("business_plan_id"),
	leadId: uuid("lead_id"),
	toEmail: text("to_email").notNull(),
	fromEmail: text("from_email").notNull(),
	subject: text().notNull(),
	emailType: text("email_type").notNull(),
	messageId: text("message_id"),
	status: text().notNull(),
	provider: text().default('resend'),
	openedAt: timestamp("opened_at", { mode: 'string' }),
	clickedAt: timestamp("clicked_at", { mode: 'string' }),
	bouncedAt: timestamp("bounced_at", { mode: 'string' }),
	unsubscribedAt: timestamp("unsubscribed_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("email_events_email_type_idx").using("btree", table.emailType.asc().nullsLast().op("text_ops")),
	index("email_events_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("email_events_to_email_idx").using("btree", table.toEmail.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.businessPlanId],
			foreignColumns: [businessPlans.id],
			name: "email_events_business_plan_id_business_plans_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "email_events_lead_id_leads_id_fk"
		}),
]);

export const businessPlans = pgTable("business_plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id"),
	title: text(),
	content: text().notNull(),
	htmlContent: text("html_content"),
	status: planStatus().default('generated').notNull(),
	planLength: integer("plan_length"),
	generationTime: integer("generation_time"),
	modelUsed: text("model_used"),
	promptVersion: text("prompt_version"),
	templateUsed: text("template_used"),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	deliveredTo: text("delivered_to"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }),
	downloadedAt: timestamp("downloaded_at", { mode: 'string' }),
	downloadCount: integer("download_count").default(0),
	planHighlights: jsonb("plan_highlights"),
	estimatedRoi: text("estimated_roi"),
	implementationTimeline: text("implementation_timeline"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("business_plans_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("business_plans_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("business_plans_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("business_plans_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "business_plans_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "business_plans_user_id_users_id_fk"
		}),
]);

export const leads = pgTable("leads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	conversationId: uuid("conversation_id"),
	businessPlanId: uuid("business_plan_id"),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	company: text(),
	status: leadStatus().default('new').notNull(),
	score: integer().default(0),
	temperature: text(),
	budgetBand: text("budget_band"),
	authority: text(),
	urgency: text(),
	needClarity: text("need_clarity"),
	dataReadiness: text("data_readiness"),
	stackMaturity: text("stack_maturity"),
	complexity: text(),
	industry: text(),
	geography: text(),
	businessType: text("business_type"),
	painPoints: text("pain_points"),
	goals: text(),
	websiteFound: boolean("website_found").default(false),
	documentsUploaded: integer("documents_uploaded").default(0),
	researchCoverage: real("research_coverage"),
	contactAttempts: integer("contact_attempts").default(0),
	lastContactedAt: timestamp("last_contacted_at", { mode: 'string' }),
	nextFollowUpAt: timestamp("next_follow_up_at", { mode: 'string' }),
	notes: text(),
	convertedAt: timestamp("converted_at", { mode: 'string' }),
	conversionValue: real("conversion_value"),
	conversionType: text("conversion_type"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	ipAddress: text("ip_address"),
	appVariant: text("app_variant"),
}, (table) => [
	index("leads_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("leads_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("leads_industry_idx").using("btree", table.industry.asc().nullsLast().op("text_ops")),
	index("leads_score_idx").using("btree", table.score.asc().nullsLast().op("int4_ops")),
	index("leads_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.businessPlanId],
			foreignColumns: [businessPlans.id],
			name: "leads_business_plan_id_business_plans_id_fk"
		}),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "leads_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "leads_user_id_users_id_fk"
		}),
]);

export const analyticsEvents = pgTable("analytics_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	conversationId: uuid("conversation_id"),
	sessionId: text("session_id"),
	eventType: text("event_type").notNull(),
	eventName: text("event_name").notNull(),
	properties: jsonb(),
	page: text(),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	referrer: text(),
	loadTime: integer("load_time"),
	responseTime: integer("response_time"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("analytics_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("analytics_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("analytics_events_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("analytics_events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "analytics_events_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "analytics_events_user_id_users_id_fk"
		}),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	role: text().notNull(),
	content: text().notNull(),
	stepNumber: integer("step_number"),
	isBusinessPlan: boolean("is_business_plan").default(false),
	isFallback: boolean("is_fallback").default(false),
	modelUsed: text("model_used"),
	tokenCount: integer("token_count"),
	responseTime: integer("response_time"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb(),
}, (table) => [
	index("messages_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("messages_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { mode: 'string' }).defaultNow(),
	preferences: jsonb(),
	utmSource: text("utm_source"),
	utmMedium: text("utm_medium"),
	utmCampaign: text("utm_campaign"),
	referrer: text(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
}, (table) => [
	index("users_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
]);

export const fileUploads = pgTable("file_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id"),
	fileName: text("file_name").notNull(),
	fileType: text("file_type").notNull(),
	fileSize: integer("file_size"),
	filePath: text("file_path"),
	status: text().default('uploaded').notNull(),
	processingTime: integer("processing_time"),
	extractedText: text("extracted_text"),
	analysis: jsonb(),
	confidence: real(),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
}, (table) => [
	index("file_uploads_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("file_uploads_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("file_uploads_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "file_uploads_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "file_uploads_user_id_users_id_fk"
		}),
]);

export const systemHealth = pgTable("system_health", {
	id: serial().primaryKey().notNull(),
	service: text().notNull(),
	endpoint: text(),
	method: text(),
	requestId: text("request_id"),
	statusCode: integer("status_code"),
	responseTime: integer("response_time"),
	success: boolean().notNull(),
	errorMessage: text("error_message"),
	errorType: text("error_type"),
	tokensUsed: integer("tokens_used"),
	costEstimate: real("cost_estimate"),
	modelUsed: text("model_used"),
	userId: uuid("user_id"),
	conversationId: uuid("conversation_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("system_health_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("system_health_service_idx").using("btree", table.service.asc().nullsLast().op("text_ops")),
	index("system_health_status_code_idx").using("btree", table.statusCode.asc().nullsLast().op("int4_ops")),
	index("system_health_success_idx").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "system_health_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "system_health_user_id_users_id_fk"
		}),
]);

export const websiteAnalyses = pgTable("website_analyses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id"),
	url: text().notNull(),
	domain: text(),
	title: text(),
	description: text(),
	productsServices: text("products_services"),
	customerSegment: text("customer_segment"),
	techStack: text("tech_stack"),
	marketingStrengths: text("marketing_strengths"),
	marketingWeaknesses: text("marketing_weaknesses"),
	contentSample: text("content_sample"),
	metaTags: jsonb("meta_tags"),
	socialLinks: jsonb("social_links"),
	contactInfo: jsonb("contact_info"),
	analysisMethod: text("analysis_method"),
	processingTime: integer("processing_time"),
	confidence: real(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("website_analyses_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("website_analyses_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("website_analyses_domain_idx").using("btree", table.domain.asc().nullsLast().op("text_ops")),
	index("website_analyses_url_idx").using("btree", table.url.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "website_analyses_conversation_id_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "website_analyses_user_id_users_id_fk"
		}),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	sessionId: text("session_id").notNull(),
	status: conversationStatus().default('active').notNull(),
	currentStep: integer("current_step").default(1).notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	totalMessages: integer("total_messages").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	contextSummary: jsonb("context_summary"),
	initialContext: jsonb("initial_context"),
	websiteAnalysis: jsonb("website_analysis"),
	financialAnalysis: jsonb("financial_analysis"),
	researchBrief: text("research_brief"),
	citations: jsonb(),
	leadSignals: jsonb("lead_signals"),
	appVariant: text("app_variant"),
}, (table) => [
	index("conversations_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("conversations_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("conversations_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("conversations_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversations_user_id_users_id_fk"
		}),
]);
