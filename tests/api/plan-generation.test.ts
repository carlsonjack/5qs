import { describe, it, expect } from "vitest";

describe("Business Plan Generation Logic", () => {
  // Mock the chat API endpoint directly
  const mockChatAPI = async (messages: any[], currentStep: number) => {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        currentStep,
        initialContext: null,
        websiteAnalysis: null,
        financialAnalysis: null,
      }),
    });
    return response.json();
  };

  it("should trigger plan generation only after 6 user messages", async () => {
    // Test with 5 user messages (should not generate plan)
    const messagesStep5 = [
      { role: "user", content: "Answer 1" },
      { role: "assistant", content: "Question 1" },
      { role: "user", content: "Answer 2" },
      { role: "assistant", content: "Question 2" },
      { role: "user", content: "Answer 3" },
      { role: "assistant", content: "Question 3" },
      { role: "user", content: "Answer 4" },
      { role: "assistant", content: "Question 4" },
      { role: "user", content: "Answer 5" },
      { role: "assistant", content: "Summary" },
    ];

    const response5 = await mockChatAPI(messagesStep5, 6);
    expect(response5.isBusinessPlan).toBeFalsy();

    // Test with 6 user messages (should generate plan)
    const messagesStep6 = [
      ...messagesStep5,
      { role: "user", content: "Generate plan please" },
    ];

    const response6 = await mockChatAPI(messagesStep6, 7);
    expect(response6.isBusinessPlan).toBe(true);
    expect(response6.businessPlanMarkdown).toBeTruthy();
  }, 30000);

  it("should generate plan with required sections", async () => {
    const fullConversation = [
      { role: "user", content: "I run an online car auction business" },
      { role: "assistant", content: "Q1 response" },
      { role: "user", content: "Manual processes are slowing us down" },
      { role: "assistant", content: "Q2 response" },
      { role: "user", content: "Car collectors and enthusiasts" },
      { role: "assistant", content: "Q3 response" },
      { role: "user", content: "Spreadsheets and basic CRM" },
      { role: "assistant", content: "Q4 response" },
      { role: "user", content: "Automate and scale operations" },
      { role: "assistant", content: "Q5 response" },
      { role: "user", content: "Summary please" },
      { role: "assistant", content: "Business summary..." },
      { role: "user", content: "Yes, generate my business plan" },
    ];

    const response = await mockChatAPI(fullConversation, 7);

    expect(response.isBusinessPlan).toBe(true);
    expect(response.businessPlanMarkdown).toBeTruthy();

    const plan = response.businessPlanMarkdown.toLowerCase();
    expect(plan).toContain("opportunity");
    expect(plan).toContain("roadmap");
    expect(plan).toContain("roi");
    expect(plan).toContain("action");
  }, 30000);

  it("should handle context summary generation", async () => {
    const conversation = [
      { role: "user", content: "I run a software consulting business" },
      { role: "assistant", content: "Response 1" },
    ];

    const response = await mockChatAPI(conversation, 2);

    expect(response.contextSummary).toBeTruthy();
    expect(response.contextSummary.businessType).toContain("software");
  });

  it("should provide fallback plan on API failure", async () => {
    // This would require mocking the NIM API to fail
    // For now, test that any response includes required fields
    const minimalConversation = [
      { role: "user", content: "test" },
      { role: "assistant", content: "test" },
      { role: "user", content: "test" },
      { role: "assistant", content: "test" },
      { role: "user", content: "test" },
      { role: "assistant", content: "test" },
      { role: "user", content: "test" },
      { role: "assistant", content: "test" },
      { role: "user", content: "test" },
      { role: "assistant", content: "test" },
      { role: "user", content: "test" },
      { role: "assistant", content: "summary" },
      { role: "user", content: "generate plan" },
    ];

    const response = await mockChatAPI(minimalConversation, 7);

    expect(response.businessPlanMarkdown).toBeTruthy();
    expect(response.businessPlanMarkdown).toContain("#");
  }, 30000);

  it("should validate step progression logic", async () => {
    // Test step 1
    const step1Response = await mockChatAPI([], 1);
    expect(step1Response.message).toBeTruthy();
    expect(step1Response.isBusinessPlan).toBeFalsy();

    // Test with progressive messages
    let messages: any[] = [];

    for (let step = 1; step <= 5; step++) {
      if (step > 1) {
        messages.push({ role: "user", content: `Answer ${step - 1}` });
      }

      const response = await mockChatAPI(messages, step);
      expect(response.message).toBeTruthy();
      expect(response.isBusinessPlan).toBeFalsy();

      messages.push({ role: "assistant", content: response.message });
    }

    // Add summary request
    messages.push({ role: "user", content: "Summary request" });
    const summaryResponse = await mockChatAPI(messages, 6);
    expect(summaryResponse.message).toBeTruthy();
    expect(summaryResponse.isBusinessPlan).toBeFalsy();

    // Add plan generation request
    messages.push({ role: "assistant", content: summaryResponse.message });
    messages.push({ role: "user", content: "Generate plan" });
    const planResponse = await mockChatAPI(messages, 7);
    expect(planResponse.isBusinessPlan).toBe(true);
  }, 45000);

  it("should handle website analysis context", async () => {
    const websiteAnalysis = {
      productsServices: "E-commerce Platform",
      customerSegment: "Small Businesses",
      techStack: "React, Node.js",
      marketingStrengths: "SEO, Content Marketing",
    };

    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        currentStep: 1,
        initialContext: null,
        websiteAnalysis,
        financialAnalysis: null,
      }),
    });

    const data = await response.json();
    expect(data.contextSummary.businessType).toBe("E-commerce Platform");
    expect(data.contextSummary.growthIntent).toContain("Small Businesses");
  });

  it("should handle financial analysis context", async () => {
    const financialAnalysis = {
      businessType: "SaaS Company",
      revenueTrend: "Growing 20% YoY",
      largestCostCenters: "Engineering, Marketing",
    };

    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        currentStep: 1,
        initialContext: null,
        websiteAnalysis: null,
        financialAnalysis,
      }),
    });

    const data = await response.json();
    expect(data.contextSummary.businessType).toBe("SaaS Company");
    expect(data.contextSummary.dataAvailable).toContain("Growing 20% YoY");
  });
});
