import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface ChatBubbleProps {
  message: string
  isUser: boolean
  timestamp?: string
}

export function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={cn("max-w-[80%] space-y-1", isUser ? "order-first" : "")}>
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            isUser ? "bg-primary text-primary-foreground ml-auto" : "bg-muted",
          )}
        >
          {message}
        </div>
        {timestamp && (
          <div className={cn("text-xs text-muted-foreground", isUser ? "text-right" : "text-left")}>{timestamp}</div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}
