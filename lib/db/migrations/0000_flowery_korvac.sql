CREATE TYPE "public"."conversation_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('generated', 'delivered', 'viewed', 'downloaded');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"conversation_id" uuid,
	"session_id" text,
	"event_type" text NOT NULL,
	"event_name" text NOT NULL,
	"properties" jsonb,
	"page" text,
	"user_agent" text,
	"ip_address" text,
	"referrer" text,
	"load_time" integer,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid,
	"title" text,
	"content" text NOT NULL,
	"html_content" text,
	"status" "plan_status" DEFAULT 'generated' NOT NULL,
	"plan_length" integer,
	"generation_time" integer,
	"model_used" text,
	"prompt_version" text,
	"template_used" text,
	"delivered_at" timestamp,
	"delivered_to" text,
	"viewed_at" timestamp,
	"downloaded_at" timestamp,
	"download_count" integer DEFAULT 0,
	"plan_highlights" jsonb,
	"estimated_roi" text,
	"implementation_timeline" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"context_summary" jsonb,
	"initial_context" jsonb,
	"website_analysis" jsonb,
	"financial_analysis" jsonb,
	"research_brief" text,
	"citations" jsonb,
	"lead_signals" jsonb
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_plan_id" uuid,
	"lead_id" uuid,
	"to_email" text NOT NULL,
	"from_email" text NOT NULL,
	"subject" text NOT NULL,
	"email_type" text NOT NULL,
	"message_id" text,
	"status" text NOT NULL,
	"provider" text DEFAULT 'resend',
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"unsubscribed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer,
	"file_path" text,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"processing_time" integer,
	"extracted_text" text,
	"analysis" jsonb,
	"confidence" real,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"analyzed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"conversation_id" uuid,
	"business_plan_id" uuid,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0,
	"temperature" text,
	"budget_band" text,
	"authority" text,
	"urgency" text,
	"need_clarity" text,
	"data_readiness" text,
	"stack_maturity" text,
	"complexity" text,
	"industry" text,
	"geography" text,
	"business_type" text,
	"pain_points" text,
	"goals" text,
	"website_found" boolean DEFAULT false,
	"documents_uploaded" integer DEFAULT 0,
	"research_coverage" real,
	"contact_attempts" integer DEFAULT 0,
	"last_contacted_at" timestamp,
	"next_follow_up_at" timestamp,
	"notes" text,
	"converted_at" timestamp,
	"conversion_value" real,
	"conversion_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"step_number" integer,
	"is_business_plan" boolean DEFAULT false,
	"is_fallback" boolean DEFAULT false,
	"model_used" text,
	"token_count" integer,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "system_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"endpoint" text,
	"method" text,
	"request_id" text,
	"status_code" integer,
	"response_time" integer,
	"success" boolean NOT NULL,
	"error_message" text,
	"error_type" text,
	"tokens_used" integer,
	"cost_estimate" real,
	"model_used" text,
	"user_id" uuid,
	"conversation_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now(),
	"preferences" jsonb,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer" text,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "website_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid,
	"url" text NOT NULL,
	"domain" text,
	"title" text,
	"description" text,
	"products_services" text,
	"customer_segment" text,
	"tech_stack" text,
	"marketing_strengths" text,
	"marketing_weaknesses" text,
	"content_sample" text,
	"meta_tags" jsonb,
	"social_links" jsonb,
	"contact_info" jsonb,
	"analysis_method" text,
	"processing_time" integer,
	"confidence" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_business_plan_id_business_plans_id_fk" FOREIGN KEY ("business_plan_id") REFERENCES "public"."business_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_plan_id_business_plans_id_fk" FOREIGN KEY ("business_plan_id") REFERENCES "public"."business_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_health" ADD CONSTRAINT "system_health_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_health" ADD CONSTRAINT "system_health_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_analyses" ADD CONSTRAINT "website_analyses_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_analyses" ADD CONSTRAINT "website_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_session_id_idx" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "business_plans_conversation_id_idx" ON "business_plans" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "business_plans_user_id_idx" ON "business_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_plans_status_idx" ON "business_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "business_plans_created_at_idx" ON "business_plans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_session_id_idx" ON "conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_events_to_email_idx" ON "email_events" USING btree ("to_email");--> statement-breakpoint
CREATE INDEX "email_events_status_idx" ON "email_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_events_email_type_idx" ON "email_events" USING btree ("email_type");--> statement-breakpoint
CREATE INDEX "email_events_created_at_idx" ON "email_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "file_uploads_conversation_id_idx" ON "file_uploads" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "file_uploads_status_idx" ON "file_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "file_uploads_created_at_idx" ON "file_uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_score_idx" ON "leads" USING btree ("score");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_industry_idx" ON "leads" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_role_idx" ON "messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_health_service_idx" ON "system_health" USING btree ("service");--> statement-breakpoint
CREATE INDEX "system_health_status_code_idx" ON "system_health" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "system_health_success_idx" ON "system_health" USING btree ("success");--> statement-breakpoint
CREATE INDEX "system_health_created_at_idx" ON "system_health" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "website_analyses_conversation_id_idx" ON "website_analyses" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "website_analyses_url_idx" ON "website_analyses" USING btree ("url");--> statement-breakpoint
CREATE INDEX "website_analyses_domain_idx" ON "website_analyses" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "website_analyses_created_at_idx" ON "website_analyses" USING btree ("created_at");