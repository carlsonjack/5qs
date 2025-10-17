import {
  BadgeType,
  getUnlockedBadges,
  MILESTONES,
  getMilestoneForStep,
} from "./badges";

export interface ProgressState {
  currentStep: number;
  contextSummary: any;
  hasUploadedData: boolean;
  hasGeneratedPlan: boolean;
  earnedBadges: BadgeType[];
  earnedAt: Record<BadgeType, number>;
  currentMilestone: string | null;
  xp: number;
  level: number;
}

export const calculateProgress = (
  currentStep: number,
  contextSummary: any,
  hasUploadedData: boolean,
  hasGeneratedPlan: boolean,
  existingBadges: BadgeType[] = [],
  existingEarnedAt: Record<BadgeType, number> = {}
): ProgressState => {
  const newBadges = getUnlockedBadges(
    currentStep,
    contextSummary,
    hasUploadedData,
    hasGeneratedPlan
  );

  // Find newly earned badges
  const newlyEarned = newBadges.filter(
    (badge) => !existingBadges.includes(badge)
  );

  // Update earned badges and timestamps
  const earnedBadges = [...new Set([...existingBadges, ...newBadges])];
  const earnedAt = { ...existingEarnedAt };

  // Add timestamps for newly earned badges
  newlyEarned.forEach((badge) => {
    if (!earnedAt[badge]) {
      earnedAt[badge] = Date.now();
    }
  });

  // Calculate XP based on badges and progress
  const xp = calculateXP(earnedBadges, currentStep, hasGeneratedPlan);
  const level = calculateLevel(xp);

  // Get current milestone
  const milestone = getMilestoneForStep(currentStep);
  const currentMilestone = milestone ? milestone.phase : null;

  return {
    currentStep,
    contextSummary,
    hasUploadedData,
    hasGeneratedPlan,
    earnedBadges,
    earnedAt,
    currentMilestone,
    xp,
    level,
  };
};

const calculateXP = (
  badges: BadgeType[],
  currentStep: number,
  hasGeneratedPlan: boolean
): number => {
  let xp = 0;

  // Base XP for steps completed
  xp += currentStep * 10;

  // XP for badges
  badges.forEach((badge) => {
    switch (badge) {
      case "first_step":
        xp += 5;
        break;
      case "discovery_complete":
        xp += 10;
        break;
      case "data_ready":
        xp += 15;
        break;
      case "new_insight":
        xp += 20;
        break;
      case "researcher":
        xp += 25;
        break;
      case "strategist":
        xp += 30;
        break;
      case "plan_ready":
        xp += 50;
        break;
      case "feedback_master":
        xp += 75;
        break;
    }
  });

  // Bonus XP for completing the journey
  if (hasGeneratedPlan) {
    xp += 100;
  }

  return xp;
};

const calculateLevel = (xp: number): number => {
  // Level progression: 100 XP per level
  return Math.floor(xp / 100) + 1;
};

export const getLevelProgress = (
  xp: number
): { current: number; next: number; progress: number } => {
  const level = calculateLevel(xp);
  const currentLevelXP = (level - 1) * 100;
  const nextLevelXP = level * 100;
  const progress =
    ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return {
    current: currentLevelXP,
    next: nextLevelXP,
    progress: Math.min(100, Math.max(0, progress)),
  };
};

export const getMilestoneProgress = (
  currentStep: number
): {
  phase: string;
  progress: number;
  description: string;
} => {
  const milestone = getMilestoneForStep(currentStep);

  if (!milestone) {
    return {
      phase: "unknown",
      progress: 0,
      description: "Starting your journey",
    };
  }

  const [start, end] = milestone.stepRange;
  const progress = ((currentStep - start + 1) / (end - start + 1)) * 100;

  return {
    phase: milestone.phase,
    progress: Math.min(100, Math.max(0, progress)),
    description: milestone.description,
  };
};
