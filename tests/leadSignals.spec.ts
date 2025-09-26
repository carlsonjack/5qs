import { describe, it, expect } from "vitest";
import { LeadSignalsZ } from "@/lib/schemas";
import { computeLeadScore } from "@/lib/lead/score";

describe("LeadSignals", () => {
  it("parses guided JSON and score in range", () => {
    const sample = {
      budgetBand: "$5k–$20k",
      authority: "Owner/Partner",
      urgency: "Soon (31–90d)",
      needClarity: "Clear",
      dataReadiness: "Medium",
      stackMaturity: "Basic SaaS",
      complexity: "Med",
      score: 55,
    };
    const parsed = LeadSignalsZ.parse(sample);
    expect(parsed.score).toBeGreaterThanOrEqual(0);
    expect(parsed.score).toBeLessThanOrEqual(100);
    expect(computeLeadScore(parsed)).toBeGreaterThanOrEqual(0);
  });
});
