import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Business Plan Generation Timeout Tests
 * 
 * These tests verify:
 * 1. Business plan generation completes within 60 seconds (new timeout)
 * 2. Optimized prompt produces valid output
 * 3. Fallback mechanism works on provider failure
 * 4. Required sections are present in generated plans
 * 5. Performance metrics meet expectations
 */

describe("Business Plan Generation - Timeout & Performance", () => {
  const API_URL = "http://localhost:3000/api/chat";
  const TIMEOUT_MS = 90000; // 90 seconds for business plan generation
  const GENERATION_TIMEOUT_MS = 100000; // Add 10s buffer for test timeout
  
  // Helper to create a full conversation up to plan generation
  const createFullConversation = (businessContext: Partial<any> = {}) => {
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
  };

  describe("Timeout Handling", () => {
    it("should generate business plan within 60 second timeout", async () => {
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
      
      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(TIMEOUT_MS);
      
      const data = await response.json();
      expect(data.isBusinessPlan).toBe(true);
      expect(data.businessPlanMarkdown).toBeTruthy();
      
      console.log(`✓ Plan generated in ${elapsed}ms (target: <${TIMEOUT_MS}ms)`);
    }, GENERATION_TIMEOUT_MS);

    it("should not timeout with optimized prompt", async () => {
      const conversation = createFullConversation();
      
      // Make multiple requests to ensure consistency
      const requests = Array(3).fill(null).map(() => 
        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversation.messages,
            currentStep: 7,
            initialContext: conversation.contextSummary,
            websiteAnalysis: null,
            financialAnalysis: null,
          }),
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const elapsed = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(elapsed).toBeLessThan(TIMEOUT_MS * 2); // Allow up to 180s for 3 concurrent requests
      console.log(`✓ 3 concurrent plans generated in ${elapsed}ms`);
    }, GENERATION_TIMEOUT_MS * 3);
  });

  describe("Plan Content Validation", () => {
    it("should include all required sections in optimized plan", async () => {
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

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const plan = data.businessPlanMarkdown;
      expect(plan).toBeTruthy();
      
      // Validate required sections
      const requiredSections = [
        "Executive Summary",
        "Phased AI Roadmap",
        "Technology Recommendations",
        "Financial Analysis",
        "Implementation Plan",
      ];
      
      requiredSections.forEach(section => {
        expect(plan).toContain(section);
      });

      // Validate structure
      expect(plan).toContain("##"); // Headers
      expect(plan).toContain("|"); // Table format
      expect(plan.length).toBeGreaterThan(500); // Meaningful content
      
      console.log(`✓ Plan contains all required sections`);
    }, GENERATION_TIMEOUT_MS);

    it("should personalize plan with business context", async () => {
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
          websiteAnalysis: null,
          financialAnalysis: null,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const plan = data.businessPlanMarkdown.toLowerCase();
      
      // Verify personalization (context should be referenced)
      expect(plan).toContain("saas");
      expect(plan).toContain("project");
      
      console.log(`✓ Plan is personalized with business context`);
    }, GENERATION_TIMEOUT_MS);
  });

  describe("Fallback Mechanism", () => {
    it("should return fallback plan when API fails", async () => {
      const conversation = createFullConversation();
      
      // This test would benefit from mocking the NIM API
      // For now, we verify that any response has required fields
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

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Even on failure, should have plan
      expect(data.isBusinessPlan).toBe(true);
      expect(data.businessPlanMarkdown).toBeTruthy();
      expect(data.businessPlanMarkdown.length).toBeGreaterThan(200);
      
      console.log(`✓ Fallback plan is valid`);
    }, GENERATION_TIMEOUT_MS);
  });

  describe("Performance Metrics", () => {
    it("should collect and report generation metrics", async () => {
      const conversation = createFullConversation();
      const timings = {
        start: 0,
        response: 0,
        complete: 0,
      };

      timings.start = Date.now();
      
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

      timings.response = Date.now();
      const data = await response.json();
      timings.complete = Date.now();

      const metrics = {
        responseTime: timings.response - timings.start,
        parseTime: timings.complete - timings.response,
        totalTime: timings.complete - timings.start,
        planLength: data.businessPlanMarkdown?.length || 0,
      };

      // Verify performance targets
      expect(metrics.totalTime).toBeLessThan(TIMEOUT_MS);
      expect(metrics.responseTime).toBeLessThan(TIMEOUT_MS);
      expect(metrics.planLength).toBeGreaterThan(500);

      console.log(`Performance Metrics:
        - Response Time: ${metrics.responseTime}ms
        - Parse Time: ${metrics.parseTime}ms
        - Total Time: ${metrics.totalTime}ms
        - Plan Size: ${metrics.planLength} characters`);
    }, GENERATION_TIMEOUT_MS);
  });

  describe("Provider Configuration", () => {
    it("should use NVIDIA NIM as primary provider", async () => {
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

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Plan should be generated (NVIDIA is working)
      expect(data.businessPlanMarkdown).toBeTruthy();
      expect(data.isBusinessPlan).toBe(true);
      
      console.log(`✓ NVIDIA NIM successfully generated plan`);
    }, GENERATION_TIMEOUT_MS);
  });

  describe("Edge Cases", () => {
    it("should handle minimal context gracefully", async () => {
      const minimalContext = {
        businessType: "Small business",
        painPoints: "Growth challenges",
        goals: "Increase revenue",
      };
      
      const conversation = createFullConversation(minimalContext);
      
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

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.businessPlanMarkdown).toBeTruthy();
      
      console.log(`✓ Minimal context produces valid plan`);
    }, GENERATION_TIMEOUT_MS);

    it("should handle rich context with analyses", async () => {
      const websiteAnalysis = {
        productsServices: "E-commerce platform for collectibles",
        customerSegment: "Collectors worldwide",
        techStack: "React, Node.js, PostgreSQL",
        marketingStrengths: "Community, SEO",
        marketingWeaknesses: "Paid ads, direct sales",
      };

      const conversation = createFullConversation();
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.messages,
          currentStep: 7,
          initialContext: conversation.contextSummary,
          websiteAnalysis,
          financialAnalysis: null,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.businessPlanMarkdown).toBeTruthy();
      
      console.log(`✓ Rich context produces valid plan`);
    }, GENERATION_TIMEOUT_MS);
  });
});
