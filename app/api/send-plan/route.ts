import { type NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import { withDatabaseIntegration } from "@/lib/db/integration";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FORWARD_EMAIL = "carlsonjack455@gmail.com";

interface EmailData {
  email: string;
  firstName: string;
  lastName: string;
  businessPlan: string;
  contextSummary: any;
  chatMessages?: Array<{ role: string; content: string }>;
  userInfo?: {
    businessType?: string;
    painPoints?: string;
    goals?: string;
  };
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>
) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set, would send email:", { to, subject });
    return { success: true, id: "mock-email-id" };
  }

  console.log("🔄 Sending email via Resend API...", {
    to,
    subject,
    from: "5Q Strategy <jack@5qstrategy.com>",
    apiKeyPrefix: RESEND_API_KEY.substring(0, 8) + "...",
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "5Q Strategy <jack@5qstrategy.com>",
      to: [to],
      subject,
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": `5q-strategy-${Date.now()}`,
        "List-Unsubscribe": "<mailto:jack@5qstrategy.com?subject=Unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        {
          name: "category",
          value: "business-plan",
        },
      ],
      ...(attachments && { attachments }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend API error:", {
      status: response.status,
      statusText: response.statusText,
      error,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
      to,
      subject,
    });

    // Provide more specific error messages
    if (response.status === 401) {
      throw new Error(
        `Email sending failed: Invalid API key (${response.status})`
      );
    } else if (response.status === 429) {
      throw new Error(
        `Email sending failed: Rate limit exceeded (${response.status})`
      );
    } else if (response.status === 422) {
      throw new Error(
        `Email sending failed: Invalid email content or format (${response.status})`
      );
    } else {
      throw new Error(`Email sending failed: ${response.status} - ${error}`);
    }
  }

  const result = await response.json();
  console.log("Email sent successfully:", { id: result.id, to });
  return result;
}

function generateBusinessPlanPDF(businessPlan: string, email: string): string {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Set up PDF styling
    pdf.setFont("helvetica");
    pdf.setFontSize(16);

    // Add title
    pdf.text("AI Business Implementation Plan", 20, 25);
    pdf.setFontSize(12);
    pdf.text(`Generated for: ${email}`, 20, 35);
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 42);

    // Add business plan content
    pdf.setFontSize(10);

    // Clean the business plan text for PDF (remove markdown formatting)
    let cleanText = businessPlan
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
      .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
      .replace(/#{1,6}\s*/g, "") // Remove headers
      .replace(/\|.*?\|/g, "") // Remove table content (simplified)
      .replace(/[-]{3,}/g, "") // Remove table separators
      .replace(/^\s*[\-\*\+]\s+/gm, "• ") // Convert markdown lists to bullets
      .trim();

    // Split into lines and add to PDF with word wrapping
    const lines = pdf.splitTextToSize(cleanText, 170); // 170mm width for A4 with margins
    let yPosition = 55;
    const lineHeight = 5;
    const pageHeight = 280; // A4 height minus margins

    lines.forEach((line: string) => {
      if (yPosition > pageHeight) {
        pdf.addPage();
        yPosition = 25;
      }
      pdf.text(line, 20, yPosition);
      yPosition += lineHeight;
    });

    // Return as base64 string
    return pdf.output("datauristring").split(",")[1];
  } catch (error) {
    console.error("Error generating PDF:", error);
    return "";
  }
}

function generateChatSummary(
  chatMessages?: Array<{ role: string; content: string }>
): string {
  if (!chatMessages || chatMessages.length === 0) {
    return "No chat conversation available.";
  }

  let summary = "Chat Conversation Summary:\n\n";

  chatMessages.forEach((message, index) => {
    const role = message.role === "user" ? "User" : "Assistant";
    const content =
      message.content.length > 200
        ? message.content.substring(0, 200) + "..."
        : message.content;

    summary += `${role}: ${content}\n\n`;
  });

  return summary;
}

function generateBusinessPlanEmail(data: EmailData) {
  const { businessPlan, contextSummary, userInfo, firstName, lastName } = data;

  // Convert markdown to HTML for proper email formatting
  const convertMarkdownToHtml = (markdown: string): string => {
    return (
      markdown
        // Convert headers
        .replace(
          /^### (.*$)/gim,
          '<h3 style="color: #495057; margin: 20px 0 15px 0; font-size: 18px; font-weight: 600;">$1</h3>'
        )
        .replace(
          /^## (.*$)/gim,
          '<h2 style="color: #495057; margin: 25px 0 20px 0; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">$1</h2>'
        )
        .replace(
          /^# (.*$)/gim,
          '<h1 style="color: #495057; margin: 30px 0 25px 0; font-size: 24px; font-weight: 700;">$1</h1>'
        )

        // Convert bold text
        .replace(
          /\*\*(.*?)\*\*/g,
          '<strong style="font-weight: 600; color: #212529;">$1</strong>'
        )

        // Convert italic text
        .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')

        // Convert bullet points
        .replace(
          /^\- (.*$)/gim,
          '<li style="margin: 8px 0; padding-left: 5px;">$1</li>'
        )
        .replace(
          /(<li.*<\/li>)/gs,
          '<ul style="margin: 15px 0; padding-left: 20px;">$1</ul>'
        )

        // Convert numbered lists
        .replace(
          /^\d+\. (.*$)/gim,
          '<li style="margin: 8px 0; padding-left: 5px;">$1</li>'
        )

        // Convert line breaks
        .replace(/\n\n/g, '</p><p style="margin: 15px 0; line-height: 1.6;">')
        .replace(/\n/g, "<br>")

        // Wrap in paragraph tags
        .replace(
          /^(?!<[h|u|l])/gm,
          '<p style="margin: 15px 0; line-height: 1.6;">'
        )
        .replace(/(?<!>)$/gm, "</p>")

        // Clean up empty paragraphs
        .replace(/<p[^>]*>\s*<\/p>/g, "")
        .replace(/<p[^>]*><br><\/p>/g, "")
    );
  };

  const cleanedBusinessPlan = convertMarkdownToHtml(businessPlan);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your AI Business Implementation Plan</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: #ffffff;
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px; 
          border-radius: 8px; 
          margin-bottom: 30px; 
          text-align: center; 
        }
        .header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 0; font-size: 16px; opacity: 0.9; }
        .content { 
          background: #f8f9fa; 
          padding: 30px; 
          border-radius: 8px; 
          margin-bottom: 20px; 
        }
        .plan-content { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px; 
          line-height: 1.6;
          background: white;
          padding: 30px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          color: #333333;
        }
        .plan-content h1, .plan-content h2, .plan-content h3 {
          margin-top: 0;
        }
        .plan-content ul, .plan-content ol {
          margin: 15px 0;
          padding-left: 20px;
        }
        .plan-content li {
          margin: 8px 0;
        }
        .plan-content p {
          margin: 15px 0;
        }
        .footer { 
          text-align: center; 
          color: #6c757d; 
          font-size: 13px; 
          margin-top: 30px; 
          padding: 20px;
          border-top: 1px solid #e9ecef;
        }
        .highlight { 
          background: #fff3cd; 
          padding: 20px; 
          border-left: 4px solid #ffc107; 
          margin: 20px 0; 
          border-radius: 4px;
        }
        .highlight h3 { margin-top: 0; color: #856404; }
        .company-info { margin-bottom: 15px; }
        .company-info p { margin: 5px 0; }
        .unsubscribe { 
          margin-top: 20px; 
          font-size: 12px; 
          color: #868e96; 
        }
        .unsubscribe a { color: #6c757d; text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          body { padding: 10px; }
          .header, .content { padding: 20px; }
        }
      </style>
    </head>
    <body>
             <div class="header">
               <h1>Your AI Business Implementation Plan</h1>
               <p>Customized strategy roadmap for ${firstName} ${lastName}'s business growth</p>
             </div>
      
      <div class="content">
        <div class="highlight">
          <h3>Business Profile Summary</h3>
          <div class="company-info">
            <p><strong>Business Type:</strong> ${
              contextSummary?.businessType ||
              userInfo?.businessType ||
              "Not specified"
            }</p>
            <p><strong>Key Challenges:</strong> ${
              contextSummary?.painPoints ||
              userInfo?.painPoints ||
              "Not specified"
            }</p>
            <p><strong>Goals:</strong> ${
              contextSummary?.goals || userInfo?.goals || "Not specified"
            }</p>
          </div>
        </div>
        
        <h2 style="color: #495057; margin-bottom: 20px;">Your Complete Implementation Plan</h2>
        <div class="plan-content">${cleanedBusinessPlan}</div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0; margin-bottom: 10px;">📎 PDF Attachment Included</h3>
          <p style="margin: 0; color: #155724;">A professional PDF version of your business plan is attached to this email for easy sharing with your team and stakeholders.</p>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>5Q Strategy</strong> - AI Implementation Specialists</p>
        <p>This plan was generated based on your specific business requirements.</p>
        <p>Questions? Reply to this email or contact us at <a href="mailto:support@5qstrategy.com" style="color: #667eea;">support@5qstrategy.com</a></p>
        
        <div class="unsubscribe">
          <p>You received this email because you requested an AI business plan on 5qstrategy.com</p>
          <p>5Q Strategy, Business AI Solutions</p>
          <p><a href="mailto:jack@5qstrategy.com?subject=Unsubscribe">Unsubscribe</a> | <a href="mailto:support@5qstrategy.com">Contact Support</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
       5Q Strategy - Your AI Business Implementation Plan
       
       Hello ${firstName},
       
       Thank you for using our AI business planning service. Your customized implementation plan is ready for review.

BUSINESS PROFILE SUMMARY:
- Business Type: ${
    contextSummary?.businessType || userInfo?.businessType || "Not specified"
  }
- Key Challenges: ${
    contextSummary?.painPoints || userInfo?.painPoints || "Not specified"
  }
- Goals: ${contextSummary?.goals || userInfo?.goals || "Not specified"}

YOUR COMPLETE IMPLEMENTATION PLAN:
${businessPlan}

PDF ATTACHMENT:
A professional PDF version of your business plan is attached to this email for easy sharing with your team and stakeholders.

NEXT STEPS:
This plan was generated based on your specific business requirements. Our implementation team will contact you within 24 hours to discuss next steps and answer any questions.

CONTACT INFORMATION:
Questions? Reply to this email or contact us at support@5qstrategy.com

ABOUT 5Q STRATEGY:
We are AI Implementation Specialists helping businesses integrate artificial intelligence solutions for growth and efficiency.

You received this email because you requested an AI business plan on 5qstrategy.com

To unsubscribe or contact support: support@5qstrategy.com
5Q Strategy - Business AI Solutions
  `;

  return { html, text };
}

function generateLeadNotificationEmail(data: EmailData) {
  const { email, firstName, lastName, contextSummary, userInfo, chatMessages } =
    data;

  const chatSummary = generateChatSummary(chatMessages);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Lead - AI Business Plan</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
        .lead-info { background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .cta { background: #059669; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Lead Captured!</h1>
        <p>AI Business Plan Generator</p>
      </div>
      
             <div class="lead-info">
               <h2>Lead Information</h2>
               <p><strong>Name:</strong> ${firstName} ${lastName}</p>
               <p><strong>Email:</strong> ${email}</p>
        <p><strong>Business Type:</strong> ${
          contextSummary?.businessType ||
          userInfo?.businessType ||
          "Not specified"
        }</p>
        <p><strong>Pain Points:</strong> ${
          contextSummary?.painPoints || userInfo?.painPoints || "Not specified"
        }</p>
        <p><strong>Goals:</strong> ${
          contextSummary?.goals || userInfo?.goals || "Not specified"
        }</p>
        <p><strong>Data Available:</strong> ${
          contextSummary?.dataAvailable || "Not specified"
        }</p>
        <p><strong>Prior Tech Use:</strong> ${
          contextSummary?.priorTechUse || "Not specified"
        }</p>
        <p><strong>Growth Intent:</strong> ${
          contextSummary?.growthIntent || "Not specified"
        }</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="lead-info">
        <h2>Chat Conversation Summary</h2>
        <div style="background: white; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto; white-space: pre-wrap;">${chatSummary}</div>
      </div>
      
      <div style="text-align: center;">
        <p><strong>Business Plan PDF attached for review</strong></p>
        <a href="mailto:${email}" class="cta">Contact Lead</a>
      </div>
    </body>
    </html>
  `;

  const text = `
       New Lead Captured - AI Business Plan Generator
       
       Lead Information:
       - Name: ${firstName} ${lastName}
       - Email: ${email}
- Business Type: ${
    contextSummary?.businessType || userInfo?.businessType || "Not specified"
  }
- Pain Points: ${
    contextSummary?.painPoints || userInfo?.painPoints || "Not specified"
  }
- Goals: ${contextSummary?.goals || userInfo?.goals || "Not specified"}
- Data Available: ${contextSummary?.dataAvailable || "Not specified"}
- Prior Tech Use: ${contextSummary?.priorTechUse || "Not specified"}
- Growth Intent: ${contextSummary?.growthIntent || "Not specified"}
- Timestamp: ${new Date().toLocaleString()}

Chat Conversation Summary:
${chatSummary}

Business Plan PDF attached for review.

Contact: ${email}
  `;

  return { html, text };
}

export async function POST(req: NextRequest) {
  return withDatabaseIntegration(req, async (db) => {
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

      if (!email || !firstName || !lastName || !businessPlan) {
        return NextResponse.json(
          {
            error:
              "Email, first name, last name, and business plan are required",
          },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Validate business plan content length and structure
      if (!businessPlan || businessPlan.trim().length === 0) {
        return NextResponse.json(
          { error: "Business plan content is empty" },
          { status: 400 }
        );
      }

      console.log("Business plan length:", businessPlan.length, "characters");

      // Track email sending event
      await db.trackEvent("email", "plan_send_request", {
        email: email,
        firstName: firstName,
        lastName: lastName,
        planLength: businessPlan.length,
        hasContextSummary: !!contextSummary,
        hasUserInfo: !!userInfo,
        hasChatMessages: !!(chatMessages && chatMessages.length > 0),
      });

      const emailData: EmailData = {
        email,
        firstName,
        lastName,
        businessPlan,
        contextSummary,
        userInfo,
        chatMessages,
      };

      // Send business plan to user
      try {
        console.log("Generating user email...");
        const userEmail = generateBusinessPlanEmail(emailData);

        // Generate PDF attachment for user
        console.log("Generating PDF attachment for user...");
        const pdfContent = generateBusinessPlanPDF(businessPlan, email);
        const userAttachments = pdfContent
          ? [
              {
                filename: `business-plan-${firstName}-${lastName}-${
                  new Date().toISOString().split("T")[0]
                }.pdf`,
                content: pdfContent,
                type: "application/pdf",
              },
            ]
          : undefined;

        console.log("Sending business plan to user:", email);
        const userEmailResult = await sendEmail(
          email,
          "Your AI Implementation Plan - 5Q Strategy",
          userEmail.html,
          userEmail.text,
          userAttachments
        );
        console.log("User email sent successfully");

        // Log email event for user
        await db.logEmailEvent({
          toEmail: email,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: "Your AI Implementation Plan - 5Q Strategy",
          emailType: "business_plan",
          messageId: userEmailResult.id,
          status: "sent",
          provider: "resend",
        });
      } catch (error) {
        console.error("Failed to send user email:", error);

        // Log failed email event
        await db.logEmailEvent({
          toEmail: email,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: "Your AI Implementation Plan - 5Q Strategy",
          emailType: "business_plan",
          status: "failed",
          provider: "resend",
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        throw new Error(
          `Failed to send business plan to user: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      // Send lead notification to forward email
      try {
        console.log("Generating lead notification email...");
        const leadEmail = generateLeadNotificationEmail(emailData);

        // Generate PDF attachment
        console.log("Generating PDF attachment...");
        const pdfContent = generateBusinessPlanPDF(businessPlan, email);
        const attachments = pdfContent
          ? [
              {
                filename: `business-plan-${email.split("@")[0]}-${
                  new Date().toISOString().split("T")[0]
                }.pdf`,
                content: pdfContent,
                type: "application/pdf",
              },
            ]
          : undefined;

        console.log("Sending lead notification to:", FORWARD_EMAIL);
        const leadEmailResult = await sendEmail(
          FORWARD_EMAIL,
          `New Lead: ${email} - AI Business Plan`,
          leadEmail.html,
          leadEmail.text,
          attachments
        );
        console.log("Lead notification sent successfully");

        // Log email event for lead notification
        await db.logEmailEvent({
          toEmail: FORWARD_EMAIL,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: `New Lead: ${email} - AI Business Plan`,
          emailType: "lead_notification",
          messageId: leadEmailResult.id,
          status: "sent",
          provider: "resend",
        });
      } catch (error) {
        console.error("Failed to send lead notification:", error);

        // Log failed lead notification email event
        await db.logEmailEvent({
          toEmail: FORWARD_EMAIL,
          fromEmail: "5Q Strategy <jack@5qstrategy.com>",
          subject: `New Lead: ${email} - AI Business Plan`,
          emailType: "lead_notification",
          status: "failed",
          provider: "resend",
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        // Don't throw here - user email was successful, so we can continue
        console.log("Continuing despite lead notification failure");
      }

      console.log("Email sending process completed");

      // Track successful email completion
      await db.trackEvent("email", "plan_send_completed", {
        email: email,
        firstName: firstName,
        lastName: lastName,
        planLength: businessPlan.length,
      });

      return NextResponse.json({
        success: true,
        message: "Business plan sent successfully",
      });
    } catch (error) {
      console.error("Error sending business plan:", error);

      // Log system health for debugging
      await db.logSystemHealth({
        service: "send_plan_api",
        endpoint: "/api/send-plan",
        method: "POST",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: "api_error",
      });

      return NextResponse.json(
        {
          error: "Failed to send business plan",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  });
}
