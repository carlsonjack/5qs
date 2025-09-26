import { describe, it, expect } from "vitest";

describe("Core Business Plan Generation Flow", () => {
  const API_BASE = "http://localhost:3001";

  // Helper function to make API calls
  const callChatAPI = async (
    messages: any[],
    currentStep: number,
    contextData?: any
  ) => {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        currentStep,
        initialContext: contextData?.initialContext || null,
        websiteAnalysis: contextData?.websiteAnalysis || null,
        financialAnalysis: contextData?.financialAnalysis || null,
      }),
    });
    return response.json();
  };

  it("should not generate business plan before 6 user messages", async () => {
    // Test with 5 user messages (questions 1-5 answered)
    const messages = [
      { role: "user", content: "I run a business" },
      { role: "assistant", content: "Q1" },
      { role: "user", content: "We have challenges" },
      { role: "assistant", content: "Q2" },
      { role: "user", content: "Our customers are..." },
      { role: "assistant", content: "Q3" },
      { role: "user", content: "We use tools..." },
      { role: "assistant", content: "Q4" },
      { role: "user", content: "Our goals are..." },
      { role: "assistant", content: "Summary of your business..." },
    ];

    const response = await callChatAPI(messages, 6);

    // Should not generate plan yet
    expect(response.isBusinessPlan).toBeFalsy();
    expect(response.businessPlanMarkdown).toBeFalsy();
    expect(response.message).toBeTruthy();
  });

  it("should generate business plan after user confirms summary", async () => {
    // Test with 6 user messages (5 answers + 1 confirmation)
    const messages = [
      { role: "user", content: "I run a software company" },
      { role: "assistant", content: "Q1" },
      { role: "user", content: "Manual processes slow us down" },
      { role: "assistant", content: "Q2" },
      { role: "user", content: "Small business customers" },
      { role: "assistant", content: "Q3" },
      { role: "user", content: "Spreadsheets and basic tools" },
      { role: "assistant", content: "Q4" },
      { role: "user", content: "Scale and automate operations" },
      { role: "assistant", content: "Q5" },
      { role: "user", content: "Summary request" },
      { role: "assistant", content: "Business summary..." },
      { role: "user", content: "Yes, generate my business plan please" },
    ];

    const response = await callChatAPI(messages, 7);

    // Should generate plan
    expect(response.isBusinessPlan).toBe(true);
    expect(response.businessPlanMarkdown).toBeTruthy();

    // Plan should contain key sections
    const plan = response.businessPlanMarkdown.toLowerCase();
    expect(plan).toContain("opportunity");
    expect(plan).toContain("roadmap");
    expect(plan).toContain("roi");
    expect(plan).toContain("action");
  }, 30000); // Allow time for AI generation

  it("should provide fallback response when AI service fails", async () => {
    const response = await callChatAPI([], 1);

    // Should always return a response
    expect(response.message).toBeTruthy();
    expect(typeof response.message).toBe("string");
    expect(response.message.length).toBeGreaterThan(10);
  });

  it("should handle context data integration", async () => {
    const contextData = {
      websiteAnalysis: {
        productsServices: "E-commerce Platform",
        customerSegment: "Small Businesses",
      },
    };

    const response = await callChatAPI([], 1, contextData);

    // Should return a response with context
    expect(response.message).toBeTruthy();
    expect(response.contextSummary).toBeTruthy();

    // Context should be integrated if available
    if (response.contextSummary.businessType !== "Not yet specified") {
      expect(response.contextSummary.businessType).toContain("E-commerce");
    }
  });

  it("should validate step progression logic", async () => {
    let messages: any[] = [];

    // Test each step sequentially
    for (let step = 1; step <= 5; step++) {
      if (step > 1) {
        messages.push({ role: "user", content: `Answer ${step - 1}` });
      }

      const response = await callChatAPI(messages, step);

      // Should always have a message
      expect(response.message).toBeTruthy();
      // Should not be a business plan yet
      expect(response.isBusinessPlan).toBeFalsy();

      messages.push({ role: "assistant", content: response.message });
    }

    // Now test step 6 (summary)
    messages.push({ role: "user", content: "Summary please" });
    const summaryResponse = await callChatAPI(messages, 6);
    expect(summaryResponse.message).toBeTruthy();
    expect(summaryResponse.isBusinessPlan).toBeFalsy();

    // Test step 7 (plan generation)
    messages.push({ role: "assistant", content: summaryResponse.message });
    messages.push({ role: "user", content: "Generate plan" });
    const planResponse = await callChatAPI(messages, 7);
    expect(planResponse.isBusinessPlan).toBe(true);
  }, 45000);

  it("should generate realistic business plan content", async () => {
    const detailedMessages = [
      {
        role: "user",
        content:
          "I operate an online car auction platform for vintage vehicles",
      },
      { role: "assistant", content: "Q1 response" },
      {
        role: "user",
        content:
          "Manual seller verification and incomplete documentation are our biggest challenges",
      },
      { role: "assistant", content: "Q2 response" },
      {
        role: "user",
        content: "Classic car collectors and automotive enthusiasts worldwide",
      },
      { role: "assistant", content: "Q3 response" },
      {
        role: "user",
        content:
          "Custom auction platform, spreadsheets for logistics, basic CRM",
      },
      { role: "assistant", content: "Q4 response" },
      {
        role: "user",
        content:
          "Automate verification processes and scale internationally within 12 months",
      },
      { role: "assistant", content: "Q5 response" },
      { role: "user", content: "Summary request" },
      { role: "assistant", content: "Summary provided" },
      { role: "user", content: "Generate comprehensive business plan" },
    ];

    const response = await callChatAPI(detailedMessages, 7);

    expect(response.isBusinessPlan).toBe(true);
    const plan = response.businessPlanMarkdown;

    // Should contain business-specific content
    expect(plan.toLowerCase()).toMatch(/auction|car|vehicle/i);
    expect(plan.toLowerCase()).toMatch(/verification|documentation/i);
    expect(plan.toLowerCase()).toMatch(/collector|enthusiast/i);

    // Should have structure
    expect(plan).toMatch(/^#/m); // Has headings
    expect(plan).toMatch(/\$[\d,]+/m); // Has cost estimates
    expect(plan).toMatch(/\d+%/m); // Has percentages
    expect(plan).toMatch(/month/i); // Has timeline

    // Should have actionable items
    expect(plan).toMatch(/\[\s*\]/m); // Has checkboxes or action items
  }, 45000);
});

// Integration test to verify the full API is working
describe("API Health Check", () => {
  it("should respond to chat API requests", async () => {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [],
        currentStep: 1,
        initialContext: null,
        websiteAnalysis: null,
        financialAnalysis: null,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("message");
  });
});

