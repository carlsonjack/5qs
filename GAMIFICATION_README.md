# Gamification System

This document describes the gamification features implemented in the AI 5 Questions SMB tool.

## Overview

The gamification system adds engaging elements to the business discovery process, including:

- **Milestone Storyline**: Progress through Discovery → Diagnosis → Roadmap phases
- **Badge System**: Earn badges for completing actions and milestones
- **XP & Leveling**: Gain experience points and level up

## Components

### Core Files

- `lib/gamification/badges.ts` - Badge definitions and unlock criteria
- `lib/gamification/progress.ts` - Progress tracking and XP calculation
- `components/badge-display.tsx` - Badge UI components
- `components/stepper.tsx` - Enhanced with milestone phases
- `components/business-profile.tsx` - Shows earned badges
- `components/chat-interface.tsx` - Main integration point

### Badge Types

1. **First Step** (Common) - Started AI discovery journey
2. **Discovery Complete** (Common) - Answered first 2 questions
3. **Data Ready** (Rare) - Uploaded or analyzed business data
4. **New Insight** (Rare) - Revealed key business metrics
5. **Researcher** (Epic) - Provided detailed answers to all questions
6. **Strategist** (Epic) - Completed discovery with rich context
7. **Plan Ready** (Epic) - Generated first business plan
8. **Feedback Master** (Legendary) - Refined plan with follow-ups

### Milestone Phases

1. **Discovery** (Steps 1-2) - Understanding business landscape
2. **Diagnosis** (Steps 3-5) - Identifying gaps and opportunities
3. **Roadmap** (Step 6) - Building AI action plan

## Usage

### Badge Unlocking

Badges are automatically unlocked based on user actions:

```typescript
const badges = getUnlockedBadges(
  currentStep,
  contextSummary,
  hasUploadedData,
  hasGeneratedPlan
);
```

### Progress Tracking

Calculate user progress and XP:

```typescript
const progress = calculateProgress(
  currentStep,
  contextSummary,
  hasUploadedData,
  hasGeneratedPlan,
  existingBadges,
  existingEarnedAt
);
```

### Level Progress

Get level progression information:

```typescript
const levelProgress = getLevelProgress(xp);
// Returns: { current: number, next: number, progress: number }
```

## UI Integration

### Sidebar Integration

The left sidebar shows:

- Milestone progress with phase descriptions
- Level and XP display
- Badge count

### Business Profile Integration

The right sidebar shows:

- Earned badges in the profile header

### Toast Notifications

Users receive notifications when earning new badges:

```typescript
toast({
  title: "🎉 Badge Earned!",
  description: `You earned the ${badgeName} badge!`,
});
```

## Data Persistence

Gamification data is persisted in localStorage via the `useChatPersistence` hook:

```typescript
interface ChatState {
  // ... existing fields
  earnedBadges: BadgeType[];
  earnedAt: Record<BadgeType, number>;
  xp: number;
  level: number;
}
```

## Privacy & Opt-in

- **Badge System**: Always active (local only)
- **Data Sharing**: No personal data shared without consent

## Testing

Run the gamification tests:

```bash
npm test -- tests/gamification.spec.ts
```

Tests cover:

- Badge unlocking logic
- XP and level calculations
- Progress tracking
- Badge definition validation

## Future Enhancements

Potential additions:

- Achievement streaks
- Industry-specific badges
- Social sharing of achievements
- Advanced analytics dashboard
- Custom badge creation

## Accessibility

The gamification system includes:

- ARIA labels for screen readers
- Keyboard navigation support
- High contrast color schemes
- Reduced motion support
- Tooltip descriptions for all badges

## Performance

- Badge calculations are memoized
- Progress updates are batched
- Local storage operations are debounced
