export type BadgeType =
  | "first_step"
  | "discovery_complete"
  | "data_ready"
  | "new_insight"
  | "researcher"
  | "strategist"
  | "plan_ready"
  | "feedback_master";

export interface BadgeDefinition {
  id: BadgeType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: "blue" | "purple" | "green" | "orange" | "red" | "yellow";
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const BADGES: Record<BadgeType, BadgeDefinition> = {
  first_step: {
    id: "first_step",
    label: "First Step",
    description: "Started your AI discovery journey",
    icon: "Rocket",
    color: "blue",
    rarity: "common",
  },
  discovery_complete: {
    id: "discovery_complete",
    label: "Discovery Complete",
    description: "Answered the first 2 questions",
    icon: "Compass",
    color: "purple",
    rarity: "common",
  },
  data_ready: {
    id: "data_ready",
    label: "Data Ready",
    description: "Uploaded or analyzed business data",
    icon: "Database",
    color: "green",
    rarity: "rare",
  },
  new_insight: {
    id: "new_insight",
    label: "New Insight",
    description: "Revealed a key business metric",
    icon: "Lightbulb",
    color: "yellow",
    rarity: "rare",
  },
  researcher: {
    id: "researcher",
    label: "Researcher",
    description: "Provided detailed answers to all questions",
    icon: "Brain",
    color: "blue",
    rarity: "epic",
  },
  strategist: {
    id: "strategist",
    label: "Strategist",
    description: "Completed discovery with rich context",
    icon: "Target",
    color: "purple",
    rarity: "epic",
  },
  plan_ready: {
    id: "plan_ready",
    label: "Plan Ready",
    description: "Generated your first business plan",
    icon: "CheckCircle",
    color: "green",
    rarity: "epic",
  },
  feedback_master: {
    id: "feedback_master",
    label: "Feedback Master",
    description: "Refined your plan with follow-ups",
    icon: "Sparkles",
    color: "orange",
    rarity: "legendary",
  },
};

export interface BadgeProgress {
  earnedBadges: BadgeType[];
  earnedAt: Record<BadgeType, number>; // timestamp when earned
  nextMilestone?: BadgeType;
}

export const getUnlockedBadges = (
  currentStep: number,
  contextSummary: any,
  hasUploadedData: boolean,
  hasGeneratedPlan: boolean
): BadgeType[] => {
  const badges: BadgeType[] = [];

  // first_step: when conversation starts
  if (currentStep >= 1) {
    badges.push("first_step");
  }

  // discovery_complete: answered first 2 questions
  if (currentStep >= 3) {
    badges.push("discovery_complete");
  }

  // data_ready: uploaded or analyzed data
  if (hasUploadedData) {
    badges.push("data_ready");
  }

  // new_insight: has filled in pain points and goals
  if (
    contextSummary?.painPoints &&
    contextSummary.painPoints !== "Not yet specified" &&
    contextSummary?.goals &&
    contextSummary.goals !== "Not yet specified"
  ) {
    badges.push("new_insight");
  }

  // researcher: answers all 5 questions deeply
  if (
    currentStep >= 5 &&
    contextSummary?.businessType &&
    contextSummary.businessType !== "Not yet specified" &&
    contextSummary?.priorTechUse &&
    contextSummary.priorTechUse !== "Not yet specified" &&
    contextSummary?.growthIntent &&
    contextSummary.growthIntent !== "Not yet specified"
  ) {
    badges.push("researcher");
  }

  // strategist: completed discovery with rich context
  if (
    currentStep >= 6 &&
    contextSummary &&
    Object.values(contextSummary).filter((v) => v && v !== "Not yet specified")
      .length >= 4
  ) {
    badges.push("strategist");
  }

  // plan_ready: generated plan
  if (hasGeneratedPlan) {
    badges.push("plan_ready");
  }

  // feedback_master: continued chat after plan generation
  if (hasGeneratedPlan && currentStep > 6) {
    badges.push("feedback_master");
  }

  return badges;
};

export interface Milestone {
  phase: "discovery" | "diagnosis" | "roadmap";
  stepRange: [number, number];
  icon: string;
  title: string;
  description: string;
  color: string;
}

export const MILESTONES: Record<string, Milestone> = {
  discovery: {
    phase: "discovery",
    stepRange: [1, 2],
    icon: "Compass",
    title: "Discovery",
    description: "Understanding your business landscape",
    color: "bg-blue-50 dark:bg-blue-950",
  },
  diagnosis: {
    phase: "diagnosis",
    stepRange: [3, 5],
    icon: "Stethoscope",
    title: "Diagnosis",
    description: "Identifying gaps and opportunities",
    color: "bg-purple-50 dark:bg-purple-950",
  },
  roadmap: {
    phase: "roadmap",
    stepRange: [6, 6],
    icon: "Map",
    title: "Roadmap",
    description: "Building your AI action plan",
    color: "bg-green-50 dark:bg-green-950",
  },
};

export const getMilestoneForStep = (step: number): Milestone | null => {
  for (const milestone of Object.values(MILESTONES)) {
    if (step >= milestone.stepRange[0] && step <= milestone.stepRange[1]) {
      return milestone;
    }
  }
  return null;
};
