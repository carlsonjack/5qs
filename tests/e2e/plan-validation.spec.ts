import { test, expect } from "@playwright/test";

test.describe("Business Plan Content Validation", () => {
  test("should generate a comprehensive business plan with all required sections", async ({
    page,
  }) => {
    await page.goto("/");

    // Complete the full flow quickly
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Provide comprehensive answers to generate a good plan
    const detailedAnswers = [
      "I operate BringATrailer.com, an online auction platform for vintage and classic cars. We connect car collectors with high-quality, well-documented vehicles.",
      "Our biggest challenges are incomplete seller submissions, manual provenance verification, and time-consuming post-sale logistics coordination.",
      "Our customers are serious car collectors, automotive enthusiasts, and dealers. They discover us through our daily newsletter, social media, and word-of-mouth referrals.",
      "We use a proprietary auction platform, but rely heavily on spreadsheets and email for seller onboarding. We have basic Salesforce integration for dealers.",
      "Our 12-month goal is to automate 50% of our manual processes, implement AI-powered photo validation, and scale to 25% more auctions while maintaining quality.",
    ];

    for (let i = 0; i < 5; i++) {
      await page.locator("textarea").fill(detailedAnswers[i]);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }

    // Wait for summary and generate plan
    await expect(
      page.getByRole("button", { name: /generate.*plan/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /generate.*plan/i }).click();

    // Wait for plan generation
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 45000,
    });

    // Validate plan structure and content
    const planContent = page
      .locator('[data-testid="business-plan"]')
      .or(page.locator(".business-plan-viewer"));

    // Check for main sections
    await expect(planContent).toContainText(/opportunity summary/i);
    await expect(planContent).toContainText(/ai roadmap/i);
    await expect(planContent).toContainText(/estimated roi.*cost/i);
    await expect(planContent).toContainText(/90.*day.*action.*items/i);

    // Validate content quality
    await expect(planContent).toContainText(/auction/i); // Should reference their business
    await expect(planContent).toContainText(/automation/i); // Should address their goals
    await expect(planContent).toContainText(/collector/i); // Should mention their customers

    // Check for specific recommendations
    await expect(planContent).toContainText(/\$.*\d/); // Should have cost estimates
    await expect(planContent).toContainText(/\d.*%/); // Should have percentage improvements
    await expect(planContent).toContainText(/month/i); // Should have timeline

    // Validate action items are specific
    const actionSection = planContent
      .locator("text=/action items/i")
      .locator("..");
    await expect(actionSection).toContainText(/\[\s*\]/); // Should have checkboxes

    // Should have at least 3 action items
    const checkboxes = await actionSection.locator("text=/\\[\\s*\\]/").count();
    expect(checkboxes).toBeGreaterThanOrEqual(3);
  });

  test("should include industry-specific recommendations for car auctions", async ({
    page,
  }) => {
    await page.goto("/");

    // Complete flow with car auction context
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    const carAuctionAnswers = [
      "Online vintage car auction platform specializing in collector vehicles",
      "Manual VIN verification, photo quality issues, incomplete documentation from sellers",
      "Classic car collectors, restoration enthusiasts, automotive dealers worldwide",
      "Custom auction platform, spreadsheets for logistics, basic CRM for dealer relationships",
      "Automate seller verification, implement AI photo analysis, scale internationally",
    ];

    for (const answer of carAuctionAnswers) {
      await page.locator("textarea").fill(answer);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }

    await page.getByRole("button", { name: /generate.*plan/i }).click();
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 45000,
    });

    const planContent = page.locator("body");

    // Should include automotive-specific recommendations
    await expect(planContent).toContainText(/vin/i);
    await expect(planContent).toContainText(/photo.*validation/i);
    await expect(planContent).toContainText(/documentation/i);
    await expect(planContent).toContainText(/vehicle/i);

    // Should mention relevant AI solutions
    await expect(planContent).toContainText(/computer vision/i);
    await expect(planContent).toContainText(/image.*recognition/i);
    await expect(planContent).toContainText(/automated.*verification/i);
  });

  test("should provide realistic ROI estimates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Quick answers to get to plan
    for (let i = 0; i < 5; i++) {
      await page.locator("textarea").fill(`Business answer ${i + 1}`);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }

    await page.getByRole("button", { name: /generate.*plan/i }).click();
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 45000,
    });

    // Check for ROI section with numbers
    const roiSection = page.getByText(/roi.*cost/i).locator("..");

    // Should have cost estimates in reasonable ranges
    await expect(roiSection).toContainText(/\$[\d,]+/); // Dollar amounts
    await expect(roiSection).toContainText(/\d+.*%/); // Percentage improvements
    await expect(roiSection).toContainText(/\d+.*month/i); // Timeline

    // Should mention time savings
    await expect(roiSection).toContainText(/hours?.*month/i);
    await expect(roiSection).toContainText(/efficiency/i);
  });

  test("should generate actionable 90-day plan", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    for (let i = 0; i < 5; i++) {
      await page
        .locator("textarea")
        .fill(`Actionable business answer ${i + 1}`);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }

    await page.getByRole("button", { name: /generate.*plan/i }).click();
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 45000,
    });

    // Find action items section
    const actionSection = page.getByText(/90.*day.*action/i).locator("..");

    // Should have specific, actionable items
    await expect(actionSection).toContainText(/week/i);
    await expect(actionSection).toContainText(/research/i);
    await expect(actionSection).toContainText(/implement/i);
    await expect(actionSection).toContainText(/audit/i);

    // Should have measurable outcomes
    await expect(actionSection).toContainText(/measure/i);
    await expect(actionSection).toContainText(/track/i);
    await expect(actionSection).toContainText(/kpi/i);
  });

  test("should allow plan download and sharing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    for (let i = 0; i < 5; i++) {
      await page.locator("textarea").fill(`Download test answer ${i + 1}`);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }

    await page.getByRole("button", { name: /generate.*plan/i }).click();
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 45000,
    });

    // Should have download/copy options
    const downloadButton = page.getByRole("button", { name: /download/i });
    const copyButton = page.getByRole("button", { name: /copy/i });

    if (await downloadButton.isVisible()) {
      await expect(downloadButton).toBeEnabled();
    }

    if (await copyButton.isVisible()) {
      await expect(copyButton).toBeEnabled();
    }
  });

  test("should maintain plan quality with minimal inputs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /begin discovery/i }).click();
    await page.getByRole("button", { name: /skip/i }).click();

    // Provide minimal answers
    const minimalAnswers = [
      "Small business",
      "Need help",
      "Local customers",
      "Email and spreadsheets",
      "Want to grow",
    ];

    for (const answer of minimalAnswers) {
      await page.locator("textarea").fill(answer);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    }

    await page.getByRole("button", { name: /generate.*plan/i }).click();
    await expect(page.getByText(/business plan/i)).toBeVisible({
      timeout: 45000,
    });

    // Even with minimal input, should still generate comprehensive plan
    const planContent = page.locator("body");

    await expect(planContent).toContainText(/opportunity/i);
    await expect(planContent).toContainText(/roadmap/i);
    await expect(planContent).toContainText(/cost/i);
    await expect(planContent).toContainText(/action/i);

    // Should provide general but helpful recommendations
    await expect(planContent).toContainText(/automation/i);
    await expect(planContent).toContainText(/analytics/i);
    await expect(planContent).toContainText(/efficiency/i);
  });
});

