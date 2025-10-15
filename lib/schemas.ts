import { z } from "zod";

export interface ContextSummary {
  businessType: string;
  painPoints: string;
  goals: string;
  dataAvailable: string;
  priorTechUse: string;
  growthIntent: string;
}

export const ContextSummarySchema = z
  .object({
    businessType: z.string(),
    painPoints: z.string(),
    goals: z.string(),
    dataAvailable: z.string(),
    priorTechUse: z.string(),
    growthIntent: z.string(),
  })
  .strict();

export type Citations = Array<{
  sourceId: string;
  page?: number;
  url?: string;
}>;

export const GuidedJsonSchemaForNIM = {
  type: "object",
  properties: {
    businessType: { type: "string" },
    painPoints: { type: "string" },
    goals: { type: "string" },
    dataAvailable: { type: "string" },
    priorTechUse: { type: "string" },
    growthIntent: { type: "string" },
  },
  required: [
    "businessType",
    "painPoints",
    "goals",
    "dataAvailable",
    "priorTechUse",
    "growthIntent",
  ],
  additionalProperties: false,
} as const;

// Website Analysis Schema for NIM guided JSON
export const WebsiteAnalysisSchemaForNIM = {
  type: "object",
  properties: {
    productsServices: { type: "string" },
    customerSegment: { type: "string" },
    techStack: { type: "string" },
    marketingStrengths: { type: "string" },
    marketingWeaknesses: { type: "string" },
  },
  required: [
    "productsServices",
    "customerSegment",
    "techStack",
    "marketingStrengths",
    "marketingWeaknesses",
  ],
  additionalProperties: false,
} as const;

// LeadSignals types
export interface LeadSignals {
  budgetBand: "Not specified" | "<$5k" | "$5k–$20k" | "$20k–$50k" | ">$50k";
  authority: "Owner/Partner" | "Director+" | "Staff" | "Unknown";
  urgency: "Now (0–30d)" | "Soon (31–90d)" | "Later (90+ d)" | "Unknown";
  needClarity: "Clear" | "Vague" | "Exploratory";
  dataReadiness: "Low" | "Medium" | "High";
  stackMaturity:
    | "Manual/Spreadsheets"
    | "Basic SaaS"
    | "Integrated"
    | "Unknown";
  complexity: "Low" | "Med" | "High";
  geography?: string;
  industry?: string;
  websiteFound?: boolean;
  docsCount?: number;
  researchCoverage?: number; // 0–100
  score: number; // 0–100
}

export const LeadSignalsZ = z.object({
  budgetBand: z.enum([
    "Not specified",
    "<$5k",
    "$5k–$20k",
    "$20k–$50k",
    ">$50k",
  ]),
  authority: z.enum(["Owner/Partner", "Director+", "Staff", "Unknown"]),
  urgency: z.enum(["Now (0–30d)", "Soon (31–90d)", "Later (90+ d)", "Unknown"]),
  needClarity: z.enum(["Clear", "Vague", "Exploratory"]),
  dataReadiness: z.enum(["Low", "Medium", "High"]),
  stackMaturity: z.enum([
    "Manual/Spreadsheets",
    "Basic SaaS",
    "Integrated",
    "Unknown",
  ]),
  complexity: z.enum(["Low", "Med", "High"]),
  geography: z.string().optional(),
  industry: z.string().optional(),
  websiteFound: z.boolean().optional(),
  docsCount: z.number().optional(),
  researchCoverage: z.number().min(0).max(100).optional(),
  score: z.number().min(0).max(100),
});
export type LeadSignalsT = z.infer<typeof LeadSignalsZ>;
