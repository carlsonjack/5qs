const { createClient } = require("@supabase/supabase-js");

async function checkSchema() {
  console.log("🔍 Checking database schema...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check users table structure
    console.log("👤 Checking users table...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*")
      .limit(1);

    if (usersError) {
      console.error("❌ Users table error:", usersError);
    } else {
      console.log("✅ Users table accessible");
      if (users && users.length > 0) {
        console.log("📋 Users table columns:", Object.keys(users[0]));
      } else {
        console.log("📋 Users table is empty");
      }
    }

    // Check conversations table structure
    console.log("💬 Checking conversations table...");
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("*")
      .limit(1);

    if (conversationsError) {
      console.error("❌ Conversations table error:", conversationsError);
    } else {
      console.log("✅ Conversations table accessible");
      if (conversations && conversations.length > 0) {
        console.log(
          "📋 Conversations table columns:",
          Object.keys(conversations[0])
        );
      } else {
        console.log("📋 Conversations table is empty");
      }
    }

    // Check leads table structure
    console.log("🎯 Checking leads table...");
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .limit(1);

    if (leadsError) {
      console.error("❌ Leads table error:", leadsError);
    } else {
      console.log("✅ Leads table accessible");
      if (leads && leads.length > 0) {
        console.log("📋 Leads table columns:", Object.keys(leads[0]));
      } else {
        console.log("📋 Leads table is empty");
      }
    }

    // Check messages table structure
    console.log("📝 Checking messages table...");
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .limit(1);

    if (messagesError) {
      console.error("❌ Messages table error:", messagesError);
    } else {
      console.log("✅ Messages table accessible");
      if (messages && messages.length > 0) {
        console.log("📋 Messages table columns:", Object.keys(messages[0]));
      } else {
        console.log("📋 Messages table is empty");
      }
    }

    // Check analytics_events table structure
    console.log("📊 Checking analytics_events table...");
    const { data: analyticsEvents, error: analyticsError } = await supabase
      .from("analytics_events")
      .select("*")
      .limit(1);

    if (analyticsError) {
      console.error("❌ Analytics events table error:", analyticsError);
    } else {
      console.log("✅ Analytics events table accessible");
      if (analyticsEvents && analyticsEvents.length > 0) {
        console.log(
          "📋 Analytics events table columns:",
          Object.keys(analyticsEvents[0])
        );
      } else {
        console.log("📋 Analytics events table is empty");
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env" });

checkSchema();
