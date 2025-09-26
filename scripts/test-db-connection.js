const { createClient } = require("@supabase/supabase-js");

async function testDatabaseConnection() {
  console.log("🔍 Testing Supabase database connection...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test basic connection
    console.log("📡 Testing basic connection...");
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      console.error("❌ Database connection failed:", error);
      process.exit(1);
    }

    console.log("✅ Database connection successful!");

    // Test table existence
    console.log("📋 Checking table structure...");
    const tables = [
      "users",
      "conversations",
      "messages",
      "business_plans",
      "leads",
      "file_uploads",
      "website_analyses",
      "email_events",
      "analytics_events",
      "system_health",
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("*").limit(1);

        if (error) {
          console.log(`❌ Table ${table} not accessible:`, error.message);
        } else {
          console.log(`✅ Table ${table} is accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table} error:`, err.message);
      }
    }

    console.log("🎉 Database setup verification complete!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env.local" });

testDatabaseConnection();
