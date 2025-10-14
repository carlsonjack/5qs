// Example of how to integrate database with existing API routes
// This shows how to modify your existing chat route to use the database

import { NextRequest, NextResponse } from "next/server";
import {
  withDatabase,
  saveChatMessages,
  updateConversationContext,
  saveBusinessPlan,
  saveLeadData,
} from "./api-wrapper";

// Example: Updated chat route with database integration
export async function POST(req: NextRequest) {
  return withDatabase(async (req, db) => {
    try {
      const {
        messages,
        currentStep,
        initialContext,
        websiteAnalysis,
        financialAnalysis,
      } = await req.json();

      // Track the chat request
      await db.trackEvent("chat_request", "conversation_step", {
        step: currentStep,
        messageCount: messages.length,
      });

      // Save all messages to database
      await saveChatMessages(db, messages);

      // Update conversation context if we have analysis data
      if (websiteAnalysis || financialAnalysis || initialContext) {
        await updateConversationContext(db, {
          websiteAnalysis,
          financialAnalysis,
          initialContext,
        });
      }

      // Your existing AI logic here...
      // (Keep all your existing chat logic)

      // Example: When generating business plan
      if (currentStep === 6) {
        // Your existing business plan generation logic...
        const businessPlanContent = "Generated business plan content...";

        // Save business plan to database
        const businessPlan = await saveBusinessPlan(db, {
          content: businessPlanContent,
          planLength: businessPlanContent.length,
          modelUsed: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
          planHighlights: ["Key insight 1", "Key insight 2"],
        });

        // Save lead data
        await saveLeadData(db, {
          email: "user@example.com", // Get from request
          firstName: "John",
          lastName: "Doe",
          businessType: initialContext?.businessType,
          painPoints: initialContext?.painPoints,
          goals: initialContext?.goals,
          score: 85,
        });

        return NextResponse.json({
          message: "Business plan generated successfully",
          businessPlanMarkdown: businessPlanContent,
          businessPlanId: businessPlan.id,
          isBusinessPlan: true,
        });
      }

      // Your existing response logic...
      return NextResponse.json({
        message: "AI response here...",
        contextSummary: {},
      });
    } catch (error) {
      console.error("Chat API error:", error);

      // Log system health error
      await db.logSystemHealth({
        service: "chat_api",
        endpoint: "/api/chat",
        method: "POST",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: "api_error",
      });

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })(req);
}

// Example: Updated send-plan route with database integration
export async function POST(req: NextRequest) {
  return withDatabase(async (req, db) => {
    try {
      const {
        email,
        firstName,
        lastName,
        businessPlan,
        contextSummary,
        userInfo,
        chatMessages,
      } = await req.json();

      // Track email sending event
      await db.trackEvent("email_send", "business_plan_delivery", {
        email,
        planLength: businessPlan?.length,
      });

      // Your existing email sending logic...
      // (Keep all your existing email logic)

      // Log email event
      await db.logEmailEvent({
        toEmail: email,
        fromEmail: "jack@5qstrategy.com",
        subject: "Your AI Implementation Plan - 5Q Strategy",
        emailType: "business_plan",
        status: "sent",
        provider: "resend",
      });

      // Update business plan status
      if (businessPlan) {
        // Find the business plan and mark as delivered
        // This would need to be implemented based on your business plan ID tracking
      }

      return NextResponse.json({
        success: true,
        message: "Business plan sent successfully",
      });
    } catch (error) {
      console.error("Send plan error:", error);

      await db.logSystemHealth({
        service: "send_plan_api",
        endpoint: "/api/send-plan",
        method: "POST",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: "api_error",
      });

      return NextResponse.json(
        { error: "Failed to send business plan" },
        { status: 500 }
      );
    }
  })(req);
}
