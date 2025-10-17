import { describe, it, expect } from "vitest";
import { getUnlockedBadges, BADGES } from "../lib/gamification/badges";
import {
  calculateProgress,
  getLevelProgress,
} from "../lib/gamification/progress";

describe("Gamification System", () => {
  describe("Badge System", () => {
    it("should unlock first_step badge when conversation starts", () => {
      const badges = getUnlockedBadges(1, null, false, false);
      expect(badges).toContain("first_step");
    });

    it("should unlock discovery_complete badge after 2 questions", () => {
      const badges = getUnlockedBadges(3, null, false, false);
      expect(badges).toContain("discovery_complete");
    });

    it("should unlock data_ready badge when data is uploaded", () => {
      const badges = getUnlockedBadges(1, null, true, false);
      expect(badges).toContain("data_ready");
    });

    it("should unlock new_insight badge when pain points and goals are specified", () => {
      const contextSummary = {
        painPoints: "Customer service issues",
        goals: "Improve efficiency",
      };
      const badges = getUnlockedBadges(1, contextSummary, false, false);
      expect(badges).toContain("new_insight");
    });

    it("should unlock plan_ready badge when plan is generated", () => {
      const badges = getUnlockedBadges(6, null, false, true);
      expect(badges).toContain("plan_ready");
    });
  });

  describe("Progress System", () => {
    it("should calculate XP correctly", () => {
      const progress = calculateProgress(5, null, true, false, [], {});
      expect(progress.xp).toBeGreaterThan(0);
    });

    it("should calculate level correctly", () => {
      const progress = calculateProgress(6, null, true, true, [], {});
      expect(progress.level).toBeGreaterThanOrEqual(1);
    });

    it("should track earned badges", () => {
      const progress = calculateProgress(3, null, false, false, [], {});
      expect(progress.earnedBadges).toContain("first_step");
      expect(progress.earnedBadges).toContain("discovery_complete");
    });

    it("should calculate level progress correctly", () => {
      const levelProgress = getLevelProgress(150);
      expect(levelProgress.current).toBe(100);
      expect(levelProgress.next).toBe(200);
      expect(levelProgress.progress).toBe(50);
    });
  });

  describe("Badge Definitions", () => {
    it("should have all required badge properties", () => {
      Object.values(BADGES).forEach((badge) => {
        expect(badge).toHaveProperty("id");
        expect(badge).toHaveProperty("label");
        expect(badge).toHaveProperty("description");
        expect(badge).toHaveProperty("icon");
        expect(badge).toHaveProperty("color");
        expect(badge).toHaveProperty("rarity");
      });
    });

    it("should have valid rarity levels", () => {
      const validRarities = ["common", "rare", "epic", "legendary"];
      Object.values(BADGES).forEach((badge) => {
        expect(validRarities).toContain(badge.rarity);
      });
    });

    it("should have valid colors", () => {
      const validColors = [
        "blue",
        "purple",
        "green",
        "orange",
        "red",
        "yellow",
      ];
      Object.values(BADGES).forEach((badge) => {
        expect(validColors).toContain(badge.color);
      });
    });
  });
});
