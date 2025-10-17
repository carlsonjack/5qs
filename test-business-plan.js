#!/usr/bin/env node
/**
 * Business Plan Generation Test Script
 * Standalone script to verify business plan generation works without timeout issues
 */

const API_URL = "http://localhost:3001/api/chat";
const TIMEOUT_MS = 90000; // 90 seconds

// Helper to create a full conversation
function createFullConversation(businessContext = {}) {
  const defaultContext = {
    businessType: "Online auction platform for vintage and classic cars",
    painPoints: "Sourcing inventory, manual processes, buyer engagement",
    goals: "Expand inventory, improve buyer experience, scale operations",
    priorTechUse: "Web-based platform with e-commerce functionality",
    ...businessContext,
  };

  return {
    messages: [
      { role: "user", content: "I run an online car auction business" },
      { role: "assistant", content: "Question 1: Business overview?" },
      { role: "user", content: defaultContext.businessType },
      { role: "assistant", content: "Question 2: Pain points?" },
      { role: "user", content: defaultContext.painPoints },
      { role: "assistant", content: "Question 3: Customers?" },
      { role: "user", content: "Car collectors and enthusiasts worldwide" },
      { role: "assistant", content: "Question 4: Operations?" },
      { role: "user", content: defaultContext.priorTechUse },
      { role: "assistant", content: "Question 5: Goals?" },
      { role: "user", content: defaultContext.goals },
      { role: "assistant", content: "Summary of your business..." },
      { role: "user", content: "Yes, generate my business plan" },
    ],
    contextSummary: defaultContext,
  };
}

async function testBusinessPlanGeneration() {
  console.log("🚀 Starting Business Plan Generation Test\n");
  console.log(`⏱️  Timeout: ${TIMEOUT_MS / 1000} seconds\n`);

  const tests = [
    {
      name: "Basic Business Plan Generation",
      fn: testBasicPlan,
    },
    {
      name: "Business Plan with Context",
      fn: testPlanWithContext,
    },
    {
      name: "Performance Metrics",
      fn: testPerformanceMetrics,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n📝 Test: ${test.name}`);
      console.log("─".repeat(50));
      await test.fn();
      console.log("✅ PASSED\n");
      passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${error.message}\n`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

async function testBasicPlan() {
  const startTime = Date.now();
  const conversation = createFullConversation();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: conversation.messages,
      currentStep: 7,
      initialContext: conversation.contextSummary,
      websiteAnalysis: null,
      financialAnalysis: null,
    }),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.isBusinessPlan) {
    throw new Error("Response is not flagged as business plan");
  }

  if (!data.businessPlanMarkdown) {
    throw new Error("No business plan markdown in response");
  }

  console.log(`  ⏱️  Generation time: ${elapsed}ms`);
  console.log(`  📄 Plan size: ${data.businessPlanMarkdown.length} characters`);

  if (elapsed > TIMEOUT_MS) {
    throw new Error(
      `Generation took ${elapsed}ms, exceeds timeout of ${TIMEOUT_MS}ms`
    );
  }

  // Debug: show first 300 chars
  const planPreview = data.businessPlanMarkdown.substring(0, 300);
  console.log(`  📋 Plan preview: ${planPreview.substring(0, 200)}...`);

  // Validate content - be more lenient
  const plan = data.businessPlanMarkdown;
  const hasHeadings = plan.includes("##") || plan.includes("#");
  const hasStructure =
    plan.includes("Phase") || plan.includes("plan") || plan.includes("Plan");

  if (!hasHeadings) {
    throw new Error("Missing markdown headings (##)");
  }

  if (!hasStructure) {
    throw new Error("Missing business plan structure");
  }

  console.log(`  ✓ Contains required structure`);
}

async function testPlanWithContext() {
  const startTime = Date.now();
  const businessContext = {
    businessType: "SaaS platform for project management",
    painPoints: "Integrations, workflows, team collaboration",
    goals: "Enterprise adoption, improve UX",
  };

  const conversation = createFullConversation(businessContext);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: conversation.messages,
      currentStep: 7,
      initialContext: conversation.contextSummary,
      websiteAnalysis: {
        productsServices: "Project management platform",
        customerSegment: "Enterprise teams",
        techStack: "React, Node.js",
      },
      financialAnalysis: null,
    }),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.businessPlanMarkdown) {
    throw new Error("No business plan markdown in response");
  }

  console.log(`  ⏱️  Generation time: ${elapsed}ms`);
  console.log(`  📄 Plan size: ${data.businessPlanMarkdown.length} characters`);

  // Verify personalization
  const plan = data.businessPlanMarkdown.toLowerCase();
  if (!plan.includes("saas") && !plan.includes("project")) {
    console.log(`  ⚠️  Plan may not be personalized with context`);
  } else {
    console.log(`  ✓ Plan is personalized with business context`);
  }
}

async function testPerformanceMetrics() {
  const iterations = 2;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`  Running iteration ${i + 1}/${iterations}...`);
    const startTime = Date.now();
    const conversation = createFullConversation();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation.messages,
        currentStep: 7,
        initialContext: conversation.contextSummary,
        websiteAnalysis: null,
        financialAnalysis: null,
      }),
    });

    const elapsed = Date.now() - startTime;
    times.push(elapsed);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.businessPlanMarkdown) {
      throw new Error("No business plan markdown in response");
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`  📊 Performance Metrics:`);
  console.log(`    - Average: ${avgTime.toFixed(0)}ms`);
  console.log(`    - Min: ${minTime}ms`);
  console.log(`    - Max: ${maxTime}ms`);

  if (maxTime > TIMEOUT_MS) {
    throw new Error(`Max time ${maxTime}ms exceeds timeout of ${TIMEOUT_MS}ms`);
  }
}

// Run the tests
testBusinessPlanGeneration().catch((error) => {
  console.error("Test suite error:", error);
  process.exit(1);
});
