import { describe, it, expect } from "vitest";
import { ContextSummarySchema } from "@/lib/schemas";

describe("ContextSummarySchema", () => {
  it("accepts a valid object", () => {
    const obj = {
      businessType: "Retail - coffee shop",
      painPoints: "Manual scheduling",
      goals: "Grow revenue 20%",
      dataAvailable: "POS exports, spreadsheets",
      priorTechUse: "Square, Google Sheets",
      growthIntent: "Open second location",
    };
    expect(() => ContextSummarySchema.parse(obj)).not.toThrow();
  });

  it("rejects extra properties", () => {
    const obj: any = {
      businessType: "Retail",
      painPoints: "Inventory",
      goals: "Growth",
      dataAvailable: "Basic",
      priorTechUse: "Sheets",
      growthIntent: "Expand",
      extra: "nope",
    };
    expect(() => ContextSummarySchema.parse(obj)).toThrow();
  });
});
