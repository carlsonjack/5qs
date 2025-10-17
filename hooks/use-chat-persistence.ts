"use client";

import { useState, useEffect, useCallback } from "react";
import { BadgeType } from "@/lib/gamification/badges";

interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp?: string;
}

interface ChatState {
  messages: ChatMessage[];
  currentStep: number;
  isStarted: boolean;
  contextSummary: any;
  websiteAnalysis: any;
  financialAnalysis: any;
  businessPlanMarkdown: string | null;
  isGeneratingPlan: boolean;
  readyToGeneratePlan: boolean;
  canGeneratePlan: boolean;
  isContextGatheringComplete: boolean;
  // Gamification data
  earnedBadges: BadgeType[];
  earnedAt: Record<BadgeType, number>;
  xp: number;
  level: number;
}

const STORAGE_KEY = "ai-5q-chat-state";

export function useChatPersistence() {
  const [isHydrated, setIsHydrated] = useState(false);

  // Save state to localStorage
  const saveState = useCallback((state: Partial<ChatState>) => {
    if (typeof window === "undefined") return;

    try {
      const currentState = getState();
      const newState = { ...currentState, ...state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save chat state:", error);
    }
  }, []);

  // Load state from localStorage
  const getState = useCallback((): ChatState => {
    if (typeof window === "undefined") {
      return getDefaultState();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return getDefaultState();

      const parsed = JSON.parse(stored);
      return { ...getDefaultState(), ...parsed };
    } catch (error) {
      console.error("Failed to load chat state:", error);
      return getDefaultState();
    }
  }, []);

  // Clear state from localStorage
  const clearState = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear chat state:", error);
    }
  }, []);

  // Get default state
  const getDefaultState = (): ChatState => ({
    messages: [],
    currentStep: 1,
    isStarted: false,
    contextSummary: null,
    websiteAnalysis: null,
    financialAnalysis: null,
    businessPlanMarkdown: null,
    isGeneratingPlan: false,
    readyToGeneratePlan: false,
    canGeneratePlan: false,
    isContextGatheringComplete: false,
    // Gamification defaults
    earnedBadges: [],
    earnedAt: {},
    xp: 0,
    level: 1,
  });

  // Initialize on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return {
    isHydrated,
    saveState,
    getState,
    clearState,
    getDefaultState,
  };
}
