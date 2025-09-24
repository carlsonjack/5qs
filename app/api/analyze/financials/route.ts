import { type NextRequest, NextResponse } from "next/server";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ||
  "https://integrate.api.nvidia.com/v1/chat/completions";

async function callNvidiaAPI(messages: any[], systemPrompt: string) {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not set");
  }

  const requestBody = {
    model: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.3,
    top_p: 0.95,
    max_tokens: 1024,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: false,
  };

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(arrayBuffer);

    // Simple PDF text extraction using basic parsing
    // This is a simplified approach that works for text-based PDFs
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const text = decoder.decode(uint8Array);

    // Look for text content between stream objects
    const textMatches = text.match(/stream\s*(.*?)\s*endstream/gs);
    let extractedText = "";

    if (textMatches) {
      for (const match of textMatches) {
        // Remove stream markers and try to extract readable text
        const content = match
          .replace(/^stream\s*/, "")
          .replace(/\s*endstream$/, "");

        // Look for text operators like Tj, TJ, etc.
        const textOperators = content.match(/$$(.*?)$$\s*Tj/g);
        if (textOperators) {
          for (const op of textOperators) {
            const textContent = op.match(/$$(.*?)$$/)?.[1];
            if (textContent) {
              extractedText += textContent + " ";
            }
          }
        }

        // Also look for simple text patterns
        const simpleText = content.match(/[A-Za-z0-9\s$%.,\-+$$$$]+/g);
        if (simpleText) {
          extractedText += simpleText.join(" ") + " ";
        }
      }
    }

    // If no text found with stream parsing, try alternative approach
    if (!extractedText.trim()) {
      // Look for text patterns in the entire PDF
      const allText = text.replace(/[^\x20-\x7E\n\r\t]/g, " "); // Keep only printable ASCII
      const words = allText.match(/[A-Za-z0-9$%.,\-+]+/g);
      if (words && words.length > 10) {
        extractedText = words.join(" ");
      }
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/[^\w\s$%.,\-+$$$$]/g, " ") // Keep only alphanumeric and common financial symbols
      .trim();

    if (extractedText.length < 50) {
      throw new Error("Insufficient text content extracted from PDF");
    }

    return extractedText;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error(
      "Unable to extract text from PDF. Please try converting to TXT or CSV format."
    );
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      console.log("Processing PDF file...");
      const arrayBuffer = await file.arrayBuffer();
      return await extractTextFromPDF(arrayBuffer);
    } else if (fileType === "text/csv" || fileName.endsWith(".csv")) {
      console.log("Processing CSV file...");
      const text = await file.text();
      if (!text.trim()) {
        throw new Error("CSV file appears to be empty");
      }
      return text;
    } else if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      console.log("Processing TXT file...");
      const text = await file.text();
      if (!text.trim()) {
        throw new Error("TXT file appears to be empty");
      }
      return text;
    } else {
      throw new Error(
        `Unsupported file type: ${fileType}. Please upload PDF, CSV, or TXT files.`
      );
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(
      "Processing file:",
      file.name,
      "Type:",
      file.type,
      "Size:",
      file.size
    );

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "text/csv", "text/plain"];
    const allowedExtensions = [".pdf", ".csv", ".txt"];
    const fileName = file.name.toLowerCase();

    const isValidType =
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidType) {
      return NextResponse.json(
        {
          error: "Invalid file type. Please upload a PDF, CSV, or TXT file.",
        },
        { status: 400 }
      );
    }

    // Extract text from the uploaded file
    const extractedText = await extractTextFromFile(file);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text content could be extracted from the file");
    }

    console.log("Extracted text length:", extractedText.length);
    console.log("First 200 characters:", extractedText.substring(0, 200));

    // Limit text length to avoid token limits (keep first 4000 characters)
    const limitedText = extractedText.substring(0, 4000);

    // Send to NVIDIA NIM for analysis
    const systemPrompt =
      "Given the following financial statement text, extract key business insights in JSON form: revenue trend, largest cost centers, profit margins, seasonality, cash flow risks. Return only valid JSON with these exact keys: businessType, revenueTrend, largestCostCenters, profitMargins, seasonality, cashFlowRisks.";

    const analysisResponse = await callNvidiaAPI(
      [
        {
          role: "user",
          content: `Financial data to analyze:\n\n${limitedText}`,
        },
      ],
      systemPrompt
    );

    if (!analysisResponse) {
      throw new Error("No analysis response received from NVIDIA");
    }

    let analysisResult;

    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in NVIDIA response");
      }

      // Ensure all required fields are present
      const requiredFields = [
        "businessType",
        "revenueTrend",
        "largestCostCenters",
        "profitMargins",
        "seasonality",
        "cashFlowRisks",
      ];
      for (const field of requiredFields) {
        if (!analysisResult[field]) {
          analysisResult[field] = "Unable to determine from provided data";
        }
      }
    } catch (parseError) {
      console.error("Error parsing NVIDIA response:", parseError);
      console.log("Raw NVIDIA response:", analysisResponse);

      // Fallback: create structured response based on extracted text analysis
      const hasRevenue = /revenue|sales|income/i.test(extractedText);
      const hasCosts = /cost|expense|expenditure/i.test(extractedText);
      const hasNumbers = /\$[\d,]+|\d+%|\d+\.\d+/g.test(extractedText);

      analysisResult = {
        businessType: hasNumbers
          ? "Small to Medium Business"
          : "Business Entity",
        revenueTrend: hasRevenue
          ? "Revenue data present in document"
          : "Revenue information not clearly identified",
        largestCostCenters: hasCosts
          ? "Cost information found in document"
          : "Cost breakdown not clearly visible",
        profitMargins: hasNumbers
          ? "Financial metrics present"
          : "Profit margin data not clearly identifiable",
        seasonality: "Seasonal patterns require time-series data analysis",
        cashFlowRisks: hasNumbers
          ? "Financial data available for assessment"
          : "Cash flow analysis requires more detailed data",
        extractedTextSample: extractedText.substring(0, 200) + "...", // Include sample for debugging
      };
    }

    console.log("Financial analysis result:", analysisResult);

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("Error processing financial data:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to process financial data",
        details: errorMessage,
        // Provide fallback data so the frontend doesn't break
        businessType: "Small Business",
        revenueTrend: "Analysis unavailable - " + errorMessage,
        largestCostCenters: "Unable to determine",
        profitMargins: "Data not available",
        seasonality: "Analysis incomplete",
        cashFlowRisks: "Requires manual review",
      },
      { status: 500 }
    );
  }
}
