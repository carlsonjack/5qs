const { createClient } = require("@supabase/supabase-js");

async function testDataInsertion() {
  console.log("🔍 Testing data insertion to Supabase...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test user creation
    console.log("👤 Testing user creation...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        email: `test-${Date.now()}@example.com`,
        firstName: "Test",
        lastName: "User",
        preferences: { emailNotifications: true },
        utmSource: "test",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ User creation failed:", userError);
      return;
    }

    console.log("✅ User created successfully:", user.id);

    // Test conversation creation
    console.log("💬 Testing conversation creation...");
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        userId: user.id,
        sessionId: `test-session-${Date.now()}`,
        status: "active",
        currentStep: 1,
        appVariant: "test",
      })
      .select()
      .single();

    if (conversationError) {
      console.error("❌ Conversation creation failed:", conversationError);
      return;
    }

    console.log("✅ Conversation created successfully:", conversation.id);

    // Test message creation
    console.log("📝 Testing message creation...");
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversationId: conversation.id,
        role: "user",
        content: "Test message",
        stepNumber: 1,
      })
      .select()
      .single();

    if (messageError) {
      console.error("❌ Message creation failed:", messageError);
      return;
    }

    console.log("✅ Message created successfully:", message.id);

    // Test lead creation
    console.log("🎯 Testing lead creation...");
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        userId: user.id,
        conversationId: conversation.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: "new",
        score: 75,
        temperature: "warm",
        industry: "Technology",
        businessType: "SaaS",
        ipAddress: "127.0.0.1",
        appVariant: "test",
      })
      .select()
      .single();

    if (leadError) {
      console.error("❌ Lead creation failed:", leadError);
      return;
    }

    console.log("✅ Lead created successfully:", lead.id);

    // Test analytics event
    console.log("📊 Testing analytics event creation...");
    const { data: analyticsEvent, error: analyticsError } = await supabase
      .from("analytics_events")
      .insert({
        userId: user.id,
        conversationId: conversation.id,
        sessionId: conversation.sessionId,
        eventType: "test",
        eventName: "data_insertion_test",
        properties: { test: true },
        page: "/test",
        userAgent: "test-agent",
        ipAddress: "127.0.0.1",
      })
      .select()
      .single();

    if (analyticsError) {
      console.error("❌ Analytics event creation failed:", analyticsError);
      return;
    }

    console.log("✅ Analytics event created successfully:", analyticsEvent.id);

    // Clean up test data
    console.log("🧹 Cleaning up test data...");
    await supabase
      .from("analytics_events")
      .delete()
      .eq("id", analyticsEvent.id);
    await supabase.from("leads").delete().eq("id", lead.id);
    await supabase.from("messages").delete().eq("id", message.id);
    await supabase.from("conversations").delete().eq("id", conversation.id);
    await supabase.from("users").delete().eq("id", user.id);

    console.log("🎉 All data insertion tests passed!");
    console.log("✅ Database is working correctly for production");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

// Load environment variables
require("dotenv").config({ path: ".env" });

testDataInsertion();
