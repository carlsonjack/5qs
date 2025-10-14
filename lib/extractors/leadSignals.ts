import { chatCompletion } from "@/lib/nim/client";
import { LeadSignalsZ, LeadSignalsT } from "@/lib/schemas";

const GUIDED_JSON_SCHEMA = {
  type: "object",
  properties: {
    budgetBand: {
      type: "string",
      enum: ["Not specified", "<$5k", "$5k–$20k", "$20k–$50k", ">$50k"],
    },
    authority: {
      type: "string",
      enum: ["Owner/Partner", "Director+", "Staff", "Unknown"],
    },
    urgency: {
      type: "string",
      enum: ["Now (0–30d)", "Soon (31–90d)", "Later (90+ d)", "Unknown"],
    },
    needClarity: { type: "string", enum: ["Clear", "Vague", "Exploratory"] },
    dataReadiness: { type: "string", enum: ["Low", "Medium", "High"] },
    stackMaturity: {
      type: "string",
      enum: ["Manual/Spreadsheets", "Basic SaaS", "Integrated", "Unknown"],
    },
    complexity: { type: "string", enum: ["Low", "Med", "High"] },
    geography: { type: "string" },
    industry: { type: "string" },
    websiteFound: { type: "boolean" },
    docsCount: { type: "number" },
    researchCoverage: { type: "number" },
    score: { type: "number" },
  },
  required: [
    "budgetBand",
    "authority",
    "urgency",
    "needClarity",
    "dataReadiness",
    "stackMaturity",
    "complexity",
    "score",
  ],
  additionalProperties: false,
} as const;

const SYSTEM =
  "You extract lead-qualification signals for SMB AI projects. Output JSON only.";

export async function extractLeadSignals(input: {
  conversationText: string;
  contextSummaryJSON?: string; // ContextSummary as JSON string
  websiteAnalysis?: string; // plain text summary of website
  financialsAnalysis?: string; // plain text summary
  researchBrief?: string; // from research agent
  docsCount?: number;
  websiteFound?: boolean;
  researchCoverage?: number;
}): Promise<LeadSignalsT> {
  const prompt = `
Use all provided materials to infer lead-qualification signals for an SMB considering AI implementation.

Rules:
- If info is missing, choose "Unknown" or "Not specified" as appropriate.
- Return ONLY the JSON object matching the schema. No extra keys or commentary.

Materials:
- Conversation: ${input.conversationText}
- ContextSummary: ${input.contextSummaryJSON ?? "null"}
- WebsiteAnalysis: ${input.websiteAnalysis ?? "null"}
- FinancialsAnalysis: ${input.financialsAnalysis ?? "null"}
- ResearchBrief: ${input.researchBrief ?? "null"}
- Hints: websiteFound=${String(input.websiteFound)}, docsCount=${
    input.docsCount ?? 0
  }, researchCoverage=${input.researchCoverage ?? 0}
`;

  const resp = await chatCompletion({
    model:
      process.env.LLM_DEFAULT_MODEL ||
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 400,
    nvext: { guided_json: GUIDED_JSON_SCHEMA as any },
  });

  const first = resp.content || "{}";
  const parsed = LeadSignalsZ.safeParse(JSON.parse(first));
  if (!parsed.success) {
    // single retry with same params
    const retry = await chatCompletion({
      model:
        process.env.LLM_DEFAULT_MODEL ||
        "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.0,
      max_tokens: 400,
      nvext: { guided_json: GUIDED_JSON_SCHEMA as any },
    });
    return LeadSignalsZ.parse(JSON.parse(retry.content || "{}"));
  }
  return parsed.data;
}
