import { chatCompletion } from "../nim/client";
import { researchPlannerPrompt } from "../prompts";
import { queryRag, rerankRag } from "../rag/index";

interface ResearchInputs {
  userQuery: string;
  goals?: string;
}

export interface ResearchOutput {
  research_brief: string;
  citations: Array<{ sourceId: string; page?: number; url?: string }>;
  coverage: number; // 0-100
  conflicts: string[];
}

const DEEP_RESEARCH_ENABLED =
  (process.env.DEEP_RESEARCH_ENABLED || "true").toLowerCase() === "true";

export async function runResearchAgent({
  userQuery,
  goals,
}: ResearchInputs): Promise<ResearchOutput | null> {
  if (!DEEP_RESEARCH_ENABLED) return null;

  const plannerMessages = [
    { role: "system" as const, content: researchPlannerPrompt },
    {
      role: "user" as const,
      content: `Context: ${goals || "n/a"}\nUser query: ${userQuery}`,
    },
  ];

  const planRes = await chatCompletion({
    messages: plannerMessages,
    model:
      process.env.LLM_DEFAULT_MODEL ||
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 600,
  });

  const planText = planRes.content || "";

  // Extract retrieval requests
  const retrieveLines = planText
    .split(/\n+/)
    .filter((l) => /retrieve\s*:/i.test(l))
    .slice(0, 3);

  const citations = new Set<string>();
  const notes: string[] = [];

  for (const line of retrieveLines) {
    const q = line.replace(/.*retrieve\s*:\s*/i, "").trim();
    if (!q) continue;
    const hits = await queryRag({ query: q, k: 12 });
    const top = await rerankRag({ query: q, hits, k: 6 });
    top.forEach((t) => citations.add(t.id));
    const summary = top
      .slice(0, 3)
      .map((t) => `- ${t.text.slice(0, 180)}... [${t.id}]`)
      .join("\n");
    if (summary) notes.push(`Findings for: ${q}\n${summary}`);
  }

  // Estimate coverage heuristically: proportion of queries with at least one summarized finding
  const estimatedCoverage = Math.round(
    (retrieveLines.length ? notes.length / retrieveLines.length : 0) * 100
  );

  const finalPrompt = `Summarize succinct research findings to inform an SMB AI plan. Keep it 120–200 words, cite evidence via [docId] tokens when used.\nAlso list any conflicts you see as short bullets prefixed with "conflict:".\n\nQuestions & findings:\n${notes.join(
    "\n\n"
  )}`;

  const finalizeRes = await chatCompletion({
    messages: [
      {
        role: "system",
        content: "You write concise research briefs for business planning.",
      },
      { role: "user", content: finalPrompt },
    ],
    model:
      process.env.LLM_DEFAULT_MODEL ||
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 300,
  });

  const brief = finalizeRes.content || notes.join("\n\n").slice(0, 800);
  const conflicts = (brief.match(/conflict\s*:\s*.*/gi) || [])
    .map((s) => s.replace(/conflict\s*:\s*/i, "").trim())
    .slice(0, 5);

  return {
    research_brief: brief,
    citations: Array.from(citations).map((id) => ({ sourceId: id })),
    coverage: estimatedCoverage,
    conflicts,
  };
}
