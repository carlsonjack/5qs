const { createClient } = require("@supabase/supabase-js");

async function inspectSchema() {
  console.log("🔍 Inspecting database schema...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get table schema information
    console.log("📋 Getting table schema...");
    const { data: tables, error: tablesError } = await supabase.rpc(
      "get_table_schema",
      { table_name: "users" }
    );

    if (tablesError) {
      console.log("RPC failed, trying direct query...");

      // Try to get schema info using raw SQL
      const { data: schemaData, error: schemaError } = await supabase
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_name", "users")
        .eq("table_schema", "public");

      if (schemaError) {
        console.error("❌ Schema query failed:", schemaError);
        return;
      }

      console.log("✅ Users table columns:");
      schemaData.forEach((col) => {
        console.log(
          `  - ${col.column_name} (${col.data_type}) ${
            col.is_nullable === "NO" ? "NOT NULL" : "NULL"
          }`
        );
      });
    } else {
      console.log("✅ Table schema:", tables);
    }

    // Try to insert a minimal user record to see what fields are expected
    console.log("🧪 Testing minimal user insertion...");
    const { data: testUser, error: testError } = await supabase
      .from("users")
      .insert({
        email: `test-${Date.now()}@example.com`,
      })
      .select()
      .single();

    if (testError) {
      console.error("❌ Minimal user insertion failed:", testError);
    } else {
      console.log("✅ Minimal user created successfully:", testUser);

      // Clean up
      await supabase.from("users").delete().eq("id", testUser.id);
      console.log("🧹 Test user cleaned up");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env" });

inspectSchema();
