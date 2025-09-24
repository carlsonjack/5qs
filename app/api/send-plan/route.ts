import { type NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FORWARD_EMAIL = "carlsonjack455@gmail.com";

interface EmailData {
  email: string;
  businessPlan: string;
  contextSummary: any;
  userInfo?: {
    businessType?: string;
    painPoints?: string;
    goals?: string;
  };
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set, would send email:", { to, subject });
    return { success: true, id: "mock-email-id" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AI Business Plan <noreply@yourdomain.com>",
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email sending failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

function generateBusinessPlanEmail(data: EmailData) {
  const { businessPlan, contextSummary, userInfo } = data;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your AI Business Plan</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .plan-content { white-space: pre-wrap; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        .cta { background: #4f46e5; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin: 20px 0; }
        .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚀 Your AI Business Plan is Ready!</h1>
        <p>Customized AI implementation roadmap for your business</p>
      </div>
      
      <div class="content">
        <div class="highlight">
          <h3>📋 Your Business Profile</h3>
          <p><strong>Business Type:</strong> ${contextSummary?.businessType || userInfo?.businessType || "Not specified"}</p>
          <p><strong>Key Challenges:</strong> ${contextSummary?.painPoints || userInfo?.painPoints || "Not specified"}</p>
          <p><strong>Goals:</strong> ${contextSummary?.goals || userInfo?.goals || "Not specified"}</p>
        </div>
        
        <h2>📊 Your Complete AI Business Plan</h2>
        <div class="plan-content">${businessPlan}</div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" class="cta">Download PDF Version</a>
        </div>
      </div>
      
      <div class="footer">
        <p>This plan was generated based on your specific business needs and goals.</p>
        <p>Our AI implementation partners will contact you within 24 hours to discuss next steps.</p>
        <p>Questions? Reply to this email or contact us at support@yourdomain.com</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Your AI Business Plan is Ready!

Business Profile:
- Business Type: ${contextSummary?.businessType || userInfo?.businessType || "Not specified"}
- Key Challenges: ${contextSummary?.painPoints || userInfo?.painPoints || "Not specified"}
- Goals: ${contextSummary?.goals || userInfo?.goals || "Not specified"}

Your Complete AI Business Plan:
${businessPlan}

This plan was generated based on your specific business needs and goals.
Our AI implementation partners will contact you within 24 hours to discuss next steps.

Questions? Reply to this email or contact us at support@yourdomain.com
  `;

  return { html, text };
}

function generateLeadNotificationEmail(data: EmailData) {
  const { email, contextSummary, userInfo } = data;
  
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
        <h1>🎯 New Lead Captured!</h1>
        <p>AI Business Plan Generator</p>
      </div>
      
      <div class="lead-info">
        <h2>Lead Information</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Business Type:</strong> ${contextSummary?.businessType || userInfo?.businessType || "Not specified"}</p>
        <p><strong>Pain Points:</strong> ${contextSummary?.painPoints || userInfo?.painPoints || "Not specified"}</p>
        <p><strong>Goals:</strong> ${contextSummary?.goals || userInfo?.goals || "Not specified"}</p>
        <p><strong>Data Available:</strong> ${contextSummary?.dataAvailable || "Not specified"}</p>
        <p><strong>Prior Tech Use:</strong> ${contextSummary?.priorTechUse || "Not specified"}</p>
        <p><strong>Growth Intent:</strong> ${contextSummary?.growthIntent || "Not specified"}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="mailto:${email}" class="cta">Contact Lead</a>
      </div>
    </body>
    </html>
  `;

  const text = `
New Lead Captured - AI Business Plan Generator

Lead Information:
- Email: ${email}
- Business Type: ${contextSummary?.businessType || userInfo?.businessType || "Not specified"}
- Pain Points: ${contextSummary?.painPoints || userInfo?.painPoints || "Not specified"}
- Goals: ${contextSummary?.goals || userInfo?.goals || "Not specified"}
- Data Available: ${contextSummary?.dataAvailable || "Not specified"}
- Prior Tech Use: ${contextSummary?.priorTechUse || "Not specified"}
- Growth Intent: ${contextSummary?.growthIntent || "Not specified"}
- Timestamp: ${new Date().toLocaleString()}

Contact: ${email}
  `;

  return { html, text };
}

export async function POST(req: NextRequest) {
  try {
    const { email, businessPlan, contextSummary, userInfo } = await req.json();

    if (!email || !businessPlan) {
      return NextResponse.json(
        { error: "Email and business plan are required" },
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

    const emailData: EmailData = {
      email,
      businessPlan,
      contextSummary,
      userInfo,
    };

    // Send business plan to user
    const userEmail = generateBusinessPlanEmail(emailData);
    await sendEmail(
      email,
      "🚀 Your AI Business Plan is Ready!",
      userEmail.html,
      userEmail.text
    );

    // Send lead notification to forward email
    const leadEmail = generateLeadNotificationEmail(emailData);
    await sendEmail(
      FORWARD_EMAIL,
      `🎯 New Lead: ${email} - AI Business Plan`,
      leadEmail.html,
      leadEmail.text
    );

    return NextResponse.json({
      success: true,
      message: "Business plan sent successfully",
    });
  } catch (error) {
    console.error("Error sending business plan:", error);
    
    return NextResponse.json(
      {
        error: "Failed to send business plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
