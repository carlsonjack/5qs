import { type NextRequest, NextResponse } from "next/server"

const NVIDIA_API_KEY = "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"
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

async function callNvidiaAPI(messages: any[], systemPrompt: string) {
  const requestBody = {
    model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.3,
    top_p: 0.95,
    max_tokens: 1024,
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

async function fetchWebsiteContent(url: string) {
  try {
    // Use Microlink API to fetch website content with additional parameters
    const microlinkUrl = new URL("https://api.microlink.io")
    microlinkUrl.searchParams.set("url", url)
    microlinkUrl.searchParams.set("meta", "false")
    microlinkUrl.searchParams.set("audio", "false")
    microlinkUrl.searchParams.set("video", "false")
    microlinkUrl.searchParams.set("iframe", "false")
    microlinkUrl.searchParams.set("screenshot", "false")
    microlinkUrl.searchParams.set("pdf", "false")

    console.log("Fetching website content from:", microlinkUrl.toString())

    const response = await fetch(microlinkUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "AI-5-Questions-SMB/1.0",
      },
      timeout: 15000, // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`Microlink API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    console.log("Microlink response status:", data.status)
    console.log("Microlink data keys:", Object.keys(data.data || {}))

    if (data.status !== "success") {
      throw new Error(`Microlink failed to fetch content: ${data.message || data.error || "Unknown error"}`)
    }

    // Try multiple ways to extract text content from Microlink response
    let textContent = ""

    // Method 1: Try content.text (main content)
    if (data.data?.content?.text) {
      textContent = data.data.content.text
      console.log("Found content.text, length:", textContent.length)
    }

    // Method 2: Try description (meta description)
    if (!textContent && data.data?.description) {
      textContent = data.data.description
      console.log("Using description, length:", textContent.length)
    }

    // Method 3: Try title + description combination
    if (!textContent && data.data?.title) {
      textContent = data.data.title
      if (data.data.description) {
        textContent += ". " + data.data.description
      }
      console.log("Using title + description, length:", textContent.length)
    }

    // Method 4: Try to extract from HTML if available
    if (!textContent && data.data?.html) {
      // Simple HTML text extraction (remove tags)
      const htmlContent = data.data.html
      textContent = htmlContent
        .replace(/<script[^>]*>.*?<\/script>/gis, "") // Remove scripts
        .replace(/<style[^>]*>.*?<\/style>/gis, "") // Remove styles
        .replace(/<[^>]*>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
      console.log("Extracted from HTML, length:", textContent.length)
    }

    // Method 5: Fallback to any available text data
    if (!textContent) {
      const availableFields = []
      if (data.data?.title) availableFields.push(`Title: ${data.data.title}`)
      if (data.data?.description) availableFields.push(`Description: ${data.data.description}`)
      if (data.data?.author) availableFields.push(`Author: ${data.data.author}`)
      if (data.data?.publisher) availableFields.push(`Publisher: ${data.data.publisher}`)

      if (availableFields.length > 0) {
        textContent = availableFields.join(". ")
        console.log("Using available fields, length:", textContent.length)
      }
    }

    // Final validation
    if (!textContent || textContent.trim().length < 20) {
      // If still no content, try a direct fetch as fallback
      console.log("Microlink extraction failed, trying direct fetch...")
      return await fetchWebsiteDirectly(url)
    }

    // Limit text length to avoid token limits (keep first 3000 characters)
    const limitedText = textContent.substring(0, 3000)
    console.log("Final extracted text length:", limitedText.length)

    return limitedText
  } catch (error) {
    console.error("Error with Microlink API:", error)
    // Fallback to direct fetch
    console.log("Falling back to direct fetch...")
    return await fetchWebsiteDirectly(url)
  }
}

async function fetchWebsiteDirectly(url: string): Promise<string> {
  try {
    console.log("Attempting direct fetch of:", url)

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 10000, // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()

    // Extract text from HTML
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gis, "") // Remove scripts
      .replace(/<style[^>]*>.*?<\/style>/gis, "") // Remove styles
      .replace(/<nav[^>]*>.*?<\/nav>/gis, "") // Remove navigation
      .replace(/<header[^>]*>.*?<\/header>/gis, "") // Remove header
      .replace(/<footer[^>]*>.*?<\/footer>/gis, "") // Remove footer
      .replace(/<[^>]*>/g, " ") // Remove remaining HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()

    if (textContent.length < 50) {
      throw new Error("Insufficient content extracted from direct fetch")
    }

    console.log("Direct fetch successful, text length:", textContent.length)
    return textContent.substring(0, 3000)
  } catch (error) {
    console.error("Direct fetch also failed:", error)
    throw new Error("Unable to extract content from website. The site may be protected or inaccessible.")
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    let validatedUrl: URL
    try {
      validatedUrl = new URL(url)
      // Ensure it's HTTP or HTTPS
      if (!["http:", "https:"].includes(validatedUrl.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported")
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format. Please include http:// or https://" }, { status: 400 })
    }

    console.log("Analyzing website:", validatedUrl.toString())

    // Fetch actual website content
    const websiteContent = await fetchWebsiteContent(validatedUrl.toString())

    if (!websiteContent || websiteContent.trim().length < 20) {
      throw new Error("No meaningful content could be extracted from the website")
    }

    console.log("Successfully extracted content, length:", websiteContent.length)

    // Send to NVIDIA NIM for analysis
    const systemPrompt =
      "Analyze the following website content and extract key business data in JSON form with these exact keys: productsServices, customerSegment, techStack, marketingStrengths, marketingWeaknesses. What products/services are offered? What customer segment is targeted? What tech or integrations are visible? Any marketing strengths or weaknesses? Return only valid JSON."

    const analysisResponse = await callNvidiaAPI(
      [{ role: "user", content: `Website content to analyze:\n\n${websiteContent}` }],
      systemPrompt,
    )

    if (!analysisResponse) {
      throw new Error("No analysis response received from NVIDIA")
    }

    let analysisResult

    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in NVIDIA response")
      }

      // Ensure all required fields are present
      const requiredFields = [
        "productsServices",
        "customerSegment",
        "techStack",
        "marketingStrengths",
        "marketingWeaknesses",
      ]
      for (const field of requiredFields) {
        if (!analysisResult[field]) {
          analysisResult[field] = "Unable to determine from website content"
        }
      }
    } catch (parseError) {
      console.error("Error parsing NVIDIA response:", parseError)
      console.log("Raw NVIDIA response:", analysisResponse)

      // Fallback: create structured response based on content analysis
      const hasProducts = /product|service|solution|offer/i.test(websiteContent)
      const hasContact = /contact|about|team|company/i.test(websiteContent)
      const hasTech = /api|integration|software|platform|technology/i.test(websiteContent)

      analysisResult = {
        productsServices: hasProducts
          ? "Products/services mentioned on website"
          : "Business offerings not clearly specified",
        customerSegment: hasContact ? "Professional business audience" : "General audience",
        techStack: hasTech ? "Technology-focused business" : "Standard web presence",
        marketingStrengths: "Professional website presence",
        marketingWeaknesses: "Limited detailed analysis available",
        contentSample: websiteContent.substring(0, 200) + "...", // Include sample for debugging
      }
    }

    console.log("Website analysis result:", analysisResult)

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("Error analyzing website:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

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
      },
      { status: 500 },
    )
  }
}
