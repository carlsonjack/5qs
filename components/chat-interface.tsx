"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, RotateCcw, Loader2, CheckCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { Stepper } from "./stepper";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import { BusinessProfile } from "./business-profile";
import { ContextGathering } from "./context-gathering";
import { BusinessPlanViewer } from "./business-plan-viewer";
import Image from "next/image";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ContextSummary {
  businessType: string;
  painPoints: string;
  goals: string;
  dataAvailable: string;
  priorTechUse: string;
  growthIntent: string;
  [key: string]: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(
    null
  );
  const [showContextGathering, setShowContextGathering] = useState(false);
  const [isContextGatheringComplete, setIsContextGatheringComplete] =
    useState(false);
  const [businessPlanMarkdown, setBusinessPlanMarkdown] = useState<
    string | null
  >(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (content: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleStartClick = () => {
    setShowContextGathering(true);
  };

  const handleContextGatheringComplete = (contextData: any) => {
    const initialContext: Partial<ContextSummary> = {
      businessType:
        contextData.businessType ||
        contextData.productsServices ||
        "Not yet specified",
      painPoints:
        contextData.cashFlowRisks ||
        contextData.marketingWeaknesses ||
        "Not yet specified",
      goals:
        contextData.marketingStrengths ||
        contextData.goals ||
        "Not yet specified",
      dataAvailable:
        contextData.revenueTrend ||
        contextData.dataAvailable ||
        "Not yet specified",
      priorTechUse:
        contextData.techStack ||
        contextData.priorTechUse ||
        "Not yet specified",
      growthIntent: contextData.customerSegment
        ? `Targeting: ${contextData.customerSegment}`
        : contextData.growthIntent || "Not yet specified",
    };

    // Add any additional fields from the analysis
    Object.keys(contextData).forEach((key) => {
      if (!Object.keys(initialContext).includes(key)) {
        initialContext[key] = contextData[key];
      }
    });

    setContextSummary(initialContext as ContextSummary);
    setIsContextGatheringComplete(true);
    startConversation(initialContext as ContextSummary);
  };

  const handleContextGatheringSkip = () => {
    setIsContextGatheringComplete(true);
    startConversation(null);
  };

  const startConversation = async (initialContext: ContextSummary | null) => {
    setIsStarted(true);
    setIsLoading(true);

    try {
      let initialMessage =
        "Hello, I'm ready to start the 5-question discovery process for my small business.";

      if (initialContext) {
        initialMessage += " Here's some information about my business: ";

        if (
          initialContext.businessType &&
          initialContext.businessType !== "Not yet specified"
        ) {
          initialMessage += `My business is in ${initialContext.businessType}. `;
        }

        if (initialContext.revenueTrend) {
          initialMessage += `Our revenue trend shows ${initialContext.revenueTrend}. `;
        }

        if (
          initialContext.painPoints &&
          initialContext.painPoints !== "Not yet specified"
        ) {
          initialMessage += `Some challenges we face include ${initialContext.painPoints}. `;
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: initialMessage,
            },
          ],
          currentStep: 1,
          initialContext: initialContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message) {
        addMessage(data.message, false);
        if (data.contextSummary) {
          setContextSummary((prev) => ({
            ...prev,
            ...data.contextSummary,
          }));
        }
        if (data.fallback) {
          toast({
            title: "Using Fallback Mode",
            description:
              "AI service temporarily unavailable, using backup responses.",
            variant: "default",
          });
        }
      } else {
        throw new Error("No message received from API");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Connection Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
      addMessage(
        "Hello! I'm excited to help you discover key insights about your business. To get started, could you tell me a bit about what your business does and what industry you're in?",
        false
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    addMessage(content, true);
    setIsLoading(true);

    // ✅ Check if this is the 5th user message (end of step 5)
    const userMessages = messages.filter((msg) => msg.isUser);
    const isFinalStep = currentStep === 5 && userMessages.length === 4; // This will be the 5th user message

    if (isFinalStep) {
      console.log("✅ Triggering business plan generation from frontend");
      setIsGeneratingPlan(true);
    }

    try {
      const chatMessages = messages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content,
      }));

      chatMessages.push({ role: "user", content });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          currentStep: currentStep,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.message) {
        addMessage(data.message, false);

        if (data.contextSummary) {
          setContextSummary(data.contextSummary);
        }

        // ✅ Handle business plan if it's returned
        if (data.businessPlanMarkdown) {
          console.log("✅ Business plan received from backend");
          setBusinessPlanMarkdown(data.businessPlanMarkdown);
          toast({
            title: "Business Plan Generated! 🎉",
            description:
              "Your personalized business plan is ready to view, copy, and download.",
          });
        } else if (currentStep < 5) {
          // ✅ Only increment step if we're not at step 5 yet
          setCurrentStep((prev) => prev + 1);
        }

        if (data.fallback) {
          toast({
            title: "Using Fallback Mode",
            description:
              "AI service temporarily unavailable, using backup responses.",
            variant: "default",
          });
        }
      } else {
        throw new Error("No message received from API");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      addMessage(
        "I apologize for the technical difficulty. Let me continue with our conversation. Could you elaborate on what you just shared?",
        false
      );

      // ✅ If business plan generation failed, provide a fallback
      if (isFinalStep) {
        console.log("❌ Business plan generation failed, using fallback");
        setBusinessPlanMarkdown(`# 🚀 Your Business Plan

*Note: We encountered a technical issue generating your custom plan. Please try restarting the conversation for a fully personalized plan.*

## 1. 📊 Opportunity Summary
Based on our conversation, your business has significant opportunities for growth through strategic AI implementation.

## 2. 🤖 AI Roadmap
- **Phase 1**: Start with basic automation and data collection
- **Phase 2**: Implement customer-facing AI solutions  
- **Phase 3**: Advanced analytics and custom AI tools

## 3. 💰 Estimated ROI & Cost
- **Initial Investment**: $5,000 - $15,000
- **Expected ROI**: 15-25% efficiency improvement within 12 months
- **Break-even**: 6-9 months

## 4. 📋 Next 90-Day Action Items
1. Audit current processes for automation opportunities
2. Research industry-specific AI tools
3. Implement basic chatbot or automation
4. Set up analytics and measurement systems

---

## 🔄 Get Your Custom Plan
**Click "Start Over" below** to generate a fully personalized business plan with more detailed information about your business.`);

        toast({
          title: "Backup Plan Generated",
          description:
            "We've provided a template business plan. Restart for a custom plan.",
          variant: "default",
        });
      }
    } finally {
      setIsLoading(false);
      setIsGeneratingPlan(false);
    }
  };

  const resetChat = () => {
    console.log("🔄 Resetting chat interface");
    setMessages([]);
    setCurrentStep(1);
    setIsStarted(false);
    setContextSummary(null);
    setShowContextGathering(false);
    setIsContextGatheringComplete(false);
    setBusinessPlanMarkdown(null);
    setIsGeneratingPlan(false);
  };

  // ✅ Determine if we should show the chat input
  const showChatInput = isStarted && !businessPlanMarkdown && !isGeneratingPlan;

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Stepper */}
      <div className="hidden lg:flex w-64 border-r bg-card p-6 flex-col">
        <div className="mb-8 flex items-center space-x-3">
          <Image
            src="/logo.png"
            alt="5Q Logo"
            width={48}
            height={48}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-primary">5Q for SMBs</h1>
            <p className="text-sm text-muted-foreground">
              AI Strategy in 5 Questions or Less
            </p>
          </div>
        </div>

        <Stepper currentStep={isStarted ? currentStep : 0} totalSteps={5} />

        <div className="mt-auto space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetChat}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {businessPlanMarkdown ? "Start Over" : "Reset Chat"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 mr-2" />
            ) : (
              <Moon className="w-4 h-4 mr-2" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="5Q Logo"
              width={32}
              height={32}
              className="rounded lg:hidden"
            />
            <div>
              <h2 className="font-semibold">
                {businessPlanMarkdown
                  ? "Your Business Plan"
                  : "Business Discovery Chat"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {businessPlanMarkdown
                  ? "We turned 5 questions into a full-blown AI plan. You're welcome."
                  : isStarted
                  ? `Step ${currentStep} of 5 • Powered by NVIDIA NIM`
                  : "We turn 5 questions into a full-blown AI plan. You're welcome."}
              </p>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex lg:hidden gap-2">
            <Button variant="outline" size="sm" onClick={resetChat}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Chat Messages or Business Plan */}
        <div className="flex-1 overflow-y-auto">
          {!showContextGathering && !isStarted ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-4">
              <div className="max-w-md">
                <div className="flex justify-center mb-6">
                  <Image
                    src="/logo.png"
                    alt="5Q Logo"
                    width={80}
                    height={80}
                    className="rounded-xl"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-primary">
                  Welcome to 5Q for SMBs
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Your AI co-pilot just clocked in.
                  <br />
                  <br />
                  We'll ask you 5 smart questions — you talk, we think.
                  <br />
                  At the end? You'll get a legit business plan that would've
                  cost you $10K from a consultant.
                  <br />
                  <br />
                  Type it out or talk it out. Either way, you'll walk out
                  smarter.
                </p>
                <Button
                  onClick={handleStartClick}
                  disabled={isLoading}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    "Begin Discovery Process"
                  )}
                </Button>
              </div>
            </div>
          ) : showContextGathering && !isContextGatheringComplete ? (
            <ContextGathering
              onComplete={handleContextGatheringComplete}
              onSkip={handleContextGatheringSkip}
              onDataUpdate={(data) => {
                // Update context summary immediately for sidebar
                const initialContext: Partial<ContextSummary> = {
                  businessType:
                    data.businessType ||
                    data.productsServices ||
                    "Not yet specified",
                  painPoints:
                    data.cashFlowRisks ||
                    data.marketingWeaknesses ||
                    "Not yet specified",
                  goals: 
                    data.marketingStrengths ||
                    data.goals ||
                    "Not yet specified",
                  dataAvailable: 
                    data.revenueTrend || 
                    data.dataAvailable ||
                    "Not yet specified",
                  priorTechUse: 
                    data.techStack || 
                    data.priorTechUse ||
                    "Not yet specified",
                  growthIntent: 
                    data.customerSegment ? `Targeting: ${data.customerSegment}` :
                    data.growthIntent ||
                    "Not yet specified",
                };
                setContextSummary(initialContext as ContextSummary);
              }}
            />
          ) : businessPlanMarkdown ? (
            // ✅ Show business plan viewer
            <BusinessPlanViewer
              markdown={businessPlanMarkdown}
              onRestart={resetChat}
              contextSummary={contextSummary}
            />
          ) : (
            <div className="p-4">
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message.content}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                />
              ))}
              {/* ✅ Show generating plan state */}
              {isGeneratingPlan && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      Generating your personalized business plan...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Analyzing your responses and creating actionable
                      recommendations
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ✅ Chat Input - only show when appropriate */}
        {showChatInput && (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={
              currentStep < 5
                ? "Share your thoughts..."
                : "Answer this final question to generate your business plan..."
            }
          />
        )}
      </div>

      {/* Right Sidebar - Business Profile */}
      <div className="hidden xl:flex w-80 border-l bg-card p-6 flex-col">
        <BusinessProfile contextSummary={contextSummary} />
        
        {/* Success Message - Only show when we have analysis data */}
        {contextSummary && (
          <div className="mt-6 border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Data Successfully Analyzed
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your business insights will be used to personalize the AI conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
