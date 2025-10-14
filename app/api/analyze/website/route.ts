import { type NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/nim/client";
import {
  chunkText,
  embedDocuments,
  cacheDomain,
  getCachedDomain,
  getDocsByIds,
} from "@/lib/rag/index";
import { filterOutput } from "@/lib/safety";
import { withDatabaseIntegration } from "@/lib/db/integration";

async function fetchWebsiteContent(url: string) {
  try {
    // Use Microlink API to fetch website content with additional parameters
    const microlinkUrl = new URL("https://api.microlink.io");
    microlinkUrl.searchParams.set("url", url);
    microlinkUrl.searchParams.set("meta", "false");
    microlinkUrl.searchParams.set("audio", "false");
    microlinkUrl.searchParams.set("video", "false");
    microlinkUrl.searchParams.set("iframe", "false");
    microlinkUrl.searchParams.set("screenshot", "false");
    microlinkUrl.searchParams.set("pdf", "false");

    console.log("Fetching website content from:", microlinkUrl.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(microlinkUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "AI-5-Questions-SMB/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Microlink API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    console.log("Microlink response status:", data.status);
    console.log("Microlink data keys:", Object.keys(data.data || {}));

    if (data.status !== "success") {
      throw new Error(
        `Microlink failed to fetch content: ${
          data.message || data.error || "Unknown error"
        }`
      );
    }

    // Try multiple ways to extract text content from Microlink response
    let textContent = "";

    // Method 1: Try content.text (main content)
    if (data.data?.content?.text) {
      textContent = data.data.content.text;
      console.log("Found content.text, length:", textContent.length);
    }

    // Method 2: Try description (meta description)
    if (!textContent && data.data?.description) {
      textContent = data.data.description;
      console.log("Using description, length:", textContent.length);
    }

    // Method 3: Try title + description combination
    if (!textContent && data.data?.title) {
      textContent = data.data.title;
      if (data.data.description) {
        textContent += ". " + data.data.description;
      }
      console.log("Using title + description, length:", textContent.length);
    }

    // Method 4: Try to extract from HTML if available
    if (!textContent && data.data?.html) {
      // Simple HTML text extraction (remove tags)
      const htmlContent = data.data.html;
      textContent = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove styles
        .replace(/<[^>]*>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      console.log("Extracted from HTML, length:", textContent.length);
    }

    // Method 5: Fallback to any available text data
    if (!textContent) {
      const availableFields = [];
      if (data.data?.title) availableFields.push(`Title: ${data.data.title}`);
      if (data.data?.description)
        availableFields.push(`Description: ${data.data.description}`);
      if (data.data?.author)
        availableFields.push(`Author: ${data.data.author}`);
      if (data.data?.publisher)
        availableFields.push(`Publisher: ${data.data.publisher}`);

      if (availableFields.length > 0) {
        textContent = availableFields.join(". ");
        console.log("Using available fields, length:", textContent.length);
      }
    }

    // Final validation
    if (!textContent || textContent.trim().length < 20) {
      // If still no content, try a direct fetch as fallback
      console.log("Microlink extraction failed, trying direct fetch...");
      return await fetchWebsiteDirectly(url);
    }

    // Limit text length to avoid token limits (keep first 3000 characters)
    const limitedText = textContent.substring(0, 3000);
    console.log("Final extracted text length:", limitedText.length);

    return limitedText;
  } catch (error) {
    console.error("Error with Microlink API:", error);
    // Fallback to direct fetch
    console.log("Falling back to direct fetch...");
    return await fetchWebsiteDirectly(url);
  }
}

async function fetchWebsiteDirectly(url: string): Promise<string> {
  try {
    console.log("Attempting direct fetch of:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Direct fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Extract text from HTML
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove styles
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "") // Remove navigation
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "") // Remove header
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "") // Remove footer
      .replace(/<[^>]*>/g, " ") // Remove remaining HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    if (textContent.length < 50) {
      throw new Error("Insufficient content extracted from direct fetch");
    }

    console.log("Direct fetch successful, text length:", textContent.length);
    return textContent.substring(0, 3000);
  } catch (error) {
    console.error("Direct fetch also failed:", error);
    throw new Error(
      "Unable to extract content from website. The site may be protected or inaccessible."
    );
  }
}

export async function POST(req: NextRequest) {
  return withDatabaseIntegration(req, async (db) => {
    let url: string = "";
    try {
      const body = await req.json();
      url = body.url;

      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      // Validate URL format
      let validatedUrl: URL;
      try {
        validatedUrl = new URL(url);
        // Ensure it's HTTP or HTTPS
        if (!["http:", "https:"].includes(validatedUrl.protocol)) {
          throw new Error("Only HTTP and HTTPS URLs are supported");
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format. Please include http:// or https://" },
          { status: 400 }
        );
      }

      // Track website analysis request
      await db.trackEvent("website_analysis", "analysis_request", {
        url: validatedUrl.toString(),
        domain: validatedUrl.hostname,
      });

      console.log("Analyzing website:", validatedUrl.toString());

      // Fetch actual website content
      const websiteContent = await fetchWebsiteContent(validatedUrl.toString());

      if (!websiteContent || websiteContent.trim().length < 20) {
        throw new Error(
          "No meaningful content could be extracted from the website"
        );
      }

      console.log(
        "Successfully extracted content, length:",
        websiteContent.length
      );

      // Ingest into RAG (chunk + embed) and cache by domain
      // This is optional - website analysis will work even if RAG fails
      try {
        const domain = validatedUrl.hostname;
        const existing = getCachedDomain(domain);
        if (!existing) {
          const chunks = chunkText(websiteContent, 1000, 150);
          const docIds: string[] = [];
          await embedDocuments(
            chunks.map((c, idx) => ({
              id: `${domain}#${idx}`,
              text: c.text,
              meta: { url: validatedUrl.toString(), chunk: idx },
            }))
          );
          for (let i = 0; i < chunks.length; i++) docIds.push(`${domain}#${i}`);
          cacheDomain(domain, docIds);
          console.log(`✅ RAG ingestion successful for ${domain}`);
        } else {
          console.log(`✅ Using cached RAG data for ${domain}`);
        }
      } catch (ingestErr) {
        console.warn(
          "⚠️ RAG ingest failed (website) - continuing with analysis:",
          ingestErr instanceof Error ? ingestErr.message : String(ingestErr)
        );
        // Don't throw - let the website analysis continue
      }

      // Send to NIM for deterministic JSON using guided_json
      const systemPrompt =
        "You are a business analyst. Analyze the following website content and extract key business data. Return only JSON.";

      const guidedSchema = {
        type: "object",
        properties: {
          productsServices: { type: "string" },
          customerSegment: { type: "string" },
          techStack: { type: "string" },
          marketingStrengths: { type: "string" },
          marketingWeaknesses: { type: "string" },
        },
        required: [
          "productsServices",
          "customerSegment",
          "techStack",
          "marketingStrengths",
          "marketingWeaknesses",
        ],
        additionalProperties: false,
      } as const;

      let analysisResponse: string | null = null;
      try {
        console.log("Using NIM guided_json for website analysis...");
        const res = await chatCompletion({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Website content to analyze:\n\n${websiteContent}`,
            },
          ],
          model:
            process.env.LLM_DEFAULT_MODEL ||
            "nvidia/llama-3.1-nemotron-70b-instruct",
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 400,
          nvext: { guided_json: guidedSchema as any },
        });
        analysisResponse = res.content;
      } catch (nimError) {
        console.error("NIM guided_json failed:", nimError);
        analysisResponse = null;
      }

      if (!analysisResponse) {
        console.log("NVIDIA API failed, using enhanced fallback analysis");

        // Generic fallback analysis that works for any business
        const content = websiteContent.toLowerCase();

        // Generic business type detection
        let businessType = "Business website";
        if (content.includes("service") || content.includes("consulting")) {
          businessType = "Service-based business";
        } else if (
          content.includes("product") ||
          content.includes("shop") ||
          content.includes("buy")
        ) {
          businessType = "Product-based business";
        } else if (
          content.includes("software") ||
          content.includes("app") ||
          content.includes("technology")
        ) {
          businessType = "Technology business";
        }

        // Generic customer segment
        let customerSegment = "General audience";
        if (
          content.includes("business") ||
          content.includes("enterprise") ||
          content.includes("company")
        ) {
          customerSegment = "Business customers";
        } else if (
          content.includes("individual") ||
          content.includes("personal") ||
          content.includes("home")
        ) {
          customerSegment = "Individual consumers";
        }

        // Generic tech stack
        let techStack = "Standard web presence";
        if (content.includes("app") || content.includes("mobile")) {
          techStack = "Web and mobile platform";
        } else if (content.includes("online") || content.includes("digital")) {
          techStack = "Digital platform";
        }

        // Generic marketing strengths
        let marketingStrengths = "Professional website presence";
        if (
          content.includes("award") ||
          content.includes("certified") ||
          content.includes("trusted")
        ) {
          marketingStrengths = "Credibility and trust indicators";
        } else if (
          content.includes("review") ||
          content.includes("testimonial") ||
          content.includes("rating")
        ) {
          marketingStrengths = "Customer feedback and social proof";
        } else if (
          content.includes("experience") ||
          content.includes("expertise") ||
          content.includes("specialist")
        ) {
          marketingStrengths = "Industry expertise and experience";
        }

        // Generic weaknesses
        let marketingWeaknesses =
          "Limited analysis available from website content";
        if (!content.includes("contact") && !content.includes("about")) {
          marketingWeaknesses = "Limited contact and company information";
        } else if (
          !content.includes("pricing") &&
          !content.includes("cost") &&
          !content.includes("quote")
        ) {
          marketingWeaknesses = "Pricing information not readily available";
        }

        // Generate screenshot URL using a free service that doesn't require API key
        const screenshotUrl = `https://mini.s-shot.ru/1280x720/PNG/1280/Z100/?${encodeURIComponent(
          url
        )}`;

        const fallbackResult = {
          productsServices: businessType,
          customerSegment: customerSegment,
          techStack: techStack,
          marketingStrengths: marketingStrengths,
          marketingWeaknesses: marketingWeaknesses,
          contentSample: websiteContent.substring(0, 200) + "...",
          screenshotUrl: screenshotUrl,
          fallback: true,
        };

        // Save fallback analysis to database
        await db.saveWebsiteAnalysis({
          url: validatedUrl.toString(),
          domain: validatedUrl.hostname,
          title: validatedUrl.hostname,
          description: businessType,
          productsServices: businessType,
          customerSegment: customerSegment,
          techStack: techStack,
          marketingStrengths: marketingStrengths,
          marketingWeaknesses: marketingWeaknesses,
          contentSample: websiteContent.substring(0, 200) + "...",
          analysisMethod: "fallback",
          processingTime: Date.now(),
          confidence: 0.3,
        });

        return NextResponse.json(fallbackResult);
      }

      let analysisResult;

      try {
        analysisResult = JSON.parse(analysisResponse);
        const requiredFields = [
          "productsServices",
          "customerSegment",
          "techStack",
          "marketingStrengths",
          "marketingWeaknesses",
        ];
        for (const field of requiredFields) {
          if (!analysisResult[field]) {
            analysisResult[field] = "Unable to determine from website content";
          }
        }

        // Add screenshot URL to the main analysis result
        const screenshotUrl = `https://mini.s-shot.ru/1280x720/PNG/1280/Z100/?${encodeURIComponent(
          url
        )}`;
        analysisResult.screenshotUrl = screenshotUrl;
      } catch (parseError) {
        console.error("Error parsing NVIDIA response:", parseError);
        console.log("Raw NVIDIA response:", analysisResponse);

        // Fallback: create structured response based on content analysis
        const hasProducts = /product|service|solution|offer/i.test(
          websiteContent
        );
        const hasContact = /contact|about|team|company/i.test(websiteContent);
        const hasTech = /api|integration|software|platform|technology/i.test(
          websiteContent
        );

        // Generate screenshot URL using a free service that doesn't require API key
        const screenshotUrl = `https://mini.s-shot.ru/1280x720/PNG/1280/Z100/?${encodeURIComponent(
          url
        )}`;

        analysisResult = {
          productsServices: hasProducts
            ? "Products/services mentioned on website"
            : "Business offerings not clearly specified",
          customerSegment: hasContact
            ? "Professional business audience"
            : "General audience",
          techStack: hasTech
            ? "Technology-focused business"
            : "Standard web presence",
          // Do not treat these as user-declared pain points or goals
          marketingStrengths: "Professional website presence",
          marketingWeaknesses: "Limited detailed analysis available",
          contentSample: websiteContent.substring(0, 200) + "...", // Include sample for debugging
          screenshotUrl: screenshotUrl,
        };
      }

      console.log("Website analysis result:", analysisResult);

      // Save successful analysis to database
      await db.saveWebsiteAnalysis({
        url: validatedUrl.toString(),
        domain: validatedUrl.hostname,
        title: analysisResult.productsServices || validatedUrl.hostname,
        description: analysisResult.customerSegment || "Website analysis",
        productsServices: analysisResult.productsServices,
        customerSegment: analysisResult.customerSegment,
        techStack: analysisResult.techStack,
        marketingStrengths: analysisResult.marketingStrengths,
        marketingWeaknesses: analysisResult.marketingWeaknesses,
        contentSample:
          analysisResult.contentSample ||
          websiteContent.substring(0, 200) + "...",
        analysisMethod: "nvidia_api",
        processingTime: Date.now(),
        confidence: 0.8,
      });

      // Track successful analysis completion
      await db.trackEvent("website_analysis", "analysis_completed", {
        url: validatedUrl.toString(),
        domain: validatedUrl.hostname,
        analysisMethod: "nvidia_api",
        contentLength: websiteContent.length,
      });

      const safe = { ...analysisResult };
      // Light output filtering
      for (const k of Object.keys(safe)) {
        if (typeof (safe as any)[k] === "string") {
          (safe as any)[k] = filterOutput((safe as any)[k]).text;
        }
      }
      return NextResponse.json(safe);
    } catch (error) {
      console.error("Error analyzing website:", error);

      // Log system health for debugging
      await db.logSystemHealth({
        service: "website_analysis_api",
        endpoint: "/api/analyze/website",
        method: "POST",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: "api_error",
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Generate screenshot URL even for error cases
      const screenshotUrl = `https://mini.s-shot.ru/1280x720/PNG/1280/Z100/?${encodeURIComponent(
        url
      )}`;

      return NextResponse.json(
        {
          error: "Failed to analyze website",
          details: errorMessage,
          // Provide fallback data so the frontend doesn't break
          productsServices: "Website analysis unavailable",
          customerSegment: "Unable to determine",
          techStack: "Standard web technologies",
          marketingStrengths: "Professional web presence",
          marketingWeaknesses: "Analysis could not be completed",
          screenshotUrl: screenshotUrl,
          fallback: true,
        },
        { status: 200 } // Return 200 instead of 500 to prevent frontend errors
      );
    }
  });
}
