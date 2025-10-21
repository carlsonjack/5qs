import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { feedback, NewFeedback } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

// Validation schema for feedback
const FeedbackSchema = z.object({
  feedbackType: z.enum(["thumbs_up", "thumbs_down"]),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  stepNumber: z.number().int().min(1).max(6).optional(),
  isBusinessPlan: z.boolean().optional(),
  messageContent: z.string().optional(),
  appVariant: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = FeedbackSchema.parse(body);

    // Extract session ID from cookies or headers
    const sessionId =
      request.cookies.get("session-id")?.value ||
      request.headers.get("x-session-id") ||
      crypto.randomUUID();

    // Create feedback record
    const feedbackData: NewFeedback = {
      feedbackType: validatedData.feedbackType,
      conversationId: validatedData.conversationId || null,
      messageId: validatedData.messageId || null,
      stepNumber: validatedData.stepNumber || null,
      isBusinessPlan: validatedData.isBusinessPlan || false,
      messageContent: validatedData.messageContent || null,
      appVariant: validatedData.appVariant || null,
      rating: validatedData.rating || null,
      comment: validatedData.comment || null,
      metadata: validatedData.metadata || null,
    };

    // Insert feedback into database
    const result = await db.insert(feedback).values(feedbackData).returning();

    console.log("Feedback saved:", {
      id: result[0].id,
      type: validatedData.feedbackType,
      stepNumber: validatedData.stepNumber,
      sessionId,
    });

    return NextResponse.json({
      success: true,
      feedbackId: result[0].id,
      message: "Feedback saved successfully",
    });
  } catch (error) {
    console.error("Error saving feedback:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid feedback data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save feedback",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const stepNumber = searchParams.get("stepNumber");

    let query = db.select().from(feedback);

    if (conversationId) {
      query = query.where(eq(feedback.conversationId, conversationId));
    }

    if (stepNumber) {
      query = query.where(eq(feedback.stepNumber, parseInt(stepNumber)));
    }

    const results = await query.orderBy(desc(feedback.createdAt));

    return NextResponse.json({
      success: true,
      feedback: results,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch feedback",
      },
      { status: 500 }
    );
  }
}
