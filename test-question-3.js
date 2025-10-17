#!/usr/bin/env node

/**
 * Test Question 3 Generation
 * Verifies that Question 3 generates full content, not just headers
 */

const API_URL = "http://localhost:3001/api/chat";

async function testQuestion3() {
  console.log("🧪 Testing Question 3 Generation\n");

  try {
    // Simulate conversation up to Question 3
    const messages = [
      {
        role: "user",
        content: "https://www.rotorooter.com/",
      },
      {
        role: "assistant",
        content:
          "Question 1: Business Overview\nWhat makes your emergency plumbing services stand out in a competitive market, especially when addressing urgent issues like water damage or tankless water heater repairs?",
      },
      {
        role: "user",
        content:
          "Our services stand out because we combine 24/7 availability with highly trained, licensed technicians who specialize in both emergency plumbing and modern systems like tankless water heaters. We use advanced diagnostic tools to quickly identify problems and provide upfront, transparent pricing. Our reputation is built on fast response times, long-lasting repairs, and dependable customer service.",
      },
      {
        role: "assistant",
        content:
          "Question 2: Pain Points\nGiven your focus on urgent plumbing and water damage services, what specific challenges do you face in maintaining fast response times while managing costs, especially during peak emergency periods or when dealing with complex issues like gas line repairs or extensive water cleanup?",
      },
      {
        role: "user",
        content:
          "Our biggest challenges are coordinating technicians efficiently during peak demand and balancing labor costs with rapid response expectations. Emergencies like gas line repairs or large-scale water damage require specialized crews and equipment, which can strain scheduling and resources. Maintaining high service quality and quick turnaround times while keeping operational costs under control is an ongoing challenge.",
      },
    ];

    console.log("📝 Generating Question 3...");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        step: 3,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.message) {
      throw new Error("No message in response");
    }

    const question3 = data.message;
    console.log(`✅ Question 3 generated:`);
    console.log(`   Length: ${question3.length} characters`);
    console.log(`   Full content:\n\n${question3}\n`);

    // Validation checks
    const hasHeader = /Question\s+3:/i.test(question3);
    const hasSubstantialContent = question3.length > 100;
    const isNotJustHeader =
      question3.length > 50 && !question3.match(/^Question\s+3:\s*$/i);

    console.log("✅ ALL CHECKS PASSED!");
    console.log(`   - Question 3 has proper header: ${hasHeader}`);
    console.log(
      `   - Question 3 has substantial content (${question3.length}ch): ${hasSubstantialContent}`
    );
    console.log(`   - Question 3 is not just a header: ${isNotJustHeader}`);

    if (!hasHeader || !hasSubstantialContent || !isNotJustHeader) {
      console.log("\n❌ VALIDATION FAILED!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testQuestion3();
