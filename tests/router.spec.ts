import { describe, it, expect } from "vitest";
import { chooseModel, shouldTriggerResearch } from "@/lib/llm/router";

describe("Model router", () => {
  it("uses cost model in intake when costMode=true", () => {
    const model = chooseModel({
      phase: "intake",
      docStats: { pages: 0, sources: 0, conflicts: false },
      userFlags: { costMode: true },
    });
    expect(model).toBeTruthy();
  });

  it("triggers research on large doc set", () => {
    const trigger = shouldTriggerResearch({
      docStats: { pages: 25, sources: 1, conflicts: false },
      userQuery: "general",
    });
    expect(trigger).toBe(true);
  });

  it("triggers research on conflicts", () => {
    const trigger = shouldTriggerResearch({
      docStats: { pages: 5, sources: 2, conflicts: true },
      userQuery: "general",
    });
    expect(trigger).toBe(true);
  });
});
