import { NextRequest } from "next/server";
import {
  userService,
  conversationService,
  messageService,
  businessPlanService,
  leadService,
  websiteAnalysisService,
  fileUploadService,
  emailEventService,
  analyticsService,
  systemHealthService,
  dbUtils,
} from "./services";
import {
  getOrCreateSessionId,
  extractUserInfo,
  extractUtmParams,
} from "../session";
import { getUser } from "../auth/server";

// Main integration service for API routes
export class DatabaseIntegration {
  private request: NextRequest;
  private sessionId: string;
  private user: any = null;
  private conversation: any = null;

  private appVariant: string | null = null;

  constructor(request: NextRequest) {
    this.request = request;
    this.sessionId = getOrCreateSessionId(request);
    this.appVariant = request.nextUrl.searchParams.get("v");
  }

  // Initialize user and conversation
  async initialize() {
    try {
      // Get authenticated user if available
      this.user = await getUser();

      // Get or create conversation
      this.conversation = await conversationService.findBySessionId(
        this.sessionId
      );

      if (!this.conversation) {
        // Create new conversation
        const userInfo = extractUserInfo(this.request);
        const utmParams = extractUtmParams(userInfo.referer);

        // Create user record if not authenticated
        if (!this.user) {
          this.user = await userService.create({
            email: `anonymous-${this.sessionId}@temp.com`,
            preferences: {},
            utmSource: utmParams.utmSource,
            utmMedium: utmParams.utmMedium,
            utmCampaign: utmParams.utmCampaign,
            referrer: userInfo.referer,
            ipAddress: userInfo.ipAddress,
            userAgent: userInfo.userAgent,
          });
        }

        this.conversation = await conversationService.create({
          userId: this.user.id,
          sessionId: this.sessionId,
          status: "active",
          appVariant: this.appVariant || undefined,
        });
      }

      return {
        user: this.user,
        conversation: this.conversation,
        sessionId: this.sessionId,
        appVariant: this.appVariant,
      };
    } catch (error) {
      console.error("Error initializing database integration:", error);
      throw error;
    }
  }

  // Track analytics events
  async trackEvent(eventType: string, eventName: string, properties?: any) {
    try {
      await analyticsService.trackEvent({
        userId: this.user?.id,
        conversationId: this.conversation?.id,
        sessionId: this.sessionId,
        eventType,
        eventName,
        properties,
        page: this.request.nextUrl.pathname,
        userAgent: this.request.headers.get("user-agent"),
        ipAddress: this.request.headers.get("x-forwarded-for")?.split(",")[0],
        referrer: this.request.headers.get("referer"),
      });
    } catch (error) {
      console.error("Error tracking analytics event:", error);
    }
  }

  // Log system health metrics
  async logSystemHealth(data: {
    service: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    success: boolean;
    errorMessage?: string;
    errorType?: string;
    tokensUsed?: number;
    costEstimate?: number;
    modelUsed?: string;
  }) {
    try {
      await systemHealthService.logRequest({
        ...data,
        userId: this.user?.id,
        conversationId: this.conversation?.id,
      });
    } catch (error) {
      console.error("Error logging system health:", error);
    }
  }

  // Save chat message
  async saveMessage(role: string, content: string, metadata?: any) {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      const message = await messageService.create({
        conversationId: this.conversation.id,
        role,
        content,
        metadata,
      });

      // Update conversation step if it's an assistant message
      if (role === "assistant") {
        await conversationService.updateStep(
          this.conversation.id,
          this.conversation.currentStep + 1
        );
      }

      return message;
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  }

  // Update conversation context
  async updateContext(contextData: {
    contextSummary?: any;
    websiteAnalysis?: any;
    financialAnalysis?: any;
    leadSignals?: any;
  }) {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      this.conversation = await conversationService.updateContext(
        this.conversation.id,
        contextData
      );
      return this.conversation;
    } catch (error) {
      console.error("Error updating conversation context:", error);
      throw error;
    }
  }

  // Save business plan
  async saveBusinessPlan(planData: {
    title?: string;
    content: string;
    htmlContent?: string;
    planLength?: number;
    generationTime?: number;
    modelUsed?: string;
    planHighlights?: string[];
    estimatedROI?: string;
    implementationTimeline?: string;
  }) {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      const businessPlan = await businessPlanService.create({
        conversationId: this.conversation.id,
        userId: this.user?.id,
        ...planData,
      });

      // Mark conversation as completed
      await conversationService.markCompleted(this.conversation.id);

      return businessPlan;
    } catch (error) {
      console.error("Error saving business plan:", error);
      throw error;
    }
  }

  // Create or update lead
  async saveLead(leadData: {
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
    appVariant?: string;
  }) {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      const ipFromHeaders =
        this.request.headers.get("x-forwarded-for")?.split(",")[0] ||
        this.request.headers.get("x-real-ip") ||
        undefined;

      const lead = await leadService.findOrCreate({
        userId: this.user?.id,
        conversationId: this.conversation.id,
        businessPlanId: null, // Will be updated when business plan is created
        ...leadData,
        ipAddress: leadData.ipAddress || ipFromHeaders,
        appVariant: leadData.appVariant || this.appVariant || undefined,
      });

      return lead;
    } catch (error) {
      console.error("Error saving lead:", error);
      throw error;
    }
  }

  // Save website analysis
  async saveWebsiteAnalysis(analysisData: {
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
  }) {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      const analysis = await websiteAnalysisService.create({
        conversationId: this.conversation.id,
        userId: this.user?.id,
        ...analysisData,
      });

      return analysis;
    } catch (error) {
      console.error("Error saving website analysis:", error);
      throw error;
    }
  }

  // Save file upload
  async saveFileUpload(uploadData: {
    fileName: string;
    fileType: string;
    fileSize?: number;
    filePath?: string;
    extractedText?: string;
    analysis?: any;
    confidence?: number;
  }) {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      const upload = await fileUploadService.create({
        conversationId: this.conversation.id,
        userId: this.user?.id,
        ...uploadData,
      });

      return upload;
    } catch (error) {
      console.error("Error saving file upload:", error);
      throw error;
    }
  }

  // Log email event
  async logEmailEvent(eventData: {
    businessPlanId?: string;
    leadId?: string;
    toEmail: string;
    fromEmail: string;
    subject: string;
    emailType: string;
    messageId?: string;
    status: string;
    provider?: string;
  }) {
    try {
      const event = await emailEventService.create(eventData);
      return event;
    } catch (error) {
      console.error("Error logging email event:", error);
      throw error;
    }
  }

  // Get full conversation context
  async getFullContext() {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      return await dbUtils.getConversationWithFullContext(this.conversation.id);
    } catch (error) {
      console.error("Error getting full context:", error);
      throw error;
    }
  }

  // Get conversation messages
  async getMessages() {
    if (!this.conversation) {
      throw new Error("Conversation not initialized");
    }

    try {
      return await messageService.getByConversation(this.conversation.id);
    } catch (error) {
      console.error("Error getting messages:", error);
      throw error;
    }
  }

  // Update business plan status
  async updateBusinessPlanStatus(
    planId: string,
    status: string,
    email?: string
  ) {
    try {
      if (status === "delivered" && email) {
        return await businessPlanService.markDelivered(planId, email);
      } else if (status === "viewed") {
        return await businessPlanService.markViewed(planId);
      } else if (status === "downloaded") {
        return await businessPlanService.incrementDownloadCount(planId);
      }
    } catch (error) {
      console.error("Error updating business plan status:", error);
      throw error;
    }
  }

  // Get user by email (for lead management)
  async getUserByEmail(email: string) {
    try {
      return await userService.findByEmail(email);
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  // Get recent leads
  async getRecentLeads(limit = 20) {
    try {
      return await leadService.getRecentLeads(limit);
    } catch (error) {
      console.error("Error getting recent leads:", error);
      throw error;
    }
  }

  // Get high-value leads
  async getHighValueLeads(minScore = 70, limit = 50) {
    try {
      return await leadService.getLeadsByScore(minScore, limit);
    } catch (error) {
      console.error("Error getting high-value leads:", error);
      throw error;
    }
  }
}

// Factory function to create database integration instance
export function createDatabaseIntegration(request: NextRequest) {
  return new DatabaseIntegration(request);
}

// Helper function for API routes
export async function withDatabaseIntegration<T>(
  request: NextRequest,
  handler: (db: DatabaseIntegration) => Promise<T>
): Promise<T> {
  const db = createDatabaseIntegration(request);
  await db.initialize();
  return handler(db);
}
