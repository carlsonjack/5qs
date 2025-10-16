"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Sun,
  RotateCcw,
  Loader2,
  CheckCircle,
  Sparkles,
  MessageCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useChatPersistence } from "@/hooks/use-chat-persistence";
import { Stepper } from "./stepper";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import { BusinessProfile } from "./business-profile";
import { ContextGathering } from "./context-gathering";
import { BusinessPlanViewer } from "./business-plan-viewer";
import { getProfile } from "@/lib/profiles";
import Image from "next/image";

// Motivational messages that rotate randomly for each session
const MOTIVATIONAL_MESSAGES = {
  "ai-smb": [
    "You've got this.",
    "Smarter than the consultants.",
    "Complexity? Crushed.",
    "Strategy made simple.",
    "The answers are in you already.",
    "No MBA required.",
    "Business genius, unlocked.",
    "Strategy in plain English.",
    "Smarts > Jargon.",
    "Your gut is right.",
    "This won't hurt a bit.",
    "Less noise, more clarity.",
    "You think clearer than you know.",
    "Faster than a boardroom.",
    "You're sharper than you give yourself credit for.",
    "Big brains, no buzzwords.",
    "Simplicity wins.",
    "You already know more than you think.",
    "Insight is your superpower.",
    "Straight talk, smart answers.",
    "This is easier than it looks.",
    "You don't need the fluff.",
    "Five minutes to clarity.",
    "Brainstorm > Brain drain.",
  ],
  "fitness-coach": [
    "You've got this.",
    "Stronger than you think.",
    "Progress over perfection.",
    "Every rep counts.",
    "Your body is capable.",
    "Consistency is key.",
    "You're worth the effort.",
    "Small steps, big changes.",
    "Trust the process.",
    "You're stronger than yesterday.",
    "This is your journey.",
    "Every workout matters.",
    "You're building something amazing.",
    "Fitness is a lifestyle.",
    "You've got the power.",
    "One day at a time.",
    "Your health is your wealth.",
    "You're doing great.",
    "Keep pushing forward.",
    "You're worth the investment.",
    "Every choice counts.",
    "You're building strength.",
    "This is your time.",
    "You're becoming unstoppable.",
  ],
};

// Industry fun facts for different business types
const INDUSTRY_FUN_FACTS: Record<string, string[]> = {
  // E-commerce & Retail
  "e-commerce": [
    "The first online purchase was a Sting CD for $12.48 in 1994.",
    "Amazon started as a bookstore in Jeff Bezos' garage.",
    "Shopping carts were invented in 1937 and initially rejected by customers.",
  ],
  retail: [
    "The barcode was first used on a pack of Wrigley's gum in 1974.",
    "Black Friday got its name from when retailers finally turned a profit.",
    "The shopping mall was invented by an Austrian architect in 1956.",
  ],
  online: [
    "The first banner ad had a 44% click-through rate in 1994.",
    "Email is older than the World Wide Web by 20 years.",
    "The @ symbol was used in emails before it became an internet icon.",
  ],

  // Automotive
  car: [
    "The first car accident happened in 1891 at 4 mph.",
    "Henry Ford never invented the assembly line—he perfected it.",
    "The average car has over 30,000 parts.",
  ],
  automotive: [
    "The car radio was invented 45 years after the car itself.",
    "The new car smell is actually a combination of 50+ chemicals.",
    "Ferrari makes more money from merchandise than selling cars.",
  ],
  auction: [
    "The first recorded auction was for wives in ancient Babylon.",
    "Sotheby's has been operating since 1744—longer than America has existed.",
    "Christie's once sold a $450 million painting in 19 minutes.",
  ],

  // Food & Beverage
  restaurant: [
    "The first restaurant opened in Paris in 1765.",
    "McDonald's golden arches are more recognizable than the Christian cross.",
    "The word 'restaurant' means 'to restore' in French.",
  ],
  food: [
    "Honey never spoils—archaeologists found edible honey in Egyptian tombs.",
    "The fork was considered scandalous when first introduced in Europe.",
    "Coca-Cola was originally green and sold as medicine.",
  ],
  coffee: [
    "Coffee was discovered by goats in Ethiopia around 850 AD.",
    "Espresso means 'pressed out' in Italian, not 'fast.'",
    "Finland consumes more coffee per capita than any other country.",
  ],

  // Technology
  software: [
    "The first computer bug was an actual bug found in a Harvard computer in 1947.",
    "The term 'debugging' comes from removing moths from machines.",
    "Microsoft's original name was 'Micro-Soft' with a hyphen.",
  ],
  app: [
    "The App Store launched with just 500 apps in 2008.",
    "Angry Birds was rejected 51 times before finding a publisher.",
    "The most expensive app ever sold for $999.99 and did nothing.",
  ],
  tech: [
    "The first computer was the size of a room and weighed 27 tons.",
    "Nokia once made toilet paper before becoming a tech giant.",
    "The internet weighs about 2 ounces (the weight of all electrons).",
  ],

  // Professional Services
  consulting: [
    "Management consulting started in 1886 with Arthur D. Little.",
    "McKinsey & Company was founded by an accountant from Chicago.",
    "The Big Three consulting firms employ more MBAs than Fortune 500 companies.",
  ],
  marketing: [
    "The first TV commercial aired in 1941 and cost $9.",
    "Print advertising is over 500 years old—older than newspapers.",
    "The average person sees 5,000 ads per day.",
  ],
  agency: [
    "The first advertising agency opened in Philadelphia in 1850.",
    "Mad Men was based on real 1960s Madison Avenue agencies.",
    "Subliminal advertising was banned after causing mass hysteria.",
  ],

  // Healthcare
  medical: [
    "The stethoscope was invented because a doctor was too shy to put his ear on a woman's chest.",
    "Aspirin was originally derived from willow tree bark.",
    "The first successful heart transplant patient lived 18 days.",
  ],
  dental: [
    "Toothbrushes with bristles were invented in China in 1498.",
    "Ancient Egyptians used crushed eggshells as toothpaste.",
    "Dentistry is one of the oldest medical professions—dating to 7000 BC.",
  ],

  // Finance
  financial: [
    "The first stock exchange opened in Amsterdam in 1602.",
    "Paper money was invented in China over 1,000 years ago.",
    "The New York Stock Exchange started under a buttonwood tree.",
  ],
  insurance: [
    "Lloyd's of London started in a coffee house in 1688.",
    "The first life insurance policy was bought on a ship's captain.",
    "Benjamin Franklin founded the first fire insurance company in America.",
  ],

  // Education
  education: [
    "The University of Bologna (1088) is the world's oldest university.",
    "Harvard was founded before calculus was invented.",
    "The pencil eraser wasn't invented until 1858.",
  ],
  training: [
    "Corporate training started during WWII to replace enlisted workers.",
    "The 70-20-10 learning model was created by researchers at Princeton.",
    "Virtual reality training reduces learning time by 40%.",
  ],

  // Default/General
  default: [
    "The oldest company still operating started in 578 AD in Japan.",
    "The word 'entrepreneur' comes from French meaning 'to undertake.'",
    "Small businesses employ 47% of all American workers.",
    "The average entrepreneur fails 3.8 times before succeeding.",
    "Business cards originated in 17th century Europe as calling cards.",
  ],
};

// Function to get a fun fact based on business context
function getIndustryFunFact(contextSummary: ContextSummary | null): string {
  if (
    !contextSummary?.businessType ||
    contextSummary.businessType === "Not yet specified"
  ) {
    const defaultFacts = INDUSTRY_FUN_FACTS.default;
    return defaultFacts[Math.floor(Math.random() * defaultFacts.length)];
  }

  const businessType = contextSummary.businessType.toLowerCase();

  // Find matching industry category
  for (const [industry, facts] of Object.entries(INDUSTRY_FUN_FACTS)) {
    if (industry !== "default" && businessType.includes(industry)) {
      return facts[Math.floor(Math.random() * facts.length)];
    }
  }

  // Fallback to default facts
  const defaultFacts = INDUSTRY_FUN_FACTS.default;
  return defaultFacts[Math.floor(Math.random() * defaultFacts.length)];
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
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
  const searchParams = useSearchParams();
  const variant = searchParams.get("v");
  const profile = getProfile(variant);

  const { isHydrated, saveState, getState, clearState } = useChatPersistence();

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
  const [readyToGeneratePlan, setReadyToGeneratePlan] = useState(false);
  const [canGeneratePlan, setCanGeneratePlan] = useState(false);
  const [websiteAnalysis, setWebsiteAnalysis] = useState<any>(null);
  const [financialAnalysis, setFinancialAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Reduce translucency preference
  const [reduceTranslucency, setReduceTranslucency] = useState(false);

  // Apply reduce translucency to HTML element
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-reduce-translucency",
      reduceTranslucency.toString()
    );
  }, [reduceTranslucency]);

  // Select a random motivational message for each session
  const [motivationalMessage, setMotivationalMessage] = useState(() => {
    const messages =
      MOTIVATIONAL_MESSAGES[variant as keyof typeof MOTIVATIONAL_MESSAGES] ||
      MOTIVATIONAL_MESSAGES["ai-smb"];
    return messages[Math.floor(Math.random() * messages.length)];
  });

  // Reset chat when variant changes
  useEffect(() => {
    if (isHydrated) {
      resetChat();
    }
  }, [variant]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load state from localStorage on mount
  useEffect(() => {
    if (isHydrated) {
      const savedState = getState();
      if (savedState.messages.length > 0) {
        setMessages(
          savedState.messages.map((msg, index) => ({
            id: `msg-${index}`,
            content: msg.content,
            isUser: msg.isUser,
            timestamp: msg.timestamp,
          }))
        );
        setCurrentStep(savedState.currentStep);
        setIsStarted(savedState.isStarted);
        setContextSummary(savedState.contextSummary);
        setIsContextGatheringComplete(savedState.isContextGatheringComplete);
        setBusinessPlanMarkdown(savedState.businessPlanMarkdown);
        setReadyToGeneratePlan(savedState.readyToGeneratePlan);
        setCanGeneratePlan(savedState.canGeneratePlan ?? false);
        setWebsiteAnalysis(savedState.websiteAnalysis);
        setFinancialAnalysis(savedState.financialAnalysis);
      }
    }
  }, [isHydrated, getState]);

  // Save state whenever it changes
  useEffect(() => {
    if (isHydrated) {
      saveState({
        messages: messages.map((msg) => ({
          content: msg.content,
          isUser: msg.isUser,
          timestamp: msg.timestamp,
        })),
        currentStep,
        isStarted,
        contextSummary,
        isContextGatheringComplete,
        businessPlanMarkdown,
        isGeneratingPlan,
        readyToGeneratePlan,
        canGeneratePlan,
        websiteAnalysis,
        financialAnalysis,
      });
    }
  }, [
    messages,
    currentStep,
    isStarted,
    contextSummary,
    isContextGatheringComplete,
    businessPlanMarkdown,
    isGeneratingPlan,
    readyToGeneratePlan,
    canGeneratePlan,
    websiteAnalysis,
    financialAnalysis,
    isHydrated,
    saveState,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isStarted || businessPlanMarkdown || canGeneratePlan) {
      return;
    }

    const userCount = messages.filter((msg) => msg.isUser).length;
    const assistantCount = messages.filter((msg) => !msg.isUser).length;

    if (userCount >= 5 && assistantCount >= 6) {
      setCurrentStep(6);
      setReadyToGeneratePlan(true);
      setCanGeneratePlan(true);
    }
  }, [messages, isStarted, businessPlanMarkdown, canGeneratePlan]);

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
      priorTechUse:
        contextData.techStack ||
        contextData.priorTechUse ||
        "Not yet specified",
      growthIntent: contextData.customerSegment
        ? `Targeting: ${contextData.customerSegment}`
        : contextData.growthIntent || "Not yet specified",
      // Do not infer pain points or goals from heuristic analyses; let the user state them
      painPoints: contextData.painPoints || "Not yet specified",
      goals: contextData.goals || "Not yet specified",
      dataAvailable:
        contextData.revenueTrend ||
        contextData.dataAvailable ||
        "Not yet specified",
    };

    // Add any additional fields from the analysis
    Object.keys(contextData).forEach((key) => {
      if (!Object.keys(initialContext).includes(key)) {
        initialContext[key] = contextData[key];
      }
    });

    setContextSummary(initialContext as ContextSummary);
    // Capture raw analyses if present for downstream plan generation
    if (contextData?.websiteAnalysis)
      setWebsiteAnalysis(contextData.websiteAnalysis);
    if (contextData?.financialAnalysis)
      setFinancialAnalysis(contextData.financialAnalysis);
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
    setCanGeneratePlan(false);

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
          variant: variant,
          initialContext: initialContext,
          websiteAnalysis,
          financialAnalysis,
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

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setReadyToGeneratePlan(false);

    try {
      const chatMessages = messages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content,
      }));

      // Add a confirmation message to trigger business plan generation
      chatMessages.push({
        role: "user",
        content:
          "Yes, please generate my customized AI implementation plan now.",
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          currentStep: 7, // Step past summary to trigger plan generation
          variant: variant,
          initialContext: contextSummary,
          websiteAnalysis,
          financialAnalysis,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.businessPlanMarkdown) {
        setBusinessPlanMarkdown(data.businessPlanMarkdown);
        setCanGeneratePlan(false);
        toast({
          title:
            variant === "fitness-coach"
              ? "Fitness Plan Generated! 🎉"
              : "Business Plan Generated! 🎉",
          description:
            variant === "fitness-coach"
              ? "Your personalized fitness plan is ready to view, copy, and download."
              : "Your personalized business plan is ready to view, copy, and download.",
        });
      } else {
        // Fallback: If no plan returned, try to extract from message
        if (data.message && data.message.includes("AI Action Plan")) {
          setBusinessPlanMarkdown(data.message);
          setCanGeneratePlan(false);
          toast({
            title:
              variant === "fitness-coach"
                ? "Fitness Plan Generated! 🎉"
                : "Business Plan Generated! 🎉",
            description:
              variant === "fitness-coach"
                ? "Your personalized fitness plan is ready to view, copy, and download."
                : "Your personalized business plan is ready to view, copy, and download.",
          });
        } else {
          throw new Error("No business plan received from API");
        }
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: "Plan Generation Failed",
        description: "Failed to generate business plan. Please try again.",
        variant: "destructive",
      });
      setReadyToGeneratePlan(true);
      setCanGeneratePlan(true);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    // Process files if provided
    let messageContent = content;
    let fileContents: Array<{ name: string; content: string }> = [];

    if (files && files.length > 0) {
      const fileNames = files.map((f) => f.name).join(", ");
      messageContent = content
        ? `${content}\n\n📎 Attached files: ${fileNames}`
        : `📎 Attached files: ${fileNames}`;

      toast({
        title: "Processing files...",
        description: `Extracting content from ${files.length} file(s).`,
      });

      // Extract text from each file
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/analyze/financials", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            // Extract the raw text content from the analysis
            const extractedText = data.rawText || data.analysis || "";
            if (extractedText) {
              fileContents.push({
                name: file.name,
                content: extractedText.substring(0, 5000), // Limit to 5000 chars per file
              });
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          toast({
            title: "File processing error",
            description: `Could not process ${file.name}`,
            variant: "destructive",
          });
        }
      }

      if (fileContents.length > 0) {
        toast({
          title: "Files processed",
          description: `Successfully extracted content from ${fileContents.length} file(s).`,
        });
      }
    }

    addMessage(messageContent, true);
    setIsLoading(true);

    // ✅ Check if this is the 5th user message (end of step 5)
    const userMessages = messages.filter((msg) => msg.isUser);
    const isFinalQuestion = currentStep === 5 && userMessages.length === 4; // This will be the 5th user message

    if (isFinalQuestion) {
      console.log(
        "✅ This is the 5th user message - will move to summary step"
      );
      // Don't trigger plan generation here, let the response handler do it
    }

    try {
      const chatMessages = messages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content,
      }));

      chatMessages.push({ role: "user", content: messageContent });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          currentStep: currentStep,
          variant: variant,
          initialContext: contextSummary,
          websiteAnalysis,
          financialAnalysis,
          attachedFiles: fileContents.length > 0 ? fileContents : undefined,
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
          setReadyToGeneratePlan(false);
          setCanGeneratePlan(false);
          toast({
            title:
              variant === "fitness-coach"
                ? "Fitness Plan Generated! 🎉"
                : "Business Plan Generated! 🎉",
            description:
              variant === "fitness-coach"
                ? "Your personalized fitness plan is ready to view, copy, and download."
                : "Your personalized business plan is ready to view, copy, and download.",
          });
        } else if (currentStep < 6) {
          // ✅ Only increment step if we're not at step 6 yet
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
      if (isFinalQuestion) {
        console.log("❌ Business plan generation failed, using fallback");
        setBusinessPlanMarkdown(`# ${
          variant === "fitness-coach"
            ? "💪 Your Fitness Plan"
            : "🚀 Your Business Plan"
        }

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
    setReadyToGeneratePlan(false);
    setCanGeneratePlan(false);
    // Select a new random motivational message for the fresh session
    const messages =
      MOTIVATIONAL_MESSAGES[variant as keyof typeof MOTIVATIONAL_MESSAGES] ||
      MOTIVATIONAL_MESSAGES["ai-smb"];
    setMotivationalMessage(
      messages[Math.floor(Math.random() * messages.length)]
    );
    clearState(); // Clear localStorage
  };

  // ✅ Determine if we should show the chat input
  const showChatInput = isStarted && !businessPlanMarkdown && !isGeneratingPlan;

  // Prevent hydration mismatches
  if (!isHydrated) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Stepper */}
      <div className="hidden lg:flex w-64 border-r glass-surface p-6 flex-col sticky top-0 h-screen">
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

        <Stepper currentStep={isStarted ? currentStep : 0} totalSteps={6} />

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReduceTranslucency(!reduceTranslucency)}
            className="w-full"
          >
            {reduceTranslucency ? (
              <Eye className="w-4 h-4 mr-2" />
            ) : (
              <EyeOff className="w-4 h-4 mr-2" />
            )}
            {reduceTranslucency ? "Show Glass" : "Reduce Glass"}
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b glass-surface p-4 flex items-center justify-between sticky top-0 z-10">
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
                  ? variant === "fitness-coach"
                    ? "Your Fitness Plan"
                    : "Your Business Plan"
                  : variant === "fitness-coach"
                  ? "Fitness Discovery Chat"
                  : "Business Discovery Chat"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {businessPlanMarkdown
                  ? variant === "fitness-coach"
                    ? "We turned 5 questions into a personalized fitness plan. You're welcome."
                    : "We turned 5 questions into a full-blown AI plan. You're welcome."
                  : isStarted
                  ? `Step ${currentStep} of 6 • ${motivationalMessage}`
                  : variant === "fitness-coach"
                  ? "We turn 5 questions into a personalized fitness plan. You're welcome."
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReduceTranslucency(!reduceTranslucency)}
            >
              {reduceTranslucency ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
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
              variant={variant}
              onComplete={handleContextGatheringComplete}
              onSkip={handleContextGatheringSkip}
              onDataUpdate={(data) => {
                // Update context summary immediately for sidebar
                const initialContext: Partial<ContextSummary> = {
                  businessType:
                    data.businessType ||
                    data.productsServices ||
                    "Not yet specified",
                  marketingStrengths:
                    data.marketingStrengths || "Not yet specified",
                  techStack: data.techStack || "Not yet specified",
                  customerSegment: data.customerSegment || "Not yet specified",
                  growthIntent: data.customerSegment
                    ? `Targeting: ${data.customerSegment}`
                    : data.growthIntent || "Not yet specified",
                  // Avoid seeding pain points/goals from heuristic fields
                  painPoints: data.painPoints || "Not yet specified",
                  goals: data.goals || "Not yet specified",
                  dataAvailable:
                    data.revenueTrend ||
                    data.dataAvailable ||
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
              onContinueChat={() => {
                setBusinessPlanMarkdown(null);
                setCanGeneratePlan(true);
                setReadyToGeneratePlan(true);
                toast({
                  title: "Returned to Chat 💬",
                  description:
                    "You can now discuss your business plan or ask questions about implementation.",
                });
              }}
              contextSummary={contextSummary}
              chatMessages={messages.map((msg) => ({
                role: msg.isUser ? "user" : "assistant",
                content: msg.content,
              }))}
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
                  <div className="text-center space-y-3">
                    <p className="text-lg font-medium">
                      Generating your personalized business plan...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Analyzing your responses and creating actionable
                      recommendations
                    </p>
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg border-l-4 border-primary/30">
                      <p className="text-sm text-green-600 italic">
                        {getIndustryFunFact(contextSummary)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ✅ Plan Generation CTA - appears once summary step is complete */}
        {readyToGeneratePlan && (
          <div className="border-t bg-card p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  What would you like to do next?
                </h3>
                <p className="text-muted-foreground">
                  We have everything we need to build your personalized AI
                  action plan. You can generate it now or keep sharing details
                  to enrich the context.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  {isGeneratingPlan ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating Your Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Action Plan
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setReadyToGeneratePlan(false);
                  }}
                  variant="outline"
                  size="lg"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Continue Chatting
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Anything you share now will be woven into your business context
                before we craft the plan.
              </p>
            </div>
          </div>
        )}

        {/* ✅ Lightweight CTA when plan can be generated but banner dismissed */}
        {!readyToGeneratePlan &&
          canGeneratePlan &&
          !businessPlanMarkdown &&
          !isGeneratingPlan &&
          currentStep < 6 && ( // Only show if we haven't reached summary yet
            <div className="border-t bg-card/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Ready when you are—generate the AI action plan anytime.
              </p>
              <Button
                onClick={() => {
                  if (isGeneratingPlan) return;
                  handleGeneratePlan();
                }}
                disabled={isGeneratingPlan}
                size="sm"
                className="sm:w-auto"
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Working...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Action Plan
                  </>
                )}
              </Button>
            </div>
          )}

        {/* ✅ Chat Input - only show when appropriate */}
        {showChatInput && (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder={
              currentStep < 5
                ? "Share your thoughts..."
                : currentStep === 5
                ? "Answer this final question..."
                : "Add any additional thoughts..."
            }
          />
        )}
      </div>

      {/* Right Sidebar - Business Profile */}
      <div className="hidden xl:flex w-80 border-l glass-surface p-6 flex-col sticky top-0 h-screen">
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
              Your business insights will be used to personalize the AI
              conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
