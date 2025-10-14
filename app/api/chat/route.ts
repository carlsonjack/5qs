import { type NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/nim/client";
import { reliableChatCompletion, getProviderStatus } from "@/lib/llm/providers";
import {
  discoverySystemPrompt,
  contextSummaryPrompt,
  planSystemPrompt,
} from "@/lib/prompts";
import { chooseModel, shouldTriggerResearch } from "@/lib/llm/router";
import { getProfile } from "@/lib/profiles";
import { ContextSummarySchema, GuidedJsonSchemaForNIM } from "@/lib/schemas";
import { filterOutput } from "@/lib/safety";
import { runResearchAgent } from "@/lib/research/agent";
import { extractLeadSignals } from "@/lib/extractors/leadSignals";
import { computeLeadScore } from "@/lib/lead/score";
import { withDatabaseIntegration } from "@/lib/db/integration";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ||
  "https://integrate.api.nvidia.com/v1/chat/completions";

interface ContextSummary {
  businessType: string;
  painPoints: string;
  goals: string;
  dataAvailable: string;
  priorTechUse: string;
  growthIntent: string;
}

type StepDisciplineViolation = "final_question_early" | "summary_too_early";

const FINAL_QUESTION_PATTERNS: RegExp[] = [
  /\bfinal question\b/i,
  /single most important\s+12[-\s]?month/i,
  /12[-\s]?month outcome/i,
  /as we near the end of our discovery process/i,
  /generate (?:your|the) (?:customized\s+)?ai (?:implementation|action) plan/i,
];

const SUMMARY_PATTERNS: RegExp[] = [
  /\blet me summarize\b/i,
  /\bhere'?s a summary\b/i,
  /summary of (?:what we'?ve|everything you'?ve) shared/i,
  /based on everything you'?ve shared, i'?m ready/i,
];

const STEP_REMINDERS: Record<number, string> = {
  1: "Focus on understanding their business overview—what they do and who they serve.",
  2: "Probe their pain points and bottlenecks that cost time or money.",
  3: "Explore who their customers are and how the business reaches or serves them.",
  4: "Dive into operations, workflows, software, and data practices. Do not mention the final question yet.",
  5: "Ask the final goals & vision question that wraps up remaining context.",
  6: "Provide a concise summary of what you have learned—do not ask new questions.",
};

interface StepContextDetails {
  biz: string | null;
  pains: string | null;
  goals: string | null;
  tools: string | null;
  dataAvail: string | null;
  segment: string | null;
}

function detectStepViolation(
  step: number,
  message: string
): StepDisciplineViolation | null {
  if (!message) return null;

  const normalized = message.toLowerCase();

  if (
    step <= 4 &&
    FINAL_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return "final_question_early";
  }

  if (
    step <= 5 &&
    SUMMARY_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return "summary_too_early";
  }

  return null;
}

function buildGuardrailReminder(
  step: number,
  violation: StepDisciplineViolation
): string {
  const reminder = STEP_REMINDERS[step] || STEP_REMINDERS[4];
  const correction =
    violation === "final_question_early"
      ? "You MUST NOT label this as the final question or discuss 12-month outcomes yet."
      : "Do not provide a summary or mention generating the plan yet. Ask the required question for this step.";

  return `GUARDRAIL REMINDER:\n- We are on question ${Math.min(
    step,
    5
  )} of 5.\n- ${reminder}\n- ${correction}\n- Rewrite your response so it only contains the correct question for this step.`;
}

function hasMeaningfulValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().toLowerCase() !== "not yet specified"
  );
}

function extractContextDetails(context: any): StepContextDetails {
  const safe = context && typeof context === "object" ? context : {};

  return {
    biz: hasMeaningfulValue(safe.businessType)
      ? safe.businessType.trim()
      : null,
    pains: hasMeaningfulValue(safe.painPoints) ? safe.painPoints.trim() : null,
    goals: hasMeaningfulValue(safe.goals) ? safe.goals.trim() : null,
    tools: hasMeaningfulValue(safe.priorTechUse)
      ? safe.priorTechUse.trim()
      : null,
    dataAvail: hasMeaningfulValue(safe.dataAvailable)
      ? safe.dataAvailable.trim()
      : null,
    segment: hasMeaningfulValue(safe.growthIntent)
      ? safe.growthIntent.trim()
      : null,
  };
}

function buildFallbackMessage(
  step: number,
  details: StepContextDetails
): string {
  const { biz, pains, goals, tools, dataAvail, segment } = details;

  const personalize = (prefix: string, question: string) => {
    const scope = biz ? `For your ${biz}, ` : "";
    const space = prefix && question ? " " : "";
    return `${scope}${prefix}${space}${question}`.trim();
  };

  if (step === 1) {
    if (!biz) {
      return personalize(
        "",
        "what's the primary problem your business solves and who is it for?"
      );
    }

    if (pains) {
      const looksHeuristic =
        /limited contact information|pricing transparency|professional website/i.test(
          pains
        );
      if (!looksHeuristic) {
        return personalize(
          "",
          `what's the most pressing challenge right now (e.g., ${pains})?`
        );
      }
    }

    return personalize(
      "",
      "what's the biggest bottleneck in your day-to-day right now?"
    );
  }

  if (step === 2) {
    return personalize(
      "that helps.",
      "who are your best customers today and how do they usually find or work with you?"
    );
  }

  if (step === 3) {
    const opsHook =
      tools || dataAvail
        ? `I'm noting your current setup${tools ? ` (tools: ${tools})` : ""}${
            dataAvail ? `, data: ${dataAvail}` : ""
          }. `
        : "";
    return personalize(
      opsHook,
      "which internal process feels most tedious or time-consuming, and what do you use today to handle it (spreadsheets, a CRM, email, etc.)?"
    );
  }

  if (step === 4) {
    return personalize(
      "great context.",
      "do you currently track key metrics (like leads, conversion, or fulfillment time), and if not, which would be most useful to start with?"
    );
  }

  if (step === 5) {
    const goalHint = goals ? ` considering your aim of ${goals}` : "";
    const intro = biz ? `For your ${biz}, ` : "";
    const body = `if you could achieve one major outcome in the next 12 months${goalHint} (e.g., doubling sales, expanding your team), what would it be and why does it matter right now?`;
    return `${intro}**FINAL QUESTION**\n\n${body}`.trim();
  }

  // Summary step (6+) fallback
  return `Thank you for sharing all that information! Let me summarize what I've learned about your business:\n\n*Business Overview:*\n${
    biz ? `- Your business: ${biz}` : "- Business type: Not yet specified"
  }\n${
    pains ? `- Main challenges: ${pains}` : "- Pain points: Not yet specified"
  }\n${
    goals ? `- Your goals: ${goals}` : "- Goals: Not yet specified"
  }\n\n*Operations & Data:*\n${
    tools ? `- Current tools: ${tools}` : "- Tech stack: Not yet specified"
  }\n${
    dataAvail
      ? `- Data available: ${dataAvail}`
      : "- Data sources: Not yet specified"
  }\n${
    segment
      ? `- Target customers: ${segment}`
      : "- Customer segment: Not yet specified"
  }\n\nBased on everything you've shared, I'm ready to create a personalized AI action plan that addresses your specific needs and goals. This plan will include practical recommendations, cost estimates, and a step-by-step roadmap for the next 90 days.\n\nWould you like me to generate your customized AI implementation plan now?`;
}

async function callNvidiaAPI(messages: any[], systemPrompt: string) {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not set");
  }

  const candidateModels = [
    process.env.NVIDIA_MODEL || "microsoft/phi-3-medium-128k-instruct",
    "nvidia/llama3-chatqa-1.5-8b",
    "nvidia/llama3-chatqa-1.5-70b",
    "nvidia-nemotron-4-340b-instruct",
    "nvidia/nemotron-4-340b-instruct",
  ];

  const extractContent = (data: any): string | null => {
    try {
      const choice = data?.choices?.[0];
      if (!choice) return null;
      const msg = choice.message;
      if (!msg) return null;
      // OpenAI-compatible string content
      if (typeof msg.content === "string") return msg.content;
      // Some NIMs return content as an array of parts
      if (Array.isArray(msg.content)) {
        const text = msg.content
          .map((p: any) =>
            typeof p === "string" ? p : p?.text || p?.content || ""
          )
          .join("")
          .trim();
        return text || null;
      }
      // Fallbacks
      if (typeof choice.text === "string") return choice.text;
    } catch (e) {
      console.error("Error extracting NVIDIA response:", e);
    }
    return null;
  };

  let lastError: any = null;
  for (const model of candidateModels) {
    const isChatQA = /llama3-chatqa/i.test(model);
    const sysRole = isChatQA ? "context" : "system";
    const maxTokens = isChatQA ? 1024 : 2048;

    const requestBody = {
      model,
      messages: [{ role: sysRole, content: systemPrompt }, ...messages],
      temperature: 0.6,
      top_p: 0.95,
      max_tokens: maxTokens,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(NVIDIA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(
          `NVIDIA API error (${model}): ${response.status} - ${errorText}`
        );
        console.warn(lastError.message);
        continue;
      }

      const data = await response.json();
      const content = extractContent(data);
      if (content && content.trim().length > 0) {
        console.log(`NVIDIA model succeeded: ${model}`);
        return content;
      }
      lastError = new Error(`Empty content from NVIDIA model: ${model}`);
      console.warn(lastError.message);
    } catch (err: any) {
      lastError = err;
      console.warn(
        `NVIDIA request failed for model ${model}:`,
        err?.message || err
      );
    }
  }

  if (lastError) throw lastError;
  return null;
}

async function generateContextSummary(
  messages: any[],
  analysisData?: {
    initialContext?: any;
    websiteAnalysis?: any;
    financialAnalysis?: any;
  }
): Promise<ContextSummary | null> {
  try {
    const summaryPrompt = `Analyze the following business conversation and extract key information into a JSON object. Focus only on information explicitly mentioned or very clearly implied by the user's answers.

Return ONLY a JSON object with exactly this structure and keys:
{
  "businessType": "Brief description of the business (industry, product/service)",
  "painPoints": "Main challenges or problems the user mentioned",
  "goals": "The business goals or objectives discussed",
  "dataAvailable": "Any mention of data collection, analytics, or IT systems in use",
  "priorTechUse": "Current tools, software, or technology the business uses (if mentioned)",
  "growthIntent": "Growth plans, scaling intentions, or expansion goals mentioned"
}

If a field wasn't provided by the user, use "Not yet specified" as the value.

Conversation to analyze:`;

    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Include analysis data in the prompt if available
    let analysisContext = "";
    if (analysisData) {
      analysisContext = "\n\nAdditional context from business analysis:\n";
      if (analysisData.websiteAnalysis) {
        analysisContext += `Website Analysis: ${JSON.stringify(
          analysisData.websiteAnalysis,
          null,
          2
        )}\n`;
      }
      if (analysisData.financialAnalysis) {
        analysisContext += `Financial Analysis: ${JSON.stringify(
          analysisData.financialAnalysis,
          null,
          2
        )}\n`;
      }
      if (analysisData.initialContext) {
        analysisContext += `Initial Context: ${JSON.stringify(
          analysisData.initialContext,
          null,
          2
        )}\n`;
      }
    }

    const summaryMessages: Array<{ role: "system" | "user"; content: string }> =
      [
        {
          role: "system",
          content:
            "You are a business analyst that extracts structured information. Return only JSON.",
        },
        {
          role: "user",
          content: contextSummaryPrompt(
            `${conversationText}${analysisContext}`
          ),
        },
      ];

    async function callOnce() {
      const res = await chatCompletion({
        messages: summaryMessages,
        model:
          process.env.LLM_DEFAULT_MODEL ||
          "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        temperature: 0.0,
        top_p: 0.9,
        max_tokens: 200,
        nvext: { guided_json: GuidedJsonSchemaForNIM as any },
      });
      const content = res.content?.trim() || "";

      // Better JSON parsing with repair mechanism
      let json;
      try {
        json = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw content:", content.substring(0, 500));

        // Try to repair the JSON by extracting the first valid JSON object
        const jsonMatch = content.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            json = JSON.parse(jsonMatch[0]);
            console.log("Successfully repaired JSON from malformed response");
          } catch (repairError) {
            console.error("JSON repair failed:", repairError);
            const errorMessage =
              parseError instanceof Error
                ? parseError.message
                : String(parseError);
            throw new Error(`Invalid JSON: ${errorMessage}`);
          }
        } else {
          const errorMessage =
            parseError instanceof Error
              ? parseError.message
              : String(parseError);
          throw new Error(`Invalid JSON: ${errorMessage}`);
        }
      }

      const parsed = ContextSummarySchema.parse(json);
      return parsed as ContextSummary;
    }

    let parsedSummary: ContextSummary | null = null;
    try {
      parsedSummary = await callOnce();
    } catch (e) {
      console.warn("Guided JSON validation failed, retrying once", e);
      try {
        parsedSummary = await callOnce();
      } catch (retryError) {
        console.error(
          "Both attempts failed, using fallback context summary",
          retryError
        );
        // Create a fallback context summary from available data
        parsedSummary = {
          businessType:
            analysisData?.websiteAnalysis?.productsServices ||
            analysisData?.financialAnalysis?.businessType ||
            "Not yet specified",
          painPoints: "Not yet specified",
          goals: "Not yet specified",
          dataAvailable: "Not yet specified",
          priorTechUse:
            analysisData?.websiteAnalysis?.techStack || "Not yet specified",
          growthIntent:
            analysisData?.websiteAnalysis?.customerSegment ||
            "Not yet specified",
        };
        console.log("Using fallback context summary:", parsedSummary);
      }
    }
    if (!parsedSummary) throw new Error("Context summary unavailable");

    // Map analysis data to context summary fields if available
    if (analysisData) {
      console.log("Mapping analysis data to context summary...");

      // Map website analysis data
      if (analysisData.websiteAnalysis) {
        const website = analysisData.websiteAnalysis;
        console.log("Website analysis data:", website);

        if (
          website.productsServices &&
          website.productsServices !==
            "Business offerings not clearly specified"
        ) {
          parsedSummary.businessType = website.productsServices;
          console.log("Mapped businessType:", website.productsServices);
        }
        if (
          website.customerSegment &&
          website.customerSegment !== "General audience"
        ) {
          parsedSummary.growthIntent = `Targeting: ${website.customerSegment}`;
          console.log("Mapped growthIntent:", website.customerSegment);
        }
        if (
          website.techStack &&
          website.techStack !== "Standard web presence"
        ) {
          parsedSummary.priorTechUse = website.techStack;
          console.log("Mapped priorTechUse:", website.techStack);
        }
        if (
          website.marketingStrengths &&
          website.marketingStrengths !== "Professional website presence"
        ) {
          parsedSummary.dataAvailable = website.marketingStrengths;
          console.log("Mapped dataAvailable:", website.marketingStrengths);
        }
      }

      // Map financial analysis data
      if (analysisData.financialAnalysis) {
        const financial = analysisData.financialAnalysis;
        console.log("Financial analysis data:", financial);

        if (
          financial.businessType &&
          financial.businessType !== "Business Entity"
        ) {
          parsedSummary.businessType =
            parsedSummary.businessType || financial.businessType;
          console.log("Mapped financial businessType:", financial.businessType);
        }
        if (
          financial.revenueTrend &&
          financial.revenueTrend !==
            "Revenue information not clearly identified"
        ) {
          parsedSummary.dataAvailable =
            parsedSummary.dataAvailable ||
            `Financial data: ${financial.revenueTrend}`;
          console.log(
            "Mapped financial dataAvailable:",
            financial.revenueTrend
          );
        }
        if (
          financial.largestCostCenters &&
          financial.largestCostCenters !== "Cost breakdown not clearly visible"
        ) {
          parsedSummary.painPoints =
            parsedSummary.painPoints ||
            `Cost challenges: ${financial.largestCostCenters}`;
          console.log(
            "Mapped financial painPoints:",
            financial.largestCostCenters
          );
        }
      }

      console.log("Final mapped context summary:", parsedSummary);
    }

    // Clean and sanitize the context summary values
    const cleanedSummary = cleanContextSummary(parsedSummary);
    console.log("Cleaned context summary:", cleanedSummary);

    return cleanedSummary as ContextSummary;
  } catch (error) {
    console.error("Error generating context summary:", error);
    return null;
  }
}

// Helper function to clean and sanitize context summary values
function cleanContextSummary(summary: any): any {
  const cleaned = { ...summary };

  // Clean each field
  Object.keys(cleaned).forEach((key) => {
    if (typeof cleaned[key] === "string") {
      let value = cleaned[key];

      // Remove correction messages and repetitive text
      value = value.replace(/\*\*[^*]*\*\*/g, ""); // Remove **bold** text
      value = value.replace(/was incorrectly.*?correction[^.]*\./gi, ""); // Remove correction messages
      value = value.replace(/moving to correct field.*?below[^.]*\./gi, ""); // Remove field correction messages
      value = value.replace(/corrected below.*?field.*?below/gi, ""); // Remove repetitive corrections
      value = value.replace(/,\s*,/g, ","); // Remove double commas
      value = value.replace(/\s+/g, " "); // Normalize whitespace
      value = value.trim();

      // Truncate very long values
      if (value.length > 300) {
        value = value.substring(0, 297) + "...";
      }

      // If value is empty or just correction text, set to default
      if (
        !value ||
        value.length < 3 ||
        value.toLowerCase().includes("correction")
      ) {
        value = "Not yet specified";
      }

      cleaned[key] = value;
    }
  });

  return cleaned;
}

async function generateBusinessPlan(
  messages: any[],
  contextSummary: ContextSummary | null,
  planModel: string,
  options?: {
    initialContext?: any;
    websiteAnalysis?: any;
    financialAnalysis?: any;
    researchBrief?: string | null;
    citations?: Array<{ sourceId: string; page?: number; url?: string }>;
    planPrompt?: string;
    attachedFiles?: Array<{ name: string; content: string }>;
  }
): Promise<string> {
  try {
    console.log("Triggering business plan generation");

    const businessPlanPrompt =
      options?.planPrompt ||
      `You are an expert AI strategy consultant. Create a comprehensive, actionable AI Implementation Plan for this specific business. The plan must be substantially longer and more valuable than typical business plans, with specific vendor recommendations and industry insights.

**FORMATTING REQUIREMENTS:**
- Use proper markdown formatting with clear headings
- For tables, use proper markdown table format: | Column | Column |
- Include specific company names, platforms, and costs
- Provide concrete numbers and timelines throughout
- Use bullet points for easy scanning

**PLAN STRUCTURE:**

## 1. Executive Summary & Business Analysis
Provide detailed analysis of their current situation, industry position, and specific AI transformation opportunities based on their exact business context.

## 2. Industry Intelligence
Analyze their specific industry's AI adoption trends, competitive landscape, and regulatory considerations. Include industry-specific benchmarks and success stories.

## 3. Phased AI Roadmap with Specific Tools

### Phase 1: Quick Wins (0-30 Days)
Recommend specific platforms with exact vendor names, costs, and implementation steps.

### Phase 2: Core Systems (31-90 Days)
Advanced automation with specific software recommendations and integration approaches.

### Phase 3: Advanced AI (90+ Days)
Cutting-edge capabilities with custom development opportunities.

## 4. Specific Technology Recommendations

Create detailed vendor comparison tables:

| Category | Platform | Vendor | Monthly Cost | Setup Time | Key Benefits |
|----------|----------|---------|--------------|------------|--------------|
| [Specific category] | [Exact platform name] | [Company] | $X-Y | X weeks | [Specific benefits] |

Include recommendations for:
- Customer service AI platforms (specific names like Intercom, Zendesk, etc.)
- Business intelligence tools (specific platforms)
- Marketing automation systems
- Process automation tools
- Industry-specific AI solutions

## 5. Detailed Financial Analysis

Create cost breakdown tables and ROI projections with specific dollar amounts, timelines, and expected returns.

## 6. Week-by-Week Implementation Plan
Provide specific, actionable tasks for the first 90 days with measurable outcomes.

## 7. Success Metrics & KPIs
Define specific metrics with baseline, targets, and measurement methods in table format.

**CRITICAL REQUIREMENTS:**
- Reference their specific business type, challenges, and goals throughout
- Include actual company names and platforms (Salesforce, HubSpot, Microsoft, Google, etc.)
- Provide specific cost ranges and timelines
- Make recommendations highly specific to their industry and situation
- Include 2-3x more detailed content than typical business plans
- Use research findings and citations where available

**Context Summary JSON:**
${JSON.stringify(contextSummary, null, 2)}

**Additional Context (may be partially available):**
Initial Context: ${JSON.stringify(options?.initialContext ?? null, null, 2)}
Website Analysis: ${JSON.stringify(options?.websiteAnalysis ?? null, null, 2)}
Financial Analysis: ${JSON.stringify(
        options?.financialAnalysis ?? null,
        null,
        2
      )}

**Research Intelligence:**
${
  options?.researchBrief
    ? `Research Brief: ${options.researchBrief}`
    : "No additional research available"
}

**User-Provided Documents:**
${
  options?.attachedFiles && options.attachedFiles.length > 0
    ? options.attachedFiles
        .map(
          (file) =>
            `\n--- Content from ${file.name} ---\n${file.content}\n--- End of ${file.name} ---`
        )
        .join("\n")
    : "No documents attached"
}

**Citations and Sources:**
${
  options?.citations && options.citations.length > 0
    ? options.citations
        .map(
          (citation, index) =>
            `[${index + 1}] ${citation.sourceId}${
              citation.url ? ` (${citation.url})` : ""
            }${citation.page ? ` - Page ${citation.page}` : ""}`
        )
        .join("\n")
    : "No external citations available"
}

**Full Conversation History:**
${messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n")}

**CITATION REQUIREMENTS:**
- When referencing external research or industry data, include citations using [1], [2] format
- Reference the research brief findings where relevant
- Include industry statistics and benchmarks from authoritative sources
- Cite specific tools, platforms, and case studies mentioned in research

**WRITING GUIDELINES:**
- Use a friendly, encouraging tone and avoid technical jargon
- The reader should feel confident and excited, not overwhelmed
- Make advice specific to the information given (refer to their industry or goals directly)
- If some information was "Not yet specified," assume minimal setup and suggest starting from scratch
- Be thorough and focus on high-impact recommendations
- Ensure proper markdown formatting with adequate spacing for readability`;

    const userContent = `Context Summary JSON:\n${JSON.stringify(
      contextSummary,
      null,
      2
    )}\n\nAdditional Context (may be partially available):\nInitial Context: ${JSON.stringify(
      options?.initialContext ?? null,
      null,
      2
    )}\nWebsite Analysis: ${JSON.stringify(
      options?.websiteAnalysis ?? null,
      null,
      2
    )}\nFinancial Analysis: ${JSON.stringify(
      options?.financialAnalysis ?? null,
      null,
      2
    )}\nFull Conversation History:\n${messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n")}`;

    const res = await reliableChatCompletion({
      messages: [
        { role: "system", content: businessPlanPrompt },
        { role: "user", content: userContent },
      ],
      model: planModel,
      temperature: 0.45,
      top_p: 0.95,
      max_tokens: 6000, // Increased for comprehensive plans
    });

    console.log("Business plan response debug:", {
      content: res.content,
      contentLength: res.content?.length,
      hasContent: !!res.content,
      responseKeys: Object.keys(res),
      fullResponse: res,
    });

    if (!res.content || res.content.trim().length === 0) {
      console.error("Empty business plan response - AI service failed");
      throw new Error("Failed to generate business plan content");
    }
    console.log(
      "Business plan generated successfully, length:",
      res.content.length
    );
    return res.content;
  } catch (error) {
    console.error("Error generating business plan:", error);

    // Enhanced fallback plan with retry CTA
    return `# Your Business Plan

*Note: We encountered a technical issue generating your custom plan. Please try restarting the conversation for a fully personalized plan, or use this template as a starting point.*

## 1. Opportunity Summary

Based on our conversation, your business has several opportunities for growth and optimization:

- **Current Position**: Small to medium business looking to leverage technology for growth
- **Key Challenges**: Operational efficiency, customer engagement, and competitive positioning
- **Market Opportunity**: Significant potential for AI-driven improvements in your industry
- **Competitive Advantage**: Early adoption of AI tools can differentiate your business

## 2. AI Roadmap

### Phase 1: Foundation (Months 1-3)
- **Customer Service**: Implement chatbots for basic customer inquiries
- **Data Collection**: Set up analytics to track customer behavior and business metrics
- **Process Automation**: Automate repetitive tasks like invoicing and scheduling

### Phase 2: Enhancement (Months 4-6)
- **Personalization**: Use AI for personalized customer recommendations
- **Predictive Analytics**: Forecast demand and optimize inventory
- **Marketing Automation**: AI-driven email campaigns and social media management

### Phase 3: Advanced Integration (Months 7-12)
- **Advanced Analytics**: Implement machine learning for business insights
- **Custom Solutions**: Develop AI tools specific to your industry needs
- **Competitive Intelligence**: Use AI to monitor market trends and competitors

## 3. Estimated ROI & Cost

### Initial Investment
- **Software & Tools**: $500 - $2,000/month
- **Training & Setup**: $2,000 - $5,000 one-time
- **Consulting**: $3,000 - $8,000 for implementation

### Expected Returns (12 months)
- **Efficiency Gains**: 20-30% reduction in manual tasks
- **Customer Satisfaction**: 15-25% improvement in response times
- **Revenue Growth**: 10-20% increase through better customer insights
- **Cost Savings**: $10,000 - $30,000 annually in operational costs

### Break-even Timeline: 6-9 months

## 4. Next 90-Day Action Items

### Week 1-2: Assessment & Planning
- [ ] Audit current business processes and identify automation opportunities
- [ ] Research AI tools specific to your industry
- [ ] Set up basic analytics (Google Analytics, social media insights)
- [ ] Create a budget for AI implementation

### Week 3-6: Quick Wins
- [ ] Implement a simple chatbot for your website
- [ ] Set up automated email marketing campaigns
- [ ] Use AI writing tools for content creation
- [ ] Implement basic CRM with automation features

### Week 7-12: Foundation Building
- [ ] Train team on new AI tools and processes
- [ ] Establish data collection and analysis routines
- [ ] Create standard operating procedures for AI-enhanced workflows
- [ ] Measure and document initial improvements

### Ongoing: Optimization
- [ ] Weekly review of AI tool performance
- [ ] Monthly assessment of ROI and adjustments
- [ ] Quarterly planning for next phase implementation
- [ ] Continuous learning about new AI opportunities

---

## 🔄 Need a Custom Plan?

This is a general template. For a fully personalized business plan based on your specific situation:

1. **Restart the conversation** and provide more detailed information about your business
2. **Contact our support team** for a detailed consultation
3. **Book a strategy session** with an AI business consultant

*Your success is our priority. Let's build something amazing together!*`;
  }
}

export async function POST(req: NextRequest) {
  return withDatabaseIntegration(req, async (db) => {
    let messages,
      currentStep,
      initialContext,
      websiteAnalysis,
      financialAnalysis,
      attachedFiles;
    let rawBody: any = null;

    try {
      rawBody = await req.json();
      messages = rawBody.messages;
      currentStep = rawBody.currentStep;
      initialContext = rawBody.initialContext;
      websiteAnalysis = rawBody.websiteAnalysis;
      financialAnalysis = rawBody.financialAnalysis;
      attachedFiles = rawBody.attachedFiles;
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    try {
      const variant =
        req.nextUrl.searchParams.get("v") || rawBody?.variant || null;
      const profile = getProfile(variant);
      console.log(
        `Processing request - Step: ${currentStep}, Messages: ${messages.length}`
      );

      // Track analytics event
      await db.trackEvent("chat_request", "chat_message", {
        step: currentStep,
        messageCount: messages.length,
        variant: variant,
        hasWebsiteAnalysis: !!websiteAnalysis,
        hasFinancialAnalysis: !!financialAnalysis,
        hasAttachedFiles: !!(attachedFiles && attachedFiles.length > 0),
      });

      // Derive a reliable step server-side to avoid client desync during failures
      const userMessages = messages.filter((msg: any) => msg.role === "user");
      const assistantMessages = messages.filter(
        (msg: any) => msg.role === "assistant"
      );
      // Step should be based on assistant messages (questions asked)
      const derivedStep = Math.min(6, assistantMessages.length + 1);
      const effectiveStep = Math.max(currentStep || 1, derivedStep);

      // Only generate business plan if we have 6 user messages AND 6 assistant messages (user confirmed after summary)
      // This means: 5 Q&A pairs + 1 summary from AI + 1 confirmation from user
      const reachedPlanGeneration =
        userMessages.length >= 6 && assistantMessages.length >= 6;
      const isBusinessPlanStep = profile.generatePlan && reachedPlanGeneration;

      if (isBusinessPlanStep) {
        console.log("Step 6 complete - triggering business plan generation...");
        console.log("Triggering business plan generation");

        try {
          // Generate or update the context summary
          const contextSummary = await generateContextSummary(messages, {
            initialContext,
            websiteAnalysis,
            financialAnalysis,
          });

          // Compute doc stats and research mode
          const webLen =
            typeof websiteAnalysis?.contentSample === "string"
              ? websiteAnalysis.contentSample.length
              : 0;
          const finLen =
            typeof financialAnalysis?.extractedTextSample === "string"
              ? financialAnalysis.extractedTextSample.length
              : 0;
          const pages = Math.round((webLen + finLen) / 1500);
          const sources =
            (websiteAnalysis ? 1 : 0) + (financialAnalysis ? 1 : 0);
          const wType = websiteAnalysis?.productsServices;
          const fType = financialAnalysis?.businessType;
          const conflicts = Boolean(
            wType &&
              fType &&
              wType !== "Business offerings not clearly specified" &&
              fType !== "Business Entity" &&
              wType !== fType
          );
          const docStats = { pages, sources, conflicts };

          // Optional deep research
          const deepResearch =
            (process.env.DEEP_RESEARCH_ENABLED || "true").toLowerCase() ===
            "true";
          let researchBrief: string | null = null;
          let citations:
            | Array<{ sourceId: string; page?: number; url?: string }>
            | undefined;
          if (
            deepResearch &&
            shouldTriggerResearch({
              docStats,
              userQuery: userMessages[userMessages.length - 1]?.content || "",
            })
          ) {
            const research = await runResearchAgent({
              userQuery: userMessages[userMessages.length - 1]?.content || "",
              goals: contextSummary?.goals,
            });
            researchBrief = research?.research_brief || null;
            citations = research?.citations;
          }

          // Choose model for business plan generation
          const planModel = chooseModel({
            phase: "plan",
            docStats: { pages: 0, sources: 0, conflicts: false },
            userFlags: {
              costMode:
                (process.env.COST_MODE || "false").toLowerCase() === "true",
            },
          });

          // Generate the business plan
          const businessPlanMarkdown = await generateBusinessPlan(
            messages,
            contextSummary || initialContext,
            planModel,
            {
              initialContext,
              websiteAnalysis,
              financialAnalysis,
              researchBrief,
              citations,
              planPrompt: profile.planPrompt,
              attachedFiles,
            }
          );

          console.log("Business plan generation completed successfully");

          // LeadSignals extraction (feature-flagged) - moved up to fix scope
          const LEAD_SIGNALS_ENABLED =
            (process.env.LEAD_SIGNALS_ENABLED || "true").toLowerCase() ===
            "true";
          let leadSignals: any = undefined;
          if (LEAD_SIGNALS_ENABLED) {
            try {
              const conversationText = messages
                .map((m: any) => `${m.role}: ${m.content}`)
                .join("\n");
              const ls = await extractLeadSignals({
                conversationText,
                contextSummaryJSON: JSON.stringify(contextSummary || {}),
                websiteAnalysis:
                  typeof websiteAnalysis === "object"
                    ? JSON.stringify(websiteAnalysis)
                    : String(websiteAnalysis || ""),
                financialsAnalysis:
                  typeof financialAnalysis === "object"
                    ? JSON.stringify(financialAnalysis)
                    : String(financialAnalysis || ""),
              });
              if (
                ls &&
                typeof ls === "object" &&
                typeof ls.score === "number"
              ) {
                ls.score = computeLeadScore(ls);
              }
              leadSignals = ls;
            } catch (e) {
              console.warn("LeadSignals extraction failed:", e);
            }
          }

          // Save business plan to database
          const businessPlan = await db.saveBusinessPlan({
            title: `AI Implementation Plan - ${new Date().toLocaleDateString()}`,
            content: businessPlanMarkdown,
            planLength: businessPlanMarkdown.length,
            generationTime: Date.now(), // This should be calculated properly
            modelUsed: planModel,
            planHighlights: Array.from(
              new Set(
                (businessPlanMarkdown.match(/^\s*-\s+.+$/gm) || [])
                  .slice(0, 3)
                  .map((s) => s.replace(/^\s*-\s+/, "").trim())
              )
            ),
            estimatedROI: "15-25% efficiency improvement within 12 months",
            implementationTimeline: "90-day phased approach",
          });

          // Update conversation context with final summary
          await db.updateContext({
            contextSummary,
            websiteAnalysis,
            financialAnalysis,
            leadSignals,
          });

          // Save all messages to database
          for (const message of messages) {
            await db.saveMessage(message.role, message.content, {
              stepNumber: effectiveStep,
              isBusinessPlan:
                message.role === "assistant" && isBusinessPlanStep,
            });
          }

          // Track business plan generation event
          await db.trackEvent("business_plan", "plan_generated", {
            planId: businessPlan.id,
            planLength: businessPlanMarkdown.length,
            hasResearch: !!researchBrief,
            citationsCount: citations?.length || 0,
            leadScore: leadSignals?.score || 0,
          });

          // Return both the context summary and business plan
          const filtered = filterOutput(businessPlanMarkdown);

          return NextResponse.json({
            message:
              "Thank you for sharing all that information! I've prepared a customized business plan based on our conversation. You can review it below, copy it, or download it for your records.",
            contextSummary: contextSummary,
            businessPlanMarkdown: filtered.text,
            isBusinessPlan: true, // Flag to help frontend identify this response
            researchBrief: researchBrief || undefined,
            citations,
            leadSignals,
            planHighlights: Array.from(
              new Set(
                (filtered.text.match(/^\s*-\s+.+$/gm) || [])
                  .slice(0, 3)
                  .map((s) => s.replace(/^\s*-\s+/, "").trim())
              )
            ),
          });
        } catch (planError) {
          console.error("Business plan generation failed:", planError);

          // Fallback: Still return a business plan even if generation fails
          const fallbackPlan = `# Your Business Plan

*Note: We encountered a technical issue generating your custom plan. Please try restarting the conversation for a fully personalized plan.*

## 1. Opportunity Summary
Based on our conversation, your business has significant opportunities for growth through strategic AI implementation.

## 2. AI Roadmap
- **Phase 1**: Start with basic automation and data collection
- **Phase 2**: Implement customer-facing AI solutions
- **Phase 3**: Advanced analytics and custom AI tools

## 3. Estimated ROI & Cost
- **Initial Investment**: $5,000 - $15,000
- **Expected ROI**: 15-25% efficiency improvement within 12 months
- **Break-even**: 6-9 months

## 4. Next 90-Day Action Items
1. Audit current processes for automation opportunities
2. Research industry-specific AI tools
3. Implement basic chatbot or automation
4. Set up analytics and measurement systems

---

## 🔄 Get Your Custom Plan
**Restart the conversation** to generate a fully personalized business plan, or contact our team for detailed consultation.`;

          // Save all messages to database
          for (const message of messages) {
            await db.saveMessage(message.role, message.content, {
              stepNumber: effectiveStep,
              isBusinessPlan:
                message.role === "assistant" && isBusinessPlanStep,
            });
          }

          return NextResponse.json({
            message:
              "I've prepared a business plan template for you. For a fully customized plan, please restart the conversation with more specific details about your business.",
            contextSummary: null,
            businessPlanMarkdown: fallbackPlan,
            isBusinessPlan: true,
            fallback: true,
          });
        }
      }

      // Regular conversation flow (steps 1-5)
      const additionalContext = {
        initialContext: initialContext ?? null,
        websiteAnalysis: websiteAnalysis ?? null,
        financialAnalysis: financialAnalysis ?? null,
      };

      console.log(
        "Additional context being passed to AI:",
        JSON.stringify(additionalContext, null, 2)
      );
      // Build enhanced system prompt with context
      let systemPrompt = profile.discoveryPrompt(effectiveStep);

      // Add attached files content to system prompt
      if (attachedFiles && attachedFiles.length > 0) {
        systemPrompt += "\n\n**User-Provided Documents:**\n";
        for (const file of attachedFiles) {
          systemPrompt += `\n--- Content from ${file.name} ---\n${file.content}\n--- End of ${file.name} ---\n`;
        }
        systemPrompt +=
          "\nUse this document content to provide more specific and relevant responses. Reference specific details from these documents when appropriate.\n";
      }

      // Add context information to system prompt
      if (
        additionalContext.websiteAnalysis ||
        additionalContext.financialAnalysis
      ) {
        systemPrompt += "\n\nAdditional Context Available:\n";

        if (additionalContext.websiteAnalysis) {
          systemPrompt += `\nWebsite Analysis:\n`;
          systemPrompt += `- Business Type: ${
            additionalContext.websiteAnalysis.productsServices ||
            "Not specified"
          }\n`;
          systemPrompt += `- Customer Segment: ${
            additionalContext.websiteAnalysis.customerSegment || "Not specified"
          }\n`;
          systemPrompt += `- Tech Stack: ${
            additionalContext.websiteAnalysis.techStack || "Not specified"
          }\n`;
          systemPrompt += `- Marketing Strengths: ${
            additionalContext.websiteAnalysis.marketingStrengths ||
            "Not specified"
          }\n`;
          systemPrompt += `- Marketing Weaknesses: ${
            additionalContext.websiteAnalysis.marketingWeaknesses ||
            "Not specified"
          }\n`;
        }

        if (additionalContext.financialAnalysis) {
          systemPrompt += `\nFinancial Analysis:\n`;
          systemPrompt += `- Business Type: ${
            additionalContext.financialAnalysis.businessType || "Not specified"
          }\n`;
          systemPrompt += `- Revenue Trend: ${
            additionalContext.financialAnalysis.revenueTrend || "Not specified"
          }\n`;
          systemPrompt += `- Largest Cost Centers: ${
            additionalContext.financialAnalysis.largestCostCenters ||
            "Not specified"
          }\n`;
          systemPrompt += `- Profit Margins: ${
            additionalContext.financialAnalysis.profitMargins || "Not specified"
          }\n`;
          systemPrompt += `- Seasonality: ${
            additionalContext.financialAnalysis.seasonality || "Not specified"
          }\n`;
          systemPrompt += `- Cash Flow Risks: ${
            additionalContext.financialAnalysis.cashFlowRisks || "Not specified"
          }\n`;
        }

        systemPrompt += `\nUse this context to personalize your questions and provide more relevant insights. Reference specific details when appropriate.`;
      }

      console.log("Making request to NIM for conversation...");

      // Compute docStats for routing in intake as well
      const webLen2 =
        typeof websiteAnalysis?.contentSample === "string"
          ? websiteAnalysis.contentSample.length
          : 0;
      const finLen2 =
        typeof financialAnalysis?.extractedTextSample === "string"
          ? financialAnalysis.extractedTextSample.length
          : 0;
      const pages2 = Math.round((webLen2 + finLen2) / 1500);
      const sources2 = (websiteAnalysis ? 1 : 0) + (financialAnalysis ? 1 : 0);
      const conflicts2 = false;
      const intakeDocStats = {
        pages: pages2,
        sources: sources2,
        conflicts: conflicts2,
      };

      const intakeModel = chooseModel({
        phase: "intake",
        docStats: intakeDocStats,
        userFlags: {
          costMode: (process.env.COST_MODE || "false").toLowerCase() === "true",
        },
      });

      const stepContextDetails = extractContextDetails(initialContext);

      const MAX_GUARD_RETRIES = 2;
      let aiMessage: string | undefined;
      let violation: StepDisciplineViolation | null = null;
      let guardrailNote = "";

      for (let attempt = 0; attempt <= MAX_GUARD_RETRIES; attempt++) {
        const systemPromptWithGuard = guardrailNote
          ? `${systemPrompt}\n\n${guardrailNote}`
          : systemPrompt;

        try {
          // Increase token limit for final question (step 5) and summary step (step 6)
          const tokenLimit =
            effectiveStep === 6 ? 800 : effectiveStep === 5 ? 600 : 300;

          const res = await reliableChatCompletion({
            messages: [
              { role: "system", content: systemPromptWithGuard },
              ...messages,
            ],
            model: intakeModel,
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: tokenLimit,
          });
          aiMessage = res.content;
        } catch (nimError: any) {
          console.error("NIM chat error:", nimError);

          if (nimError.status === 404) {
            console.log(
              `Model ${intakeModel} not found, trying fallback to default model`
            );
            try {
              const fallbackModel =
                process.env.LLM_DEFAULT_MODEL ||
                "nvidia/llama-3.1-nemotron-ultra-253b-v1";
              const fallbackTokenLimit =
                effectiveStep === 6 ? 800 : effectiveStep === 5 ? 600 : 300;
              const res = await chatCompletion({
                messages: [
                  { role: "system", content: systemPromptWithGuard },
                  ...messages,
                ],
                model: fallbackModel,
                temperature: 0.3,
                top_p: 0.9,
                max_tokens: fallbackTokenLimit,
              });
              aiMessage = res.content;
              console.log(`Successfully used fallback model: ${fallbackModel}`);
            } catch (fallbackError: any) {
              console.error("Fallback model also failed:", fallbackError);
              throw fallbackError;
            }
          } else if (nimError.retryable) {
            const fallbackMessage = `I'm experiencing some technical difficulties with our AI service right now. The system is temporarily unavailable, but I can still help you with basic questions.

Could you please try again in a moment? The issue should resolve itself shortly.`;

            // Save user message to database
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage && lastUserMessage.role === "user") {
              await db.saveMessage(
                lastUserMessage.role,
                lastUserMessage.content,
                {
                  stepNumber: effectiveStep,
                }
              );
            }

            // Save assistant fallback response to database
            await db.saveMessage("assistant", fallbackMessage, {
              stepNumber: effectiveStep,
              modelUsed: "fallback",
            });

            return NextResponse.json({
              message: fallbackMessage,
              fallback: true,
              contextSummary: null,
            });
          } else {
            throw nimError;
          }
        }

        if (!aiMessage) {
          throw new Error("No response from NVIDIA API");
        }

        violation = detectStepViolation(effectiveStep, aiMessage);
        if (!violation) {
          break;
        }

        console.warn(
          `Guardrail triggered for step ${effectiveStep} (attempt ${
            attempt + 1
          }): ${violation}`
        );
        guardrailNote = buildGuardrailReminder(effectiveStep, violation);
        aiMessage = undefined;
      }

      if (!aiMessage) {
        console.warn(
          `Guardrail fallback engaged for step ${effectiveStep}; using templated prompt.`
        );
        aiMessage = buildFallbackMessage(effectiveStep, stepContextDetails);
      }

      // Save user message to database
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === "user") {
        await db.saveMessage(lastUserMessage.role, lastUserMessage.content, {
          stepNumber: effectiveStep,
        });
      }

      // Save assistant response to database
      await db.saveMessage("assistant", aiMessage, {
        stepNumber: effectiveStep,
        modelUsed: intakeModel,
      });

      // Update conversation context
      await db.updateContext({
        contextSummary: initialContext,
        websiteAnalysis,
        financialAnalysis,
      });

      // Generate context summary after getting the response
      const updatedMessages = [
        ...messages,
        { role: "assistant", content: aiMessage },
      ];
      const contextSummary = await generateContextSummary(updatedMessages, {
        initialContext,
        websiteAnalysis,
        financialAnalysis,
      });

      const filtered = filterOutput(aiMessage);
      return NextResponse.json({
        message: filtered.text,
        contextSummary: contextSummary,
      });
    } catch (error) {
      console.error("Chat API error:", error);

      // Log system health for debugging
      await db.logSystemHealth({
        service: "chat_api",
        endpoint: "/api/chat",
        method: "POST",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: "api_error",
      });

      // Context-aware fallback question using any available analyses
      const ctx = initialContext || {};
      const step = currentStep || 1;
      const fallbackMessage = buildFallbackMessage(
        Math.min(step, 6),
        extractContextDetails(ctx)
      );

      // Save user message to database
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === "user") {
        await db.saveMessage(lastUserMessage.role, lastUserMessage.content, {
          stepNumber: step,
        });
      }

      // Save assistant fallback response to database
      await db.saveMessage("assistant", fallbackMessage, {
        stepNumber: step,
        modelUsed: "fallback",
      });

      return NextResponse.json({
        message: fallbackMessage,
        fallback: true,
        contextSummary: ctx || null,
      });
    }
  });
}
