import { type NextRequest, NextResponse } from "next/server"

const NVIDIA_API_KEY = "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"
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

interface ContextSummary {
  businessType: string
  painPoints: string
  goals: string
  dataAvailable: string
  priorTechUse: string
  growthIntent: string
}

async function callNvidiaAPI(messages: any[], systemPrompt: string) {
  const requestBody = {
    model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.6,
    top_p: 0.95,
    max_tokens: 2048,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
  }

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content
}

async function generateContextSummary(messages: any[]): Promise<ContextSummary | null> {
  try {
    const summaryPrompt = `Analyze the following business conversation and extract key information into a JSON object. Only include information that has been explicitly mentioned or can be clearly inferred from the conversation.

Return ONLY a valid JSON object with this exact structure:
{
  "businessType": "Brief description of the business type/industry",
  "painPoints": "Main challenges or problems mentioned",
  "goals": "Business goals or objectives discussed",
  "dataAvailable": "Any mention of data, analytics, or information systems",
  "priorTechUse": "Technology tools or systems currently used",
  "growthIntent": "Growth plans, scaling intentions, or expansion goals"
}

If information for a field is not available, use "Not yet specified" as the value.

Conversation to analyze:`

    const conversationText = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n")

    const summaryMessages = [
      {
        role: "user",
        content: `${summaryPrompt}\n\n${conversationText}`,
      },
    ]

    console.log("Generating context summary...")
    const summaryResponse = await callNvidiaAPI(
      summaryMessages,
      "You are a business analyst that extracts structured information from conversations. Return only valid JSON.",
    )

    if (!summaryResponse) {
      throw new Error("No summary response received")
    }

    // Try to parse the JSON response
    const jsonMatch = summaryResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    const parsedSummary = JSON.parse(jsonMatch[0])
    console.log("Parsed summary:", parsedSummary)

    return parsedSummary as ContextSummary
  } catch (error) {
    console.error("Error generating context summary:", error)
    return null
  }
}

async function generateBusinessPlan(messages: any[], contextSummary: ContextSummary | null): Promise<string> {
  try {
    console.log("Triggering business plan generation")

    const businessPlanPrompt = `Using the following JSON summary and user conversation, draft a comprehensive business plan in four parts: 

1. **Opportunity Summary** - Analyze the business situation, market position, and key opportunities
2. **AI Roadmap** - Specific AI/technology recommendations tailored to this business
3. **Estimated ROI & Cost** - Realistic investment estimates and expected returns
4. **Next 90-Day Action Items** - Concrete, actionable steps the business owner can take immediately

Make the plan readable and actionable for a non-technical SMB owner. Use clear headings, bullet points, and specific recommendations.

Context Summary:
${JSON.stringify(contextSummary, null, 2)}

Conversation History:
${messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n")}

Format the business plan in markdown with clear headings, bullet points, and sections. Be specific and actionable.`

    const businessPlanResponse = await callNvidiaAPI(
      [{ role: "user", content: businessPlanPrompt }],
      "You are an expert business consultant specializing in AI strategy for small and medium businesses. Create a practical, actionable business plan based on the conversation history. Use markdown formatting with clear sections and bullet points.",
    )

    if (!businessPlanResponse) {
      throw new Error("No business plan response received")
    }

    console.log("Business plan generated successfully, length:", businessPlanResponse.length)
    return businessPlanResponse
  } catch (error) {
    console.error("Error generating business plan:", error)

    // Enhanced fallback plan with retry CTA
    return `# 🚀 Your Business Plan

*Note: We encountered a technical issue generating your custom plan. Please try restarting the conversation for a fully personalized plan, or use this template as a starting point.*

## 1. 📊 Opportunity Summary

Based on our conversation, your business has several opportunities for growth and optimization:

- **Current Position**: Small to medium business looking to leverage technology for growth
- **Key Challenges**: Operational efficiency, customer engagement, and competitive positioning
- **Market Opportunity**: Significant potential for AI-driven improvements in your industry
- **Competitive Advantage**: Early adoption of AI tools can differentiate your business

## 2. 🤖 AI Roadmap

### Phase 1: Foundation (Months 1-3)
- **Customer Service**: Implement chatbots for basic customer inquiries
- **Data Collection**: Set up analytics to track customer behavior and business metrics
- **Process Automation**: Automate repetitive tasks like invoicing and scheduling

### Phase 2: Enhancement (Months 4-6)
- **Personalization**: Use AI for personalized customer recommendations
- **Predictive Analytics**: Forecast demand and optimize inventory
- **Marketing Automation**: AI-driven email campaigns and social media management

### Phase 3: Advanced Integration (Months 7-12)
- **Advanced Analytics**: Implement machine learning for business insights
- **Custom Solutions**: Develop AI tools specific to your industry needs
- **Competitive Intelligence**: Use AI to monitor market trends and competitors

## 3. 💰 Estimated ROI & Cost

### Initial Investment
- **Software & Tools**: $500 - $2,000/month
- **Training & Setup**: $2,000 - $5,000 one-time
- **Consulting**: $3,000 - $8,000 for implementation

### Expected Returns (12 months)
- **Efficiency Gains**: 20-30% reduction in manual tasks
- **Customer Satisfaction**: 15-25% improvement in response times
- **Revenue Growth**: 10-20% increase through better customer insights
- **Cost Savings**: $10,000 - $30,000 annually in operational costs

### Break-even Timeline: 6-9 months

## 4. 📋 Next 90-Day Action Items

### Week 1-2: Assessment & Planning
- [ ] Audit current business processes and identify automation opportunities
- [ ] Research AI tools specific to your industry
- [ ] Set up basic analytics (Google Analytics, social media insights)
- [ ] Create a budget for AI implementation

### Week 3-6: Quick Wins
- [ ] Implement a simple chatbot for your website
- [ ] Set up automated email marketing campaigns
- [ ] Use AI writing tools for content creation
- [ ] Implement basic CRM with automation features

### Week 7-12: Foundation Building
- [ ] Train team on new AI tools and processes
- [ ] Establish data collection and analysis routines
- [ ] Create standard operating procedures for AI-enhanced workflows
- [ ] Measure and document initial improvements

### Ongoing: Optimization
- [ ] Weekly review of AI tool performance
- [ ] Monthly assessment of ROI and adjustments
- [ ] Quarterly planning for next phase implementation
- [ ] Continuous learning about new AI opportunities

---

## 🔄 Need a Custom Plan?

This is a general template. For a fully personalized business plan based on your specific situation:

1. **Restart the conversation** and provide more detailed information about your business
2. **Contact our support team** for a detailed consultation
3. **Book a strategy session** with an AI business consultant

*Your success is our priority. Let's build something amazing together!*`
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, currentStep, initialContext } = await req.json()

    console.log(`Processing request - Step: ${currentStep}, Messages: ${messages.length}`)

    // ✅ Check if we need to generate a business plan (after step 5)
    const userMessages = messages.filter((msg: any) => msg.role === "user")
    const isBusinessPlanStep = currentStep === 5 && userMessages.length >= 5

    if (isBusinessPlanStep) {
      console.log("✅ Step 5 complete - triggering business plan generation...")
      console.log("Triggering business plan generation")

      try {
        // ✅ Generate or update the context summary
        const contextSummary = await generateContextSummary(messages)

        // ✅ Generate the business plan
        const businessPlanMarkdown = await generateBusinessPlan(messages, contextSummary || initialContext)

        console.log("✅ Business plan generation completed successfully")

        // ✅ Return both the context summary and business plan
        return NextResponse.json({
          message:
            "Thank you for sharing all that information! I've prepared a customized business plan based on our conversation. You can review it below, copy it, or download it for your records.",
          contextSummary: contextSummary,
          businessPlanMarkdown: businessPlanMarkdown,
          isBusinessPlan: true, // Flag to help frontend identify this response
        })
      } catch (planError) {
        console.error("❌ Business plan generation failed:", planError)

        // ✅ Fallback: Still return a business plan even if generation fails
        const fallbackPlan = `# 🚀 Your Business Plan

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
**Restart the conversation** to generate a fully personalized business plan, or contact our team for detailed consultation.`

        return NextResponse.json({
          message:
            "I've prepared a business plan template for you. For a fully customized plan, please restart the conversation with more specific details about your business.",
          contextSummary: null,
          businessPlanMarkdown: fallbackPlan,
          isBusinessPlan: true,
          fallback: true,
        })
      }
    }

    // Regular conversation flow (steps 1-4)
    const systemPrompt = `You are an AI assistant helping small and medium businesses (SMBs) through a 5-question discovery process. 

Current step: ${currentStep}/5

Your role:
- Ask insightful, open-ended questions that help SMBs identify their key challenges and opportunities
- Build upon previous responses to create a natural conversation flow
- Keep responses concise but engaging (2-3 sentences max)
- Focus on business strategy, operations, technology, marketing, and growth

Guidelines:
- Don't number your questions explicitly
- Make each question feel natural and conversational
- Adapt based on the business type and previous responses
- Be encouraging and supportive in tone
- Be understanding of the end user's lack of AI knowledge

${currentStep === 5 ? "This is the final question. After the user responds, we will generate their business plan." : ""}`

    console.log("Making request to NVIDIA API for conversation...")

    // Get the assistant response
    const aiMessage = await callNvidiaAPI(messages, systemPrompt)

    if (!aiMessage) {
      throw new Error("No response from NVIDIA API")
    }

    // Generate context summary after getting the response
    const updatedMessages = [...messages, { role: "assistant", content: aiMessage }]
    const contextSummary = await generateContextSummary(updatedMessages)

    return NextResponse.json({
      message: aiMessage,
      contextSummary: contextSummary,
    })
  } catch (error) {
    console.error("Chat API error:", error)

    // Fallback response for development/testing
    const fallbackResponses = [
      "Hello! I'm excited to help you discover key insights about your business. To get started, could you tell me a bit about what your business does and what industry you're in?",
      "That's interesting! Based on what you've shared, I'd love to understand more about your current challenges. What would you say is the biggest obstacle you're facing in growing your business right now?",
      "Thank you for sharing that insight. Now I'm curious about your customers - who is your ideal customer, and how do you currently reach them?",
      "Great perspective! Let's talk about your operations. What processes or systems in your business do you think could be improved or automated to save you time?",
      "Excellent insights! For my final question, if you could achieve one major goal for your business in the next 12 months, what would it be and why is it important to you?",
    ]

    const { currentStep } = await req.json()
    const fallbackMessage = fallbackResponses[Math.min(currentStep - 1, fallbackResponses.length - 1)]

    return NextResponse.json({
      message: fallbackMessage,
      fallback: true,
      contextSummary: null,
    })
  }
}
