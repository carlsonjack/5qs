const postgres = require("postgres");

async function createFeedbackTable() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING);

  try {
    console.log("Creating feedback_type enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."feedback_type" AS ENUM('thumbs_up', 'thumbs_down');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log("Creating feedback table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "feedback" (
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
    `;

    console.log("Adding foreign key constraints...");
    await sql`
      DO $$ BEGIN
        ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        ALTER TABLE "feedback" ADD CONSTRAINT "feedback_conversation_id_conversations_id_fk" 
        FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_id_messages_id_fk" 
        FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log("Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS "feedback_user_id_idx" ON "feedback" USING btree ("user_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "feedback_conversation_id_idx" ON "feedback" USING btree ("conversation_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "feedback_message_id_idx" ON "feedback" USING btree ("message_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "feedback_feedback_type_idx" ON "feedback" USING btree ("feedback_type");`;
    await sql`CREATE INDEX IF NOT EXISTS "feedback_step_number_idx" ON "feedback" USING btree ("step_number");`;
    await sql`CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback" USING btree ("created_at");`;

    console.log("✅ Feedback table created successfully!");
  } catch (error) {
    console.error("❌ Error creating feedback table:", error);
  } finally {
    await sql.end();
  }
}

createFeedbackTable();
