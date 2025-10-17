import { Check, Compass, Stethoscope, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMilestoneForStep, MILESTONES } from "@/lib/gamification/badges";

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  showMilestones?: boolean;
}

export function Stepper({
  currentStep,
  totalSteps,
  showMilestones = true,
}: StepperProps) {
  const currentMilestone = getMilestoneForStep(currentStep);

  const iconMap = {
    Compass: Compass,
    Stethoscope: Stethoscope,
    Map: Map,
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">
        Progress
      </div>

      {showMilestones && currentMilestone && (
        <div
          className={cn(
            "p-3 rounded-lg border transition-all duration-300",
            currentMilestone.color,
            "border-primary/20"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const IconComponent =
                iconMap[currentMilestone.icon as keyof typeof iconMap] ||
                Compass;
              return <IconComponent className="w-4 h-4 text-primary" />;
            })()}
            <span className="text-sm font-medium text-primary">
              {currentMilestone.title}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentMilestone.description}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          // For step 6, show "Summary" instead of "Question 6"
          const stepLabel =
            stepNumber === 6 ? "Summary" : `Question ${stepNumber}`;

          return (
            <div key={stepNumber} className="flex items-center space-x-3">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                  {
                    "bg-primary border-primary text-primary-foreground":
                      isCompleted,
                    "border-primary text-primary bg-primary/10": isCurrent,
                    "border-muted-foreground/30 text-muted-foreground":
                      isUpcoming,
                  }
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>
              <div
                className={cn("text-sm transition-colors", {
                  "text-foreground font-medium": isCompleted || isCurrent,
                  "text-muted-foreground": isUpcoming,
                })}
              >
                {stepLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
