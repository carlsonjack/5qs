import { NextRequest, NextResponse } from "next/server";
import { createDatabaseIntegration } from "./integration";

// Wrapper function to add database integration to existing API routes
export function withDatabase<T = any>(
  handler: (req: NextRequest, db: any) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    try {
      const db = createDatabaseIntegration(req);
      await db.initialize();

      // Track API call
      await db.trackEvent("api_call", "api_request", {
        path: req.nextUrl.pathname,
        method: req.method,
      });

      return await handler(req, db);
    } catch (error) {
      console.error("Database integration error:", error);

      // Log system health error
      try {
        const db = createDatabaseIntegration(req);
        await db.initialize();
        await db.logSystemHealth({
          service: "database_integration",
          endpoint: req.nextUrl.pathname,
          method: req.method,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorType: "integration_error",
        });
      } catch (logError) {
        console.error("Failed to log system health error:", logError);
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// Helper to save chat messages to database
export async function saveChatMessages(
  db: any,
  messages: Array<{ role: string; content: string }>,
  conversationId?: string
) {
  if (!conversationId) {
    conversationId = db.conversation?.id;
  }

  if (!conversationId) {
    throw new Error("No conversation ID available");
  }

  const savedMessages = [];
  for (const message of messages) {
    try {
      const savedMessage = await db.saveMessage(message.role, message.content, {
        timestamp: new Date().toISOString(),
      });
      savedMessages.push(savedMessage);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }

  return savedMessages;
}

// Helper to update conversation context
export async function updateConversationContext(
  db: any,
  contextData: {
    contextSummary?: any;
    websiteAnalysis?: any;
    financialAnalysis?: any;
    leadSignals?: any;
  }
) {
  try {
    return await db.updateContext(contextData);
  } catch (error) {
    console.error("Error updating conversation context:", error);
    throw error;
  }
}

// Helper to save business plan
export async function saveBusinessPlan(
  db: any,
  planData: {
    title?: string;
    content: string;
    htmlContent?: string;
    planLength?: number;
    generationTime?: number;
    modelUsed?: string;
    planHighlights?: string[];
    estimatedROI?: string;
    implementationTimeline?: string;
  }
) {
  try {
    return await db.saveBusinessPlan(planData);
  } catch (error) {
    console.error("Error saving business plan:", error);
    throw error;
  }
}

// Helper to save lead data
export async function saveLeadData(
  db: any,
  leadData: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    businessType?: string;
    painPoints?: string;
    goals?: string;
    industry?: string;
    geography?: string;
    score?: number;
    leadSignals?: any;
    ipAddress?: string;
  }
) {
  try {
    return await db.saveLead(leadData);
  } catch (error) {
    console.error("Error saving lead data:", error);
    throw error;
  }
}

// Helper to save website analysis
export async function saveWebsiteAnalysis(
  db: any,
  analysisData: {
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    productsServices?: string;
    customerSegment?: string;
    techStack?: string;
    marketingStrengths?: string;
    marketingWeaknesses?: string;
    contentSample?: string;
    metaTags?: any;
    socialLinks?: string[];
    contactInfo?: any;
    analysisMethod?: string;
    processingTime?: number;
    confidence?: number;
  }
) {
  try {
    return await db.saveWebsiteAnalysis(analysisData);
  } catch (error) {
    console.error("Error saving website analysis:", error);
    throw error;
  }
}

// Helper to log email events
export async function logEmailEvent(
  db: any,
  eventData: {
    businessPlanId?: string;
    leadId?: string;
    toEmail: string;
    fromEmail: string;
    subject: string;
    emailType: string;
    messageId?: string;
    status: string;
    provider?: string;
  }
) {
  try {
    return await db.logEmailEvent(eventData);
  } catch (error) {
    console.error("Error logging email event:", error);
    throw error;
  }
}
