"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BadgeType, BADGES } from "@/lib/gamification/badges";
import * as LucideIcons from "lucide-react";

interface BadgeDisplayProps {
  badgeId: BadgeType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function BadgeDisplay({
  badgeId,
  size = "md",
  showLabel = false,
  className,
}: BadgeDisplayProps) {
  const badge = BADGES[badgeId];
  if (!badge) return null;

  const IconComponent = (LucideIcons as any)[badge.icon] || LucideIcons.Award;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  const colorClasses = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    purple:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    green:
      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    orange:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    yellow:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  };

  const rarityClasses = {
    common: "border-2 border-gray-200 dark:border-gray-700",
    rare: "border-2 border-blue-200 dark:border-blue-700",
    epic: "border-2 border-purple-200 dark:border-purple-700",
    legendary:
      "border-2 border-orange-200 dark:border-orange-700 shadow-lg shadow-orange-500/20",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105",
              sizeClasses[size],
              colorClasses[badge.color],
              rarityClasses[badge.rarity],
              className
            )}
          >
            <IconComponent className={iconSizeClasses[size]} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{badge.label}</span>
              <Badge variant="outline" className="text-xs">
                {badge.rarity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface BadgeCollectionProps {
  badges: BadgeType[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}

export function BadgeCollection({
  badges,
  maxDisplay = 5,
  size = "sm",
  showLabels = false,
  className,
}: BadgeCollectionProps) {
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {displayBadges.map((badgeId) => (
        <BadgeDisplay
          key={badgeId}
          badgeId={badgeId}
          size={size}
          showLabel={showLabels}
        />
      ))}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">More badges</p>
                <div className="flex flex-wrap gap-1">
                  {badges.slice(maxDisplay).map((badgeId) => (
                    <Badge key={badgeId} variant="outline" className="text-xs">
                      {BADGES[badgeId].label}
                    </Badge>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
