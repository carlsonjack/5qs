import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
  currentStep: number
  totalSteps: number
}

export function Stepper({ currentStep, totalSteps }: StepperProps) {
  return (
    <div className="flex flex-col space-y-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">Progress</div>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isUpcoming = stepNumber > currentStep

        return (
          <div key={stepNumber} className="flex items-center space-x-3">
            <div
              className={cn("flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors", {
                "bg-primary border-primary text-primary-foreground": isCompleted,
                "border-primary text-primary bg-primary/10": isCurrent,
                "border-muted-foreground/30 text-muted-foreground": isUpcoming,
              })}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{stepNumber}</span>}
            </div>
            <div
              className={cn("text-sm transition-colors", {
                "text-foreground font-medium": isCompleted || isCurrent,
                "text-muted-foreground": isUpcoming,
              })}
            >
              Question {stepNumber}
            </div>
          </div>
        )
      })}
    </div>
  )
}
