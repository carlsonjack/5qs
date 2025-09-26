import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./client";
import {
  users,
  conversations,
  messages,
  businessPlans,
  leads,
  fileUploads,
  websiteAnalyses,
  emailEvents,
  analyticsEvents,
  systemHealth,
  type NewUser,
  type NewConversation,
  type NewMessage,
  type NewBusinessPlan,
  type NewLead,
  type NewFileUpload,
  type NewWebsiteAnalysis,
  type NewEmailEvent,
  type NewAnalyticsEvent,
  type NewSystemHealth,
} from "./schema";

// User Services
export const userService = {
  async create(data: NewUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },

  async findOrCreate(data: NewUser) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      // Update last seen
      const [updated] = await db
        .update(users)
        .set({ lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }
    return this.create(data);
  },

  async updatePreferences(userId: string, preferences: any) {
    const [updated] = await db
      .update(users)
      .set({ preferences, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  },
};

// Conversation Services
export const conversationService = {
  async create(data: NewConversation) {
    const [conversation] = await db
      .insert(conversations)
      .values(data)
      .returning();
    return conversation;
  },

  async findBySessionId(sessionId: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId));
    return conversation;
  },

  async findById(id: string) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  },

  async updateStep(id: string, step: number) {
    const [updated] = await db
      .update(conversations)
      .set({ currentStep: step, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  },

  async updateContext(
    id: string,
    contextData: {
      contextSummary?: any;
      websiteAnalysis?: any;
      financialAnalysis?: any;
      leadSignals?: any;
    }
  ) {
    const [updated] = await db
      .update(conversations)
      .set({ ...contextData, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  },

  async markCompleted(id: string) {
    const [updated] = await db
      .update(conversations)
      .set({
        status: "completed",
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  },

  async getWithMessages(id: string) {
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation[0]) return null;

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    return {
      ...conversation[0],
      messages: conversationMessages,
    };
  },
};

// Message Services
export const messageService = {
  async create(data: NewMessage) {
    const [message] = await db.insert(messages).values(data).returning();
    
    // Update conversation message count
    await db
      .update(conversations)
      .set({
        totalMessages: sql`${conversations.totalMessages} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, data.conversationId));
    
    return message;
  },

  async getByConversation(conversationId: string) {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },

  async createBatch(messagesData: NewMessage[]) {
    const insertedMessages = await db
      .insert(messages)
      .values(messagesData)
      .returning();
    
    // Update conversation message count
    if (messagesData.length > 0) {
      await db
        .update(conversations)
        .set({
          totalMessages: sql`${conversations.totalMessages} + ${messagesData.length}`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, messagesData[0].conversationId));
    }
    
    return insertedMessages;
  },
};

// Business Plan Services
export const businessPlanService = {
  async create(data: NewBusinessPlan) {
    const [plan] = await db.insert(businessPlans).values(data).returning();
    return plan;
  },

  async findById(id: string) {
    const [plan] = await db
      .select()
      .from(businessPlans)
      .where(eq(businessPlans.id, id));
    return plan;
  },

  async findByConversation(conversationId: string) {
    const [plan] = await db
      .select()
      .from(businessPlans)
      .where(eq(businessPlans.conversationId, conversationId));
    return plan;
  },

  async markDelivered(id: string, email: string) {
    const [updated] = await db
      .update(businessPlans)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
        deliveredTo: email,
        updatedAt: new Date(),
      })
      .where(eq(businessPlans.id, id))
      .returning();
    return updated;
  },

  async markViewed(id: string) {
    const [updated] = await db
      .update(businessPlans)
      .set({
        viewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(businessPlans.id, id))
      .returning();
    return updated;
  },

  async incrementDownloadCount(id: string) {
    const [updated] = await db
      .update(businessPlans)
      .set({
        downloadCount: sql`${businessPlans.downloadCount} + 1`,
        downloadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(businessPlans.id, id))
      .returning();
    return updated;
  },

  async getRecentPlans(limit = 10) {
    return db
      .select()
      .from(businessPlans)
      .orderBy(desc(businessPlans.createdAt))
      .limit(limit);
  },
};

// Lead Services
export const leadService = {
  async create(data: NewLead) {
    const [lead] = await db.insert(leads).values(data).returning();
    return lead;
  },

  async findByEmail(email: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.email, email));
    return lead;
  },

  async findOrCreate(data: NewLead) {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      // Update with new data
      const [updated] = await db
        .update(leads)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(leads.id, existing.id))
        .returning();
      return updated;
    }
    return this.create(data);
  },

  async updateStatus(id: string, status: string) {
    const [updated] = await db
      .update(leads)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  },

  async updateScore(id: string, score: number) {
    const [updated] = await db
      .update(leads)
      .set({ score, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  },

  async addContactAttempt(id: string, notes?: string) {
    const [updated] = await db
      .update(leads)
      .set({
        contactAttempts: sql`${leads.contactAttempts} + 1`,
        lastContactedAt: new Date(),
        notes: notes ? sql`CONCAT(COALESCE(${leads.notes}, ''), '\n', ${notes})` : leads.notes,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  },

  async getLeadsByScore(minScore = 70, limit = 50) {
    return db
      .select()
      .from(leads)
      .where(sql`${leads.score} >= ${minScore}`)
      .orderBy(desc(leads.score), desc(leads.createdAt))
      .limit(limit);
  },

  async getRecentLeads(limit = 20) {
    return db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(limit);
  },
};

// File Upload Services
export const fileUploadService = {
  async create(data: NewFileUpload) {
    const [upload] = await db.insert(fileUploads).values(data).returning();
    return upload;
  },

  async updateStatus(id: string, status: string, analysis?: any, errorMessage?: string) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (analysis) {
      updateData.analysis = analysis;
      updateData.analyzedAt = new Date();
    }
    
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
      updateData.retryCount = sql`${fileUploads.retryCount} + 1`;
    }

    const [updated] = await db
      .update(fileUploads)
      .set(updateData)
      .where(eq(fileUploads.id, id))
      .returning();
    return updated;
  },

  async getByConversation(conversationId: string) {
    return db
      .select()
      .from(fileUploads)
      .where(eq(fileUploads.conversationId, conversationId))
      .orderBy(fileUploads.createdAt);
  },
};

// Website Analysis Services
export const websiteAnalysisService = {
  async create(data: NewWebsiteAnalysis) {
    const [analysis] = await db
      .insert(websiteAnalyses)
      .values(data)
      .returning();
    return analysis;
  },

  async findByUrl(url: string, conversationId: string) {
    const [analysis] = await db
      .select()
      .from(websiteAnalyses)
      .where(
        and(
          eq(websiteAnalyses.url, url),
          eq(websiteAnalyses.conversationId, conversationId)
        )
      );
    return analysis;
  },

  async getByConversation(conversationId: string) {
    return db
      .select()
      .from(websiteAnalyses)
      .where(eq(websiteAnalyses.conversationId, conversationId))
      .orderBy(websiteAnalyses.createdAt);
  },
};

// Email Event Services
export const emailEventService = {
  async create(data: NewEmailEvent) {
    const [event] = await db.insert(emailEvents).values(data).returning();
    return event;
  },

  async updateStatus(messageId: string, status: string, eventData?: any) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Add timestamp fields based on status
    if (status === "opened" && eventData?.openedAt) {
      updateData.openedAt = new Date(eventData.openedAt);
    } else if (status === "clicked" && eventData?.clickedAt) {
      updateData.clickedAt = new Date(eventData.clickedAt);
    } else if (status === "bounced" && eventData?.bouncedAt) {
      updateData.bouncedAt = new Date(eventData.bouncedAt);
    }

    const [updated] = await db
      .update(emailEvents)
      .set(updateData)
      .where(eq(emailEvents.messageId, messageId))
      .returning();
    return updated;
  },

  async getByEmail(email: string) {
    return db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.toEmail, email))
      .orderBy(desc(emailEvents.createdAt));
  },
};

// Analytics Services
export const analyticsService = {
  async trackEvent(data: NewAnalyticsEvent) {
    const [event] = await db.insert(analyticsEvents).values(data).returning();
    return event;
  },

  async getEventsByType(eventType: string, limit = 100) {
    return db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventType, eventType))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  },

  async getEventsByUser(userId: string, limit = 50) {
    return db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.userId, userId))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  },
};

// System Health Services
export const systemHealthService = {
  async logRequest(data: NewSystemHealth) {
    const [log] = await db.insert(systemHealth).values(data).returning();
    return log;
  },

  async getRecentErrors(limit = 50) {
    return db
      .select()
      .from(systemHealth)
      .where(eq(systemHealth.success, false))
      .orderBy(desc(systemHealth.createdAt))
      .limit(limit);
  },

  async getServiceHealth(service: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return db
      .select()
      .from(systemHealth)
      .where(
        and(
          eq(systemHealth.service, service),
          sql`${systemHealth.createdAt} >= ${since}`
        )
      )
      .orderBy(desc(systemHealth.createdAt));
  },

  async getSuccessRate(service: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        successful: sql<number>`count(case when success = true then 1 end)`,
      })
      .from(systemHealth)
      .where(
        and(
          eq(systemHealth.service, service),
          sql`${systemHealth.createdAt} >= ${since}`
        )
      );

    const { total, successful } = result[0] || { total: 0, successful: 0 };
    return total > 0 ? (successful / total) * 100 : 0;
  },
};

// Utility Functions
export const dbUtils = {
  async getConversationWithFullContext(conversationId: string) {
    const conversation = await conversationService.findById(conversationId);
    if (!conversation) return null;

    const [conversationMessages, businessPlan, uploads, websiteAnalysis] = await Promise.all([
      messageService.getByConversation(conversationId),
      businessPlanService.findByConversation(conversationId),
      fileUploadService.getByConversation(conversationId),
      websiteAnalysisService.getByConversation(conversationId),
    ]);

    return {
      ...conversation,
      messages: conversationMessages,
      businessPlan,
      uploads,
      websiteAnalysis: websiteAnalysis[0] || null,
    };
  },

  async createCompleteSession(data: {
    user: NewUser;
    conversation: Omit<NewConversation, "userId">;
    messages: Omit<NewMessage, "conversationId">[];
    businessPlan?: Omit<NewBusinessPlan, "conversationId" | "userId">;
    lead?: Omit<NewLead, "conversationId" | "userId">;
  }) {
    // Create user
    const user = await userService.findOrCreate(data.user);
    
    // Create conversation
    const conversation = await conversationService.create({
      ...data.conversation,
      userId: user.id,
    });

    // Create messages
    const messages = await messageService.createBatch(
      data.messages.map(msg => ({
        ...msg,
        conversationId: conversation.id,
      }))
    );

    // Create business plan if provided
    let businessPlan = null;
    if (data.businessPlan) {
      businessPlan = await businessPlanService.create({
        ...data.businessPlan,
        conversationId: conversation.id,
        userId: user.id,
      });
    }

    // Create lead if provided
    let lead = null;
    if (data.lead) {
      lead = await leadService.findOrCreate({
        ...data.lead,
        conversationId: conversation.id,
        userId: user.id,
        businessPlanId: businessPlan?.id,
      });
    }

    return {
      user,
      conversation,
      messages,
      businessPlan,
      lead,
    };
  },
};
