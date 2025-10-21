const { createClient } = require("@supabase/supabase-js");

async function createFeedbackTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("Creating feedback_type enum...");
    const { error: enumError } = await supabase.rpc("exec_sql", {
      sql: `
        DO $$ BEGIN
          CREATE TYPE "public"."feedback_type" AS ENUM('thumbs_up', 'thumbs_down');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `,
    });

    if (enumError) {
      console.log("Enum already exists or error:", enumError.message);
    } else {
      console.log("✅ Enum created successfully");
    }

    console.log("Creating feedback table...");
    const { error: tableError } = await supabase.rpc("exec_sql", {
      sql: `
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
      `,
    });

    if (tableError) {
      console.log("Table creation error:", tableError.message);
    } else {
      console.log("✅ Table created successfully");
    }

    console.log("Adding foreign key constraints...");
    const constraints = [
      `ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE "feedback" ADD CONSTRAINT "feedback_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;`,
    ];

    for (const constraint of constraints) {
      const { error } = await supabase.rpc("exec_sql", {
        sql: `DO $$ BEGIN ${constraint} EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      });

      if (error) {
        console.log("Constraint error:", error.message);
      }
    }

    console.log("Creating indexes...");
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "feedback_user_id_idx" ON "feedback" USING btree ("user_id");`,
      `CREATE INDEX IF NOT EXISTS "feedback_conversation_id_idx" ON "feedback" USING btree ("conversation_id");`,
      `CREATE INDEX IF NOT EXISTS "feedback_message_id_idx" ON "feedback" USING btree ("message_id");`,
      `CREATE INDEX IF NOT EXISTS "feedback_feedback_type_idx" ON "feedback" USING btree ("feedback_type");`,
      `CREATE INDEX IF NOT EXISTS "feedback_step_number_idx" ON "feedback" USING btree ("step_number");`,
      `CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback" USING btree ("created_at");`,
    ];

    for (const index of indexes) {
      const { error } = await supabase.rpc("exec_sql", { sql: index });
      if (error) {
        console.log("Index error:", error.message);
      }
    }

    console.log("✅ Feedback table setup complete!");
  } catch (error) {
    console.error("❌ Error creating feedback table:", error);
  }
}

createFeedbackTable();
