CREATE TYPE "public"."feedback_type" AS ENUM('thumbs_up', 'thumbs_down');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"conversation_id" uuid,
	"message_id" uuid,
	"feedback_type" "feedback_type" NOT NULL,
	"step_number" integer,
	"is_business_plan" boolean DEFAULT false,
	"message_content" text,
	"app_variant" text,
	"rating" integer,
	"comment" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_conversation_id_idx" ON "feedback" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "feedback_message_id_idx" ON "feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "feedback_feedback_type_idx" ON "feedback" USING btree ("feedback_type");--> statement-breakpoint
CREATE INDEX "feedback_step_number_idx" ON "feedback" USING btree ("step_number");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");