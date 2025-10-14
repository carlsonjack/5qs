import { cn } from "@/lib/utils";
import { Copy, ThumbsUp, ThumbsDown, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

export function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
  const [isReading, setIsReading] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleReadAloud = async () => {
    if (isReading) {
      // Stop current speech
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    try {
      // Check if browser supports speech synthesis
      if (!("speechSynthesis" in window)) {
        throw new Error("Text-to-speech not supported in this browser");
      }

      setIsReading(true);

      // Clean the message text (remove markdown formatting)
      const cleanText = message
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
        .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
        .replace(/`(.*?)`/g, "$1") // Remove code markdown
        .replace(/#{1,6}\s*/g, "") // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // Remove images, keep alt text
        .trim();

      // Create speech synthesis utterance
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Configure voice settings for natural speech
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 0.8; // Slightly quieter

      // Try to find a high-quality voice
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          // Prefer English voices, then high-quality voices
          const preferredVoice =
            voices.find(
              (voice) =>
                voice.lang.startsWith("en") &&
                (voice.name.includes("Google") ||
                  voice.name.includes("Microsoft") ||
                  voice.name.includes("Premium"))
            ) ||
            voices.find((voice) => voice.lang.startsWith("en")) ||
            voices[0];

          utterance.voice = preferredVoice;
          console.log(`Using voice: ${preferredVoice?.name || "default"}`);
        }
      };

      // Set voice immediately if available, otherwise wait for voices to load
      setVoice();
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", setVoice, {
          once: true,
        });
      }

      // Set up event handlers
      utterance.onend = () => {
        setIsReading(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsReading(false);
        toast({
          title: "Speech Failed",
          description: "Failed to read text aloud. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      };

      utterance.onstart = () => {
        // Successfully started speaking
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Text-to-speech error:", error);
      setIsReading(false);
      toast({
        title: "Text-to-Speech Not Available",
        description:
          error instanceof Error
            ? error.message
            : "Text-to-speech is not supported in this browser.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(type);
    toast({
      title: "Feedback recorded",
      description: `Thank you for your ${
        type === "up" ? "positive" : "negative"
      } feedback`,
      duration: 2000,
    });
  };

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] space-y-1 group",
          isUser ? "order-first" : ""
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm prose prose-sm max-w-none",
            isUser
              ? "bg-primary text-primary-foreground ml-auto prose-invert"
              : "bg-muted"
          )}
        >
          {isUser ? (
            message
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-sm">{children}</li>,
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-1">{children}</h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto my-2">
                    {children}
                  </pre>
                ),
              }}
            >
              {message}
            </ReactMarkdown>
          )}
        </div>

        {/* Action buttons for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 hover:bg-muted-foreground/10"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReadAloud}
              className="h-7 w-7 p-0 hover:bg-muted-foreground/10"
            >
              {isReading ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("up")}
              className={cn(
                "h-7 w-7 p-0 hover:bg-green-100",
                feedback === "up" && "bg-green-100 text-green-600"
              )}
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback("down")}
              className={cn(
                "h-7 w-7 p-0 hover:bg-red-100",
                feedback === "down" && "bg-red-100 text-red-600"
              )}
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
