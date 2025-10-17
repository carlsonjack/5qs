import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import request from "supertest";
import { sanitizeQuestion } from "@/lib/nim/client";

describe("Chat API Flow Tests", () => {
  let app: any;
  let server: any;
  let baseURL: string;

  beforeAll(async () => {
    const dev = process.env.NODE_ENV !== "production";
    const hostname = "localhost";
    const port = 3005; // Use different port for testing

    const nextApp = next({ dev, hostname, port });
    const handle = nextApp.getRequestHandler();

    await nextApp.prepare();

    server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error occurred handling", req.url, err);
        res.statusCode = 500;
        res.end("internal server error");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        console.log(`Test server ready on http://${hostname}:${port}`);
        resolve();
      });
    });

    baseURL = `http://${hostname}:${port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe("Step-by-step chat flow", () => {
    it("should start with step 1 question", async () => {
      const response = await request(baseURL)
        .post("/api/chat")
        .send({
          messages: [],
          currentStep: 1,
          initialContext: null,
          websiteAnalysis: null,
          financialAnalysis: null,
        })
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("contextSummary");
      expect(response.body.message).toContain("business");
      expect(response.body.contextSummary.businessType).toBe(
        "Not yet specified"
      );
    });

    it("should progress through 5 questions", async () => {
      const messages: Array<{ role: string; content: string }> = [];

      // Simulate 5 Q&A pairs
      for (let step = 1; step <= 5; step++) {
        // Add user message
        if (step > 1) {
          messages.push({
            role: "user",
            content: `Answer to question ${step - 1}`,
          });
        }

        const response = await request(baseURL)
          .post("/api/chat")
          .send({
            messages,
            currentStep: step,
            initialContext: null,
            websiteAnalysis: null,
            financialAnalysis: null,
          })
          .expect(200);

        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toBeTruthy();

        // Add AI response to messages for next iteration
        messages.push({
          role: "assistant",
          content: response.body.message,
        });
      }

      expect(messages).toHaveLength(9); // 4 user + 5 assistant messages
    });

    it("should provide summary at step 6", async () => {
      const messages = [
        { role: "user", content: "I run a car auction business" },
        { role: "assistant", content: "Question 1 response" },
        { role: "user", content: "We have issues with incomplete submissions" },
        { role: "assistant", content: "Question 2 response" },
        { role: "user", content: "Our customers are car collectors" },
        { role: "assistant", content: "Question 3 response" },
        { role: "user", content: "We use spreadsheets and email" },
        { role: "assistant", content: "Question 4 response" },
        { role: "user", content: "We want to automate processes" },
        { role: "assistant", content: "Question 5 response" },
      ];

      const response = await request(baseURL)
        .post("/api/chat")
        .send({
          messages,
          currentStep: 6,
          initialContext: null,
          websiteAnalysis: null,
          financialAnalysis: null,
        })
        .expect(200);

      expect(response.body).toHaveProperty("message");
      // Summary should contain summary keywords
      expect(response.body.message.toLowerCase()).toMatch(
        /summary|overview|information/i
      );
    });

    it("should generate business plan after summary confirmation", async () => {
      const messages = [
        { role: "user", content: "I run a car auction business" },
        { role: "assistant", content: "Question 1 response" },
        { role: "user", content: "We have issues with incomplete submissions" },
        { role: "assistant", content: "Question 2 response" },
        { role: "user", content: "Our customers are car collectors" },
        { role: "assistant", content: "Question 3 response" },
        { role: "user", content: "We use spreadsheets and email" },
        { role: "assistant", content: "Question 4 response" },
        { role: "user", content: "We want to automate processes" },
        { role: "assistant", content: "Question 5 response" },
        { role: "user", content: "Summary request" },
        { role: "assistant", content: "Comprehensive summary..." },
        { role: "user", content: "Yes, generate my business plan" },
      ];

      const response = await request(baseURL)
        .post("/api/chat")
        .send({
          messages,
          currentStep: 7,
          initialContext: null,
          websiteAnalysis: null,
          financialAnalysis: null,
        })
        .expect(200);

      expect(response.body).toHaveProperty("businessPlanMarkdown");
      expect(response.body).toHaveProperty("isBusinessPlan", true);
      expect(response.body.businessPlanMarkdown).toContain("# ");
      expect(response.body.businessPlanMarkdown).toMatch(
        /opportunity|roadmap|roi|action/i
      );
    }, 30000); // Increase timeout for plan generation

    it("should handle website analysis context", async () => {
      const websiteAnalysis = {
        productsServices: "Online Vintage Car Auctions",
        customerSegment: "Car Collectors",
        techStack: "E-commerce Platform",
        marketingStrengths: "Community Engagement",
      };

      const response = await request(baseURL)
        .post("/api/chat")
        .send({
          messages: [],
          currentStep: 1,
          initialContext: null,
          websiteAnalysis,
          financialAnalysis: null,
        })
        .expect(200);

      expect(response.body.contextSummary.businessType).toBe(
        "Online Vintage Car Auctions"
      );
      expect(response.body.contextSummary.growthIntent).toContain(
        "Car Collectors"
      );
    });

    it("should handle financial analysis context", async () => {
      const financialAnalysis = {
        businessType: "Auction House",
        revenueTrend: "Growing steadily",
        largestCostCenters: "Marketing and Operations",
      };

      const response = await request(baseURL)
        .post("/api/chat")
        .send({
          messages: [],
          currentStep: 1,
          initialContext: null,
          websiteAnalysis: null,
          financialAnalysis,
        })
        .expect(200);

      expect(response.body.contextSummary.businessType).toBe("Auction House");
      expect(response.body.contextSummary.dataAvailable).toContain(
        "Growing steadily"
      );
    });

    it("should return fallback when AI service fails", async () => {
      // This test might need mocking of the AI service failure
      // For now, we'll test with invalid data that might cause fallback
      const response = await request(baseURL)
        .post("/api/chat")
        .send({
          messages: [{ role: "invalid", content: "test" }],
          currentStep: 1,
          initialContext: null,
          websiteAnalysis: null,
          financialAnalysis: null,
        })
        .expect(200);

      expect(response.body).toHaveProperty("message");
      // Should still provide a meaningful response
      expect(response.body.message).toBeTruthy();
    });
  });

  describe("Response Sanitization Tests", () => {
    it("should remove <think> tags and reasoning content", () => {
      const rawResponse = `<think>
This is my reasoning about what to ask.
I need to ask question 1 about business overview.
</think>

**Question 1: Business Overview**
Could you tell me about your business?`;

      const sanitized = sanitizeQuestion(rawResponse, 1);
      expect(sanitized).not.toContain("<think>");
      expect(sanitized).not.toContain("reasoning");
      expect(sanitized).toContain("**Question 1:");
    });

    it("should remove Note for Assistant lines", () => {
      const rawResponse = `**Question 2: Pain Points**
What are your main challenges?

(Note for Assistant: This is internal guidance, not shown to user)
(Another internal note here)`;

      const sanitized = sanitizeQuestion(rawResponse, 2);
      expect(sanitized).not.toContain("Note for Assistant");
      expect(sanitized).not.toContain("internal");
      expect(sanitized).toContain("**Question 2:");
    });

    it("should remove duplicate question headers and keep only first", () => {
      const rawResponse = `**Question 3: Customers & Reach**
How do you reach your customers?

Question 3: Customers & Reach (duplicate)
Another version of the question here.`;

      const sanitized = sanitizeQuestion(rawResponse, 3);
      const matches = sanitized.match(/Question \d+:/g) || [];
      expect(matches.length).toBe(1); // Only one question header
      expect(sanitized).toContain("**Question 3:");
    });

    it("should normalize question header to current step", () => {
      const rawResponse = `**Question 5: Some Topic**
This is question 5 content`;

      const sanitized = sanitizeQuestion(rawResponse, 2);
      // Should rewrite to Question 2
      expect(sanitized).toContain("**Question 2:");
      expect(sanitized).not.toContain("**Question 5:");
    });

    it("should remove reasoning context like Follow-Up markers", () => {
      const rawResponse = `Follow-Up Question for Clarification:
**Question 2: Pain Points**
What are your challenges?

However, to strictly adhere to instructions...
(Some internal reasoning)`;

      const sanitized = sanitizeQuestion(rawResponse, 2);
      expect(sanitized).not.toContain("Follow-Up");
      expect(sanitized).not.toContain("However");
      expect(sanitized).not.toContain("(Some internal");
      expect(sanitized).toContain("**Question 2:");
    });

    it("should produce valid question format for each step", () => {
      const topics = [
        "Business Overview",
        "Pain Points",
        "Customers & Reach",
        "Operations & Data",
        "Goals & Vision",
      ];

      for (let step = 1; step <= 5; step++) {
        const question = `**Question ${step}: ${
          topics[step - 1]
        }**\nCould you provide details about this topic?`;
        const sanitized = sanitizeQuestion(question, step);

        expect(sanitized).toContain(`**Question ${step}:`);
        expect(sanitized.trim().split("\n").length).toBeGreaterThanOrEqual(2);
      }
    });

    it("should not output empty content for valid questions", () => {
      const validQuestion = `**Question 1: Business Overview**
Tell me about your business.`;

      const sanitized = sanitizeQuestion(validQuestion, 1);
      expect(sanitized.length).toBeGreaterThan(20);
      expect(sanitized).toContain("**Question 1:");
    });

    it("should handle mixed reasoning and question formats", () => {
      const rawResponse = `[Attempting to balance clarity with conciseness...]

**Question 4: Operations & Data**
What tools and processes do you currently use?

**Note for Internal Processing:** Flag for future reference
[END OF REASONING]`;

      const sanitized = sanitizeQuestion(rawResponse, 4);
      expect(sanitized).toContain("**Question 4:");
      expect(sanitized).not.toContain("Note for Internal");
      expect(sanitized).not.toContain("[END OF REASONING]");
      expect(sanitized).not.toContain("Attempting to balance");
    });
  });
});
