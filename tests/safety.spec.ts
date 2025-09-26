import { describe, it, expect } from "vitest";
import { filterOutput } from "@/lib/safety";

describe("Safety filter", () => {
  it("redacts api keys and localhost", () => {
    const input = "key: sk-abcdef123456 localhost:3000";
    const { text, redactions } = filterOutput(input);
    expect(text).not.toContain("sk-");
    expect(text.toLowerCase()).not.toContain("localhost");
    expect(text).toContain("[redacted]");
    expect(text).toContain("[secret]");
    expect(redactions).toBeGreaterThan(0);
  });
});
