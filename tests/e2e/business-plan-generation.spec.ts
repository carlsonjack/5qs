import { test, expect } from "@playwright/test";

test.describe("Business Plan Generation E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should complete full 5-question flow and generate business plan", async ({
    page,
  }) => {
    // Start the discovery process
    await expect(
      page.getByRole("button", { name: /begin discovery/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /begin discovery/i }).click();

    // Skip context gathering
    await expect(page.getByRole("button", { name: /skip/i })).toBeVisible();
    await page.getByRole("button", { name: /skip/i }).click();

    // Wait for first question
    await expect(
      page.locator('[placeholder*="Share your thoughts"]')
    ).toBeVisible();

    // Answer 5 questions
    const answers = [
      "I run an online vintage car auction business connecting collectors with rare vehicles.",
      "Our main challenges are incomplete seller submissions and manual documentation processes.",
      "Our customers are car collectors and enthusiasts who find us through newsletters and social media.",
      "We use spreadsheets, email, and a basic CRM. Our auction listing process is very manual.",
      "We want to automate seller onboarding and improve our data analytics within 12 months.",
    ];

    for (let i = 0; i < 5; i++) {
      // Check step indicator
      await expect(page.locator(".stepper")).toContainText(
        `Step ${i + 1} of 6`
      );

      // Type answer
      await page.locator("textarea").fill(answers[i]);

      // Send message
      await page.locator('button[type="submit"]').click();

      // Wait for AI response
      await expect(page.locator(".chat-bubble").last()).toBeVisible();

      // Wait a bit for the response to complete
      await page.waitForTimeout(2000);
    }

    // Should now be at step 6 (Summary)
    await expect(page.locator(".stepper")).toContainText("Step 6 of 6");
    await expect(page.locator(".stepper")).toContainText("Summary");

    // Should see summary content
    await expect(page.getByText(/summary/i)).toBeVisible();

    // Should show plan generation UI
    await expect(
      page.getByRole("button", { name: /generate.*plan/i })
    ).toBeVisible();

    // Click to generate plan
    await page.getByRole("button", { name: /generate.*plan/i }).click();

    // Wait for plan generation (can take a while)
    await expect(page.getByText(/generating.*plan/i)).toBeVisible();

    // Wait for business plan to appear
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 30000,
    });

    // Verify plan sections
    await expect(page.getByText(/opportunity summary/i)).toBeVisible();
    await expect(page.getByText(/ai roadmap/i)).toBeVisible();
    await expect(page.getByText(/roi.*cost/i)).toBeVisible();
    await expect(page.getByText(/action items/i)).toBeVisible();

    // Should have restart option
    await expect(
      page.getByRole("button", { name: /start over/i })
    ).toBeVisible();
  });

  test("should handle context gathering flow", async ({ page }) => {
    // Start the discovery process
    await page.getByRole("button", { name: /begin discovery/i }).click();

    // Should see context gathering
    await expect(page.getByText(/business context/i)).toBeVisible();

    // Try entering a website
    await page
      .getByPlaceholder(/website url/i)
      .fill("https://bringatrailer.com");
    await page.getByRole("button", { name: /analyze/i }).click();

    // Wait for analysis
    await expect(page.getByText(/analyzing/i)).toBeVisible();

    // Continue after analysis completes or timeout
    await page.waitForTimeout(5000);

    // Click continue
    await page.getByRole("button", { name: /continue/i }).click();

    // Should now be in chat mode
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("should display proper step progression", async ({ page }) => {
    // Start the discovery process
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Check initial state
    await expect(page.locator(".stepper")).toContainText("Step 1 of 6");
    await expect(page.locator(".stepper")).toContainText("Question 1");

    // Answer first question
    await page.locator("textarea").fill("Test business answer");
    await page.locator('button[type="submit"]').click();

    // Wait for response and step update
    await page.waitForTimeout(3000);

    // Should progress to step 2
    await expect(page.locator(".stepper")).toContainText("Step 2 of 6");
    await expect(page.locator(".stepper")).toContainText("Question 2");
  });

  test("should reset chat and start over", async ({ page }) => {
    // Start and progress through some questions
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Answer a question
    await page.locator("textarea").fill("Test answer");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // Reset chat
    await page.getByRole("button", { name: /reset chat/i }).click();

    // Should be back to initial state
    await expect(
      page.getByRole("button", { name: /begin discovery/i })
    ).toBeVisible();
    await expect(page.locator(".stepper")).toContainText("Step 0 of 6");
  });

  test("should handle markdown formatting correctly", async ({ page }) => {
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Answer a question
    await page.locator("textarea").fill("My business");
    await page.locator('button[type="submit"]').click();

    // Wait for AI response
    await expect(page.locator(".chat-bubble").last()).toBeVisible();

    // Check that markdown is properly rendered
    const aiMessage = page.locator(".chat-bubble").last();
    await expect(aiMessage.locator("strong")).toBeVisible(); // Bold text
    await expect(aiMessage.locator("em")).toBeVisible(); // Italic text
  });

  test("should handle error states gracefully", async ({ page }) => {
    // This test checks graceful error handling
    await page.goto("/", { waitUntil: "networkidle" });

    // Mock network failure
    await page.route("/api/chat", (route) => {
      route.abort();
    });

    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    await page.locator("textarea").fill("Test message");
    await page.locator('button[type="submit"]').click();

    // Should show some error handling or fallback
    await expect(
      page.getByText(/technical difficulty/i).or(page.getByText(/try again/i))
    ).toBeVisible();
  });

  test("should maintain chat persistence across page reloads", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Answer a question
    await page.locator("textarea").fill("Persistent test message");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // Reload page
    await page.reload();

    // Should maintain chat state
    await expect(page.getByText("Persistent test message")).toBeVisible();
    await expect(page.locator(".stepper")).toContainText("Step 2 of 6");
  });

  test("should handle mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Chat should work on mobile
    await expect(page.locator("textarea")).toBeVisible();

    // Mobile controls should be visible
    await expect(
      page.locator("button").getByRole("button", { name: /reset/i })
    ).toBeVisible();
  });

  test("should show business profile information", async ({ page }) => {
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Answer question about business type
    await page.locator("textarea").fill("I run a software consulting business");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    // Business profile should update (on larger screens)
    if (await page.locator(".business-profile").isVisible()) {
      await expect(page.locator(".business-profile")).toContainText(
        /business type/i
      );
    }
  });
});

