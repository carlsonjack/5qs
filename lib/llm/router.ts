export type Phase = "intake" | "plan" | "research";

export interface DocStats {
  pages: number;
  sources: number;
  conflicts: boolean;
}

export interface UserFlags {
  costMode?: boolean;
}

const ENV = {
  DEFAULT:
    process.env.LLM_DEFAULT_MODEL || "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  PLAN: process.env.LLM_PLAN_MODEL || "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  COST:
    process.env.LLM_COST_MODE_MODEL || "nvidia/llama-3.1-nemotron-nano-4b-v1.1",
  FAST: process.env.LLM_FAST_MODEL || "nvidia/llama-3.1-nemotron-nano-4b-v1.1",
};

export function chooseModel({
  phase,
  docStats,
  userFlags,
}: {
  phase: Phase;
  docStats: DocStats;
  userFlags: UserFlags;
}): string {
  const defaultModel = ENV.DEFAULT;
  const planModel = ENV.PLAN;
  const costModel = ENV.COST;

  if (phase === "intake") {
    if (userFlags.costMode) return costModel;
    // Use ultra model for intake to avoid <think> tag issues
    return ENV.DEFAULT;
  }

  if (phase === "plan") {
    // If plan length requirement is small, we can use default model
    // We cannot know tokens here; caller may override. Default to plan model.
    return planModel || defaultModel;
  }

  // research
  const needsEscalation =
    docStats.conflicts || docStats.pages > 40 || docStats.sources > 6;
  if (needsEscalation) return planModel || defaultModel;
  return defaultModel;
}

export function shouldTriggerResearch({
  docStats,
  userQuery,
}: {
  docStats: DocStats;
  userQuery: string;
}): boolean {
  const explicit = /competitor|market review|benchmark|compare|research/i.test(
    userQuery || ""
  );
  if (explicit) return true;
  if (docStats.pages > 20) return true;
  if (docStats.sources > 3) return true;
  if (docStats.conflicts) return true;
  return false;
}
