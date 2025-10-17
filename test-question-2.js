#!/usr/bin/env node
/**
 * Test for Question 2 generation
 * Verifies that full question content is returned, not just the header
 */

const API_URL = "http://localhost:3000/api/chat";

async function testQuestion2() {
  console.log("🧪 Testing Question 2 Generation\n");

  // First, get through Question 1
  const response1 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [],
      currentStep: 1,
      initialContext: {
        businessType: "Online auction platform for vintage and classic cars",
        painPoints: "Not yet specified",
        goals: "Not yet specified",
      },
      websiteAnalysis: null,
      financialAnalysis: null,
    }),
  });

  const data1 = await response1.json();
  const question1 = data1.message;

  console.log("✅ Question 1 generated:");
  console.log(`   Length: ${question1.length} characters`);
  console.log(`   Preview: ${question1.substring(0, 100)}...\n`);

  if (!question1.includes("Question 1")) {
    console.error("❌ Question 1 doesn't have proper header!");
    process.exit(1);
  }

  // Now get Question 2
  const response2 = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: "My business is an online car auction platform",
        },
        { role: "assistant", content: question1 },
      ],
      currentStep: 2,
      initialContext: {
        businessType: "Online auction platform for vintage and classic cars",
        painPoints: "Not yet specified",
        goals: "Not yet specified",
      },
      websiteAnalysis: null,
      financialAnalysis: null,
    }),
  });

  const data2 = await response2.json();
  const question2 = data2.message;

  console.log("📝 Question 2 generated:");
  console.log(`   Length: ${question2.length} characters`);
  console.log(`   Full content:\n`);
  console.log(question2);
  console.log("\n");

  // Validation
  const errors = [];

  if (!question2) {
    errors.push("❌ Question 2 is empty!");
  }

  if (!question2.includes("Question 2")) {
    errors.push("❌ Question 2 doesn't have proper header!");
  }

  if (question2.length < 50) {
    errors.push(
      `❌ Question 2 is too short (${question2.length}ch). Expected at least 50 characters with actual content.`
    );
  }

  if (
    question2 === "Question 2: Pain Points" ||
    question2 === "**Question 2: Pain Points**"
  ) {
    errors.push(
      "❌ Question 2 only has header, missing the actual question content!"
    );
  }

  if (errors.length > 0) {
    console.error("\n" + errors.join("\n"));
    process.exit(1);
  }

  console.log("✅ ALL CHECKS PASSED!");
  console.log(`   - Question 2 has proper header`);
  console.log(
    `   - Question 2 has substantial content (${question2.length}ch)`
  );
  console.log(`   - Question 2 is not just a header\n`);

  process.exit(0);
}

testQuestion2().catch((error) => {
  console.error("Test error:", error);
  process.exit(1);
});
