const { createClient } = require("@supabase/supabase-js");

async function testMinimalInsert() {
  console.log("🔍 Testing minimal database insertions...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test users table with minimal data
    console.log("👤 Testing users table...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        email: `test-${Date.now()}@example.com`,
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ Users table error:", userError);
    } else {
      console.log("✅ User created successfully:", user);

      // Test conversations table
      console.log("💬 Testing conversations table...");
      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          session_id: `test-session-${Date.now()}`,
        })
        .select()
        .single();

      if (conversationError) {
        console.error("❌ Conversations table error:", conversationError);
      } else {
        console.log("✅ Conversation created successfully:", conversation);

        // Test messages table
        console.log("📝 Testing messages table...");
        const { data: message, error: messageError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversation.id,
            role: "user",
            content: "Test message",
          })
          .select()
          .single();

        let analyticsEvent = null;
        if (messageError) {
          console.error("❌ Messages table error:", messageError);
        } else {
          console.log("✅ Message created successfully:", message);

          // Test analytics events table
          console.log("📊 Testing analytics events table...");
          const { data: analyticsEventData, error: analyticsError } =
            await supabase
              .from("analytics_events")
              .insert({
                user_id: user.id,
                conversation_id: conversation.id,
                session_id: conversation.session_id,
                event_type: "test",
                event_name: "database_test",
              })
              .select()
              .single();

          if (analyticsError) {
            console.error("❌ Analytics events table error:", analyticsError);
          } else {
            console.log(
              "✅ Analytics event created successfully:",
              analyticsEventData
            );
            analyticsEvent = analyticsEventData;
          }
        }

        // Clean up
        console.log("🧹 Cleaning up test data...");
        if (message)
          await supabase.from("messages").delete().eq("id", message.id);
        if (analyticsEvent)
          await supabase
            .from("analytics_events")
            .delete()
            .eq("id", analyticsEvent.id);
        await supabase.from("conversations").delete().eq("id", conversation.id);
        await supabase.from("users").delete().eq("id", user.id);
        console.log("✅ Test data cleaned up");
      }
    }

    console.log("🎉 Database integration test completed!");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env" });

testMinimalInsert();
