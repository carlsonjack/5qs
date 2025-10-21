/*
  NVIDIA NIM client with typed helpers, retry/backoff, and guided_json support.
*/

// Simple metrics logger
function logMetrics(
  phase: string,
  model: string,
  latencyMs: number,
  tokensIn?: number,
  tokensOut?: number,
  success = true
) {
  console.log(
    `[METRICS] ${phase}: model=${model}, latency=${latencyMs}ms, tokens_in=${
      tokensIn || 0
    }, tokens_out=${tokensOut || 0}, success=${success}`
  );
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "context";
  content: string;
};

export interface ChatCompletionParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  nvext?: {
    guided_json?: Record<string, unknown>;
  };
  timeoutMs?: number; // Optional timeout in milliseconds
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  requestId?: string;
  status?: number;
  headers?: Record<string, string>;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
}

export interface EmbeddingsParams {
  input: string | string[];
  model: string;
}

export interface EmbeddingsResult {
  embeddings: number[][];
  model: string;
  requestId?: string;
}

export interface RerankParams {
  query: string;
  documents: Array<{ id: string; text: string }>;
  model: string;
  top_n?: number;
}

export interface RerankResult {
  ranked: Array<{ id: string; text: string; score: number }>;
  model: string;
  requestId?: string;
}

export interface TTSParams {
  text: string;
  model?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResult {
  audio: ArrayBuffer;
  model: string;
  requestId?: string;
}

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const CHAT_URL =
  process.env.NVIDIA_API_URL ||
  "https://integrate.api.nvidia.com/v1/chat/completions";
const EMBED_URL =
  process.env.NVIDIA_EMBEDDINGS_URL ||
  "https://integrate.api.nvidia.com/v1/embeddings";
const RERANK_URL =
  process.env.NVIDIA_RERANK_URL || "https://integrate.api.nvidia.com/v1/rerank";
const TTS_URL =
  process.env.NVIDIA_TTS_URL ||
  "https://integrate.api.nvidia.com/v1/audio/speech";

if (!NVIDIA_API_KEY) {
  // In serverless environments we still allow initialization; calls will fail fast.
  console.warn(
    "NVIDIA_API_KEY is not set. NIM client calls will fail until configured."
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(baseMs: number) {
  const jitterMs = Math.floor(Math.random() * 100);
  return baseMs + jitterMs;
}

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/(sk-[a-zA-Z0-9_\-]+)/g, "[redacted]");
  }
  return value;
}

async function doFetch(
  url: string,
  init: RequestInit,
  maxRetries = 2,
  timeoutMs = 30000
): Promise<{ res: Response; requestId?: string; startedAt: number }> {
  let attempt = 0;
  let lastError: any = null;
  const startedAt = Date.now();

  while (attempt <= maxRetries) {
    try {
      // Add timeout to prevent extremely long waits
      // 30s for Q&A, 90s for business plan generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      const requestId = res.headers.get("x-request-id") || undefined;
      if (
        res.status === 429 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504
      ) {
        const backoff = jitter(300 * Math.pow(2, attempt));
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      return { res, requestId, startedAt };
    } catch (err) {
      lastError = err;

      // Handle timeout specifically
      if (err instanceof Error && err.name === "AbortError") {
        console.error(
          `Request timeout after ${timeoutMs / 1000} seconds (attempt ${
            attempt + 1
          })`
        );
        throw new Error(`Request timeout - please try again`);
      }

      const backoff = jitter(300 * Math.pow(2, attempt));
      await sleep(backoff);
      attempt += 1;
    }
  }
  throw lastError || new Error("NIM request failed");
}

export async function chatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletionResult> {
  const isGuidedJson = !!(params.nvext && params.nvext.guided_json);
  const body: any = {
    model: params.model || "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    messages: params.messages,
    temperature: params.temperature ?? 0.4,
    top_p: params.top_p ?? 0.95,
    max_tokens: params.max_tokens ?? 4096, // Increased default to prevent truncation
    stream: false,
  };
  if (isGuidedJson && params.nvext) {
    body.nvext = { guided_json: params.nvext.guided_json };
  }

  const init: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  };

  const { res, requestId, startedAt } = await doFetch(
    CHAT_URL,
    init,
    2,
    params.timeoutMs ?? 30000
  );
  const latencyMs = Date.now() - startedAt;
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    // Handle specific error cases
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      const err = new Error(
        `NIM service temporarily unavailable (${res.status})`
      );
      (err as any).status = res.status;
      (err as any).body = text;
      (err as any).requestId = requestId;
      (err as any).retryable = true;
      throw err;
    }

    const err = new Error(`NIM chat error ${res.status}`);
    (err as any).status = res.status;
    (err as any).body = text;
    (err as any).requestId = requestId;
    throw err;
  }

  const choice = data?.choices?.[0];
  const message = choice?.message || {};

  const extractText = (value: any): string => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value
        .map((item) => extractText(item))
        .filter(Boolean)
        .join(" ");
    }
    if (typeof value === "object") {
      if (typeof value.type === "string") {
        if (typeof value.text === "string") return value.text;
        if (Array.isArray(value.text))
          return value.text.map((t: any) => extractText(t)).join(" ");
      }
      if (typeof value.text === "string") return value.text;
      if (Array.isArray(value.text))
        return value.text.map((t: any) => extractText(t)).join(" ");
      if (typeof value.content === "string") return value.content;
      if (Array.isArray(value.content))
        return value.content.map((entry: any) => extractText(entry)).join(" ");
      if (typeof value.value === "string") return value.value;
      if (typeof value.output_text === "string") return value.output_text;
      if (Array.isArray(value.output_text))
        return value.output_text.map((t: any) => extractText(t)).join(" ");
    }
    return "";
  };

  const candidates: string[] = [];

  const pushCandidate = (value: any) => {
    const textCandidate = extractText(value).trim();
    if (textCandidate) {
      candidates.push(textCandidate);
      // Debug: Log what we're adding to candidates
      if (
        !isGuidedJson &&
        textCandidate.includes("However, to strictly adhere")
      ) {
        console.warn(
          "⚠️ DEBUG: Adding reasoning_content to candidates:",
          textCandidate.substring(0, 100)
        );
      }
    }
  };

  console.log("NIM response debug:", {
    hasData: !!data,
    hasChoices: !!data?.choices,
    choicesLength: data?.choices?.length,
    hasChoice: !!choice,
    hasMessage: !!message,
    messageKeys: message ? Object.keys(message) : [],
    messageContent: message?.content,
    messageContentType: typeof message?.content,
    messageReasoningContent: isGuidedJson
      ? (message as any)?.reasoning_content
      : undefined,
    choiceText: choice?.text,
    choiceKeys: choice ? Object.keys(choice) : [],
    isGuidedJson,
    // Debug: Show reasoning_content even when not guided to detect leaks
    debugReasoningContent: (message as any)?.reasoning_content
      ? (message as any).reasoning_content.substring(0, 100)
      : undefined,
  });

  if (message) {
    pushCandidate(message.content);
    // Check reasoning_content if content is null OR if content is just a header (NVIDIA may put full response there)
    if (
      !message.content ||
      (message.content &&
        message.content.length < 50 &&
        (message as any).reasoning_content)
    ) {
      pushCandidate((message as any).reasoning_content);
    }
    // Skip notes to prevent internal thinking from showing
    // pushCandidate((message as any).notes);
  }

  pushCandidate(choice?.text);
  pushCandidate(choice?.content);
  // Check reasoning_content if content is null OR if content is just a header (NVIDIA may put full response there)
  if (
    !choice?.content ||
    (choice?.content &&
      choice.content.length < 50 &&
      (choice as any)?.reasoning_content)
  ) {
    pushCandidate((choice as any)?.reasoning_content);
  }

  if (!candidates.length) {
    pushCandidate(data?.content);
    pushCandidate(data?.output_text);
    const toolOutputs = choice?.message?.tool_calls;
    if (Array.isArray(toolOutputs)) {
      toolOutputs.forEach((call: any) => {
        pushCandidate(call?.output);
        pushCandidate(call?.text);
      });
    }
  }

  let content = candidates[0] || "";

  // Fallback: if all filtering resulted in empty content, use raw message content
  if (!content && message?.content) {
    console.warn("⚠️ All content filtered out, using raw message content");
    content = message.content;

    // If content is only <think> tags, generate a simple question based on step
    if (content.includes("<think>") && !content.includes("**Question")) {
      console.warn(
        "⚠️ Response contains only reasoning content, generating fallback question"
      );
      const stepNumber = 1; // Default to step 1 if we can't determine
      const topics = [
        "Business Overview",
        "Pain Points",
        "Customers & Reach",
        "Operations & Data",
        "Goals & Vision",
      ];
      const topic = topics[stepNumber - 1] || "Business Overview";
      content = `**Question ${stepNumber}: ${topic}**\n\nCould you share more about your business and current challenges?`;
    }
  }

  // Filter out reasoning content that appears in the main response
  if (content) {
    const originalContent = content;

    // Remove <think> tags and their content (including incomplete tags)
    content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
    content = content.replace(/<think>[\s\S]*$/g, "").trim();
    content = content.replace(/^[\s\S]*?<think>/g, "").trim();

    // Remove other reasoning patterns
    content = content
      .replace(/However, to strictly adhere[\s\S]*?(?=\*\*|$)/g, "")
      .trim();
    content = content.replace(/Revised Question[\s\S]*?(?=\*\*|$)/g, "").trim();
    content = content
      .replace(/Example follow-up[\s\S]*?(?=\*\*|$)/g, "")
      .trim();

    // Remove reasoning patterns that start with "Okay," or "Let me check"
    content = content
      .replace(/^(Okay,|Let me check|Wait,|Looking at)[\s\S]*?(?=\*\*|$)/gm, "")
      .trim();

    // Remove reasoning patterns that contain "conversation history" or "instructions"
    content = content
      .replace(
        /[\s\S]*?(?=conversation history|instructions|check the instructions)[\s\S]*?(?=\*\*|$)/g,
        ""
      )
      .trim();

    // Remove specific reasoning patterns
    content = content
      .replace(/\*\*Awaiting your response to Q\d+.*?\*\*/g, "")
      .replace(/\*\*Final Note for Next Steps\*\*[\s\S]*?(?=\*\*|$)/g, "")
      .replace(
        /\*\(This final note is for my internal planning\.[\s\S]*?\)\*\*/g,
        ""
      )
      .replace(/\*\(Since you've already discussed[\s\S]*?\)\*/g, "")
      .replace(/\*\(If you'd like to delve deeper[\s\S]*?\)\*/g, "")
      .replace(/\*\(This will help me refine[\s\S]*?\)\*/g, "")
      .replace(/\*\(To ensure a seamless transition[\s\S]*?\)\*/g, "")
      .replace(/\*\(Once you provide your final answer[\s\S]*?\)\*/g, "")
      .replace(/\*Once you provide your final answer[\s\S]*?\*/g, "")
      .replace(
        /\*\(This final note is for my internal planning\.[\s\S]*?\)/g,
        ""
      )
      .replace(
        /\*\*[\s\S]*?\(This final note is for my internal planning\.[\s\S]*?\)/g,
        ""
      )
      .replace(/---[\s]*$/gm, "") // Remove trailing --- separators
      .replace(/^\s*---\s*$/gm, "") // Remove standalone --- lines
      .replace(/\*\*\s*$/gm, "") // Remove trailing **
      .replace(
        /\(Note: Prepared to move to Question \d+ upon your response\.\)/g,
        ""
      )
      .replace(/\(Note: [^)]*\)/g, "") // Remove any note patterns
      .replace(/\(\*Assuming this is Question \d+[^)]*\)/g, "") // Remove assumption patterns
      .replace(/\(\*[^)]*assuming[^)]*\)/gi, "") // Remove any assumption patterns
      .replace(/\(\*[^)]*please provide[^)]*\)/gi, "") // Remove instruction patterns
      .replace(/\(\*[^)]*begin the discovery[^)]*\)/gi, "") // Remove discovery patterns
      .replace(/\(\*[^)]*\)/g, "") // Remove any remaining parenthetical asterisk patterns
      .replace(/\(Assuming this is Question \d+\)/g, "") // Remove assumption patterns without asterisk
      .replace(/\(Assuming[^)]*\)/gi, "") // Remove any assumption patterns
      .replace(/^\s*\(Assuming[^)]*\)\s*$/gm, "") // Remove standalone assumption lines
      .replace(/^\s*\(\*[^)]*\)\s*$/gm, "") // Remove standalone parenthetical asterisk lines
      .trim();

    // Extract only the first question, stopping at reasoning content
    // Try both bold and plain question formats - be greedy and capture full content
    let questionMatch = content.match(
      /(\*\*Question \d+[^*]*\*\*[\s\S]*?)(?=Wait,|However,|But according|Revised Question|\*\*Revised|\*\*Note|\*\*END|\*\*\[)/
    );

    if (!questionMatch) {
      // Fallback: try plain Question format without bold markers - capture until reasoning markers
      questionMatch = content.match(
        /(Question \d+[^\n]*\n[\s\S]*?)(?=Wait,|However,|But according|Revised Question|\*\*Revised|\*\*Note|\*\*END|\*\*\[)/
      );

      // If no newline found, try without requiring newline but ensure proper spacing
      if (!questionMatch) {
        questionMatch = content.match(
          /(Question \d+[^\n]*[\s\S]*?)(?=Wait,|However,|But according|Revised Question|\*\*Revised|\*\*Note|\*\*END|\*\*\[)/
        );
        if (questionMatch) {
          // Ensure there's a space after the colon if missing
          questionMatch[1] = questionMatch[1].replace(
            /(Question \d+:[A-Z])/,
            (match) => {
              return match.replace(/(Question \d+:)([A-Z])/, "$1 $2");
            }
          );
        }
      }
    }

    if (questionMatch) {
      content = questionMatch[1].trim();
    } else {
      // Last resort: take everything after question header until obvious reasoning markers
      const headerMatch = content.match(/Question \d+[^\n]*/);
      if (headerMatch && headerMatch.index !== undefined) {
        const afterHeader = content.substring(
          headerMatch.index + headerMatch[0].length
        );
        const reasoningMarkers = [
          "Wait,",
          "However,",
          "But according",
          "Revised Question",
          "**Revised",
          "**Note",
          "**END",
          "**[",
        ];
        let endIndex = afterHeader.length;

        for (const marker of reasoningMarkers) {
          const markerIndex = afterHeader.indexOf(marker);
          if (markerIndex !== -1 && markerIndex < endIndex) {
            endIndex = markerIndex;
          }
        }

        content = headerMatch[0] + afterHeader.substring(0, endIndex).trim();
      }
    }

    // Clean up any remaining reasoning patterns
    content = content
      .replace(/\*\*\(Assuming[^)]*\)\*\*/g, "")
      .replace(/\(Assuming[^)]*\)/g, "")
      .replace(/\*\*\(Current Step[^)]*\)\*\*/g, "")
      .replace(/\*Wait for your response\.\*/g, "")
      .trim();

    // Spacing fixes are now handled in sanitizeQuestion function

    // Fix malformed markdown (extra asterisks)
    // Remove trailing asterisks after colons in question headers
    const colonIndex = content.indexOf(":");
    if (colonIndex !== -1) {
      const beforeColon = content.substring(0, colonIndex + 1);
      const afterColon = content.substring(colonIndex + 1);
      const cleanedAfter = afterColon.replace(/\*+$/, "");
      content = beforeColon + cleanedAfter;
    }

    // Comprehensive content cleaning - remove all internal reasoning and formatting artifacts
    content = content
      // Remove malformed markdown
      .replace(/\*\*Question \d+ \([^)]+\):/g, "Question 1:") // Fix question headers
      .replace(/\*\*([^*]+)$/gm, "$1") // Remove trailing ** without closing
      .replace(/^\*\*([^*]+)$/gm, "$1") // Remove leading ** without closing
      .replace(/\*\*([^*\n]+)\n/g, "$1\n") // Fix ** at end of lines

      // Remove all internal reasoning patterns
      .replace(/\*\*Next:\*\*/g, "") // Remove **Next:** patterns
      .replace(/\*\*Next:\*\*.*$/gm, "") // Remove **Next:** and everything after
      .replace(/\*End of Question \d+\*/g, "") // Remove *End of Question 1* patterns
      .replace(/\*End of question \d+\*/g, "") // Remove *End of question 1* patterns
      .replace(/\*End of Question \d+\*.*$/gm, "") // Remove *End of Question 1* and everything after
      .replace(/\*End of question \d+\*.*$/gm, "") // Remove *End of question 1* and everything after
      .replace(/\*\*Let's explore.*$/gm, "") // Remove **Let's explore** and everything after
      .replace(/\*End of Question.*$/gm, "") // Remove any *End of Question* patterns
      .replace(/\*End of question.*$/gm, "") // Remove any *End of question* patterns

      // Remove all "Adjusted" patterns
      .replace(/Adjusted Q\d+ for Plain Text:.*$/gm, "") // Remove "Adjusted Q2 for Plain Text:" patterns
      .replace(/Adjusted Q\d+ for.*$/gm, "") // Remove any "Adjusted Q" patterns
      .replace(/^Adjusted.*$/gm, "") // Remove any line starting with "Adjusted"
      .replace(/Adjusted.*$/gm, "") // Remove any "Adjusted" patterns anywhere

      // Remove other internal formatting artifacts
      .replace(/Revised Question.*$/gm, "") // Remove "Revised Question" patterns
      .replace(/Updated Question.*$/gm, "") // Remove "Updated Question" patterns
      .replace(/Modified Question.*$/gm, "") // Remove "Modified Question" patterns
      .replace(/Reformatted Question.*$/gm, "") // Remove "Reformatted Question" patterns
      .replace(/Plain Text.*$/gm, "") // Remove "Plain Text" patterns
      .replace(/for Plain Text.*$/gm, "") // Remove "for Plain Text" patterns

      // Remove AI formatting headers
      .replace(/\*\*Bold Highlight:\*\*.*$/gm, "") // Remove "**Bold Highlight:**" patterns
      .replace(/Bold Highlight:.*$/gm, "") // Remove "Bold Highlight:" patterns
      .replace(/\*\*Follow-Up \(Optional for Clarity\):\*\*.*$/gm, "") // Remove "**Follow-Up (Optional for Clarity):**" patterns
      .replace(/Follow-Up \(Optional for Clarity\):.*$/gm, "") // Remove "Follow-Up (Optional for Clarity):" patterns
      .replace(/Awaiting your detailed response.*$/gm, "") // Remove "Awaiting your detailed response" patterns
      .replace(/Awaiting your response.*$/gm, "") // Remove "Awaiting your response" patterns

      // Remove reasoning notes and context explanations
      .replace(/Note:.*$/gm, "") // Remove "Note:" patterns
      .replace(/As per your current context.*$/gm, "") // Remove "As per your current context" patterns
      .replace(/given the context provided.*$/gm, "") // Remove "given the context provided" patterns
      .replace(/I'll proceed with.*$/gm, "") // Remove "I'll proceed with" patterns
      // REMOVED: .replace(/Considering your.*$/gm, "") // This was removing legitimate question content!

      // Remove duplicate question headers and content
      .replace(/Question \d+:.*Question \d+:.*$/gm, (match) => {
        const lines = match.split("\n");
        const firstQuestion = lines.find((line) => line.includes("Question"));
        return firstQuestion || match;
      })

      // Remove duplicate questions with same number
      .replace(/(Question \d+:.*?)(?=\nQuestion \d+:|$)/g, (match) => {
        const lines = match.split("\n");
        const questionLines = lines.filter((line) => line.includes("Question"));
        if (questionLines.length > 1) {
          // Keep only the first question and its content
          const firstQuestionIndex = lines.findIndex((line) =>
            line.includes("Question")
          );
          return lines.slice(firstQuestionIndex).join("\n");
        }
        return match;
      })

      .trim();

    // Additional aggressive filtering for any remaining reasoning content
    // Remove any content that looks like internal reasoning before the actual question
    const lines = content.split("\n");
    const filteredLines = [];
    let foundQuestion = false;

    for (const line of lines) {
      // If we find a question marker, start keeping lines
      if (line.includes("**Question") || line.includes("Question")) {
        foundQuestion = true;
      }

      // Skip lines that look like reasoning content
      if (
        !foundQuestion &&
        (line.includes("<think>") ||
          line.includes("The previous questions") ||
          line.includes("Now, they want to move") ||
          line.includes("But wait,") ||
          line.includes("However,") ||
          line.includes("But looking back") ||
          line.includes("Maybe they want") ||
          line.includes("So the appropriate") ||
          line.includes("Since the user") ||
          line.includes("But the user's message") ||
          line.includes("This final note is for my internal planning") ||
          line.includes("The user will not see this") ||
          line.includes("internal planning") ||
          line.includes("awaiting your response") ||
          line.includes("Once you provide your final answer") ||
          line.includes("I'll generate a tailored") ||
          line.includes("To ensure a seamless transition") ||
          line.includes("This will help me refine") ||
          line.includes("If you'd like to delve deeper") ||
          line.includes("Since you've already discussed") ||
          line.includes("Adjusted Q") ||
          line.includes("for Plain Text") ||
          line.includes("Adjusted") ||
          line.includes("Revised Question") ||
          line.includes("Updated Question") ||
          line.includes("Modified Question") ||
          line.includes("Reformatted Question") ||
          line.includes("Plain Text:") ||
          line.includes("Plain Text version") ||
          line.includes("Here's the") ||
          line.includes("Here is the") ||
          line.includes("Let me provide") ||
          line.includes("Let me give") ||
          line.includes("I'll provide") ||
          line.includes("I'll give") ||
          line.includes("Here's a") ||
          line.includes("Here is a") ||
          line.includes("Bold Highlight:") ||
          line.includes("**Bold Highlight**:") ||
          line.includes("Follow-Up (Optional for Clarity):") ||
          line.includes("**Follow-Up (Optional for Clarity)**:") ||
          line.includes("Awaiting your detailed response") ||
          line.includes("Awaiting your response") ||
          line.includes("Note:") ||
          line.includes("As per your current context") ||
          line.includes("given the context provided") ||
          line.includes("I'll proceed with") ||
          line.includes("Considering your"))
      ) {
        continue;
      }

      filteredLines.push(line);
    }

    content = filteredLines.join("\n").trim();

    // Final cleanup pass - remove any remaining artifacts
    content = content
      // Remove duplicate question content
      .replace(/Question \d+:.*?(?=Question \d+:|$)/g, (match) => {
        const lines = match.split("\n");
        const questionLine = lines.find((line) => line.includes("Question"));
        const contentLines = lines.filter(
          (line) => !line.includes("Question") && line.trim()
        );
        return questionLine
          ? questionLine + "\n" + contentLines.join("\n")
          : match;
      })

      // Remove any remaining internal formatting
      .replace(/^Adjusted.*$/gm, "")
      .replace(/^Revised.*$/gm, "")
      .replace(/^Updated.*$/gm, "")
      .replace(/^Modified.*$/gm, "")
      .replace(/^Reformatted.*$/gm, "")
      .replace(/^Plain Text.*$/gm, "")
      .replace(/^for Plain Text.*$/gm, "")

      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();

    if (originalContent !== content) {
      console.log("✓ Filtered reasoning content from response");
      console.log("Original length:", originalContent.length);
      console.log("Filtered length:", content.length);
    }
  }

  // Debug: Check if reasoning_content is leaking into non-guided responses
  if (content && !isGuidedJson && (message as any)?.reasoning_content) {
    console.warn("⚠️ WARNING: reasoning_content found in non-guided response!");
    console.warn("Content:", content.substring(0, 200));
    console.warn(
      "Reasoning content:",
      (message as any).reasoning_content?.substring(0, 200)
    );
  }

  if (content && isGuidedJson && (message as any)?.reasoning_content) {
    console.log(
      "✓ Extracted guided JSON response from reasoning_content field"
    );
  }

  if (!content && data) {
    const dataStr = JSON.stringify(data);
    console.log(
      "No content found, trying to extract from full response:",
      dataStr.substring(0, 500)
    );
    console.log("Candidates that were filtered out:", candidates);
    console.log("Original message content:", message?.content);
    console.log("Original choice text:", choice?.text);
  }

  const tokensIn = data?.usage?.prompt_tokens ?? undefined;
  const tokensOut = data?.usage?.completion_tokens ?? undefined;

  // Basic observability log (redacted)
  console.log(
    "NIM chat",
    JSON.stringify(
      {
        model: params.model,
        requestId,
        status: res.status,
        tokensIn,
        tokensOut,
        latencyMs,
      },
      (_k, v) => redact(v) as any
    )
  );

  // Metrics logging
  logMetrics("chat", body.model, latencyMs, tokensIn, tokensOut, true);

  return {
    content,
    model: body.model,
    requestId,
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    tokensIn,
    tokensOut,
    latencyMs,
  };
}

export async function embeddings(
  params: EmbeddingsParams
): Promise<EmbeddingsResult> {
  const body: any = {
    model: params.model,
    input: params.input,
    input_type: "passage", // Use "passage" for indexing, "query" for searching
  };

  const init: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  };

  const { res, requestId, startedAt } = await doFetch(EMBED_URL, init);
  const latencyMs = Date.now() - startedAt;
  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    logMetrics(
      "embeddings",
      params.model,
      latencyMs,
      undefined,
      undefined,
      false
    );
    const err = new Error(`NIM embeddings JSON parse error: ${parseError}`);
    (err as any).status = res.status;
    (err as any).body = text;
    (err as any).requestId = requestId;
    throw err;
  }

  if (!res.ok) {
    logMetrics(
      "embeddings",
      params.model,
      latencyMs,
      undefined,
      undefined,
      false
    );
    console.error("Embeddings API error details:", {
      status: res.status,
      body: data,
      url: EMBED_URL,
      model: params.model,
      inputType: Array.isArray(params.input) ? "array" : "string",
      inputLength: Array.isArray(params.input)
        ? params.input.length
        : params.input.length,
    });
    const err = new Error(`NIM embeddings error ${res.status}`);
    (err as any).status = res.status;
    (err as any).body = data;
    (err as any).requestId = requestId;
    throw err;
  }

  const vectors = (data?.data || []).map((d: any) => d.embedding as number[]);
  logMetrics("embeddings", params.model, latencyMs, undefined, undefined, true);
  return { embeddings: vectors, model: params.model, requestId };
}

export async function rerank(params: RerankParams): Promise<RerankResult> {
  // NVIDIA NIM doesn't have a separate rerank endpoint
  // For now, return documents in original order with mock scores
  console.warn("⚠️ NVIDIA NIM rerank not available - using mock reranking");

  const ranked = params.documents.map((doc, index) => ({
    id: doc.id,
    text: doc.text,
    score: 1.0 - index * 0.1, // Mock decreasing scores
  }));

  logMetrics("rerank", params.model, 0, undefined, undefined, true);
  return {
    ranked: ranked.slice(0, params.top_n ?? 6),
    model: params.model,
    requestId: "mock-rerank",
  };
}

/**
 * Sanitize question response: extract first question block, remove reasoning
 */
export function sanitizeQuestion(raw: string, step: number): string {
  if (!raw || typeof raw !== "string") return "";

  let content = raw.trim();

  // Check if response is reasoning-only (CoT-only) - only <think> blocks, no question content
  const hasThink = content.includes("<think>");
  const hasBoldQuestion = content.includes("**Question");
  const hasQuestion = content.includes("Question");

  // Only trigger fallback if it's ONLY <think> content with no question markers
  const isReasoningOnly = hasThink && !hasBoldQuestion && !hasQuestion;

  if (isReasoningOnly) {
    console.warn(
      `⚠️ Reasoning-only response detected for step ${step}; triggering fallback`
    );
    return ""; // Trigger fallback immediately
  }

  // 1) Strip <think> blocks entirely
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  content = content.replace(/<think>[\s\S]*$/g, "").trim();

  // 2) Remove lines starting with ( or *( (notes/assumptions)
  const lines = content.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("(") || trimmed.startsWith("*(")) return false;
    if (
      trimmed.includes("Note for Assistant") ||
      trimmed.includes("END OF RESPONSE") ||
      trimmed.includes("[SYSTEM MESSAGE]") ||
      trimmed.includes("[TO BE PROVIDED")
    ) {
      return false;
    }
    return true;
  });
  content = filtered.join("\n").trim();

  // 3) Extract first question block - be greedy and capture everything until clear end markers
  let extracted = null;

  // Primary pattern: **Question format with greedy matching until clear boundaries
  const questionPattern =
    /\*\*Question\s+\d+[\s\S]*?(?=\n\*\*Question|\n\n(?:However|But|Wait|Revised|Yet|Though|Note|Question|Waiting|\[|---)|$)/i;
  const match = content.match(questionPattern);

  if (match && match[0].length > 50) {
    extracted = match[0].trim();
  } else {
    // Fallback: plain Question format - be more aggressive about capturing content
    const fallbackPattern =
      /Question\s+\d+[\s\S]*?(?=\n\n(?:However|But|Wait|Revised|Yet|Though|Note|Question|Waiting|\[|---)|$)/i;
    const fallbackMatch = content.match(fallbackPattern);
    if (fallbackMatch && fallbackMatch[0].length > 50) {
      extracted = fallbackMatch[0].trim();
    } else {
      // Emergency fallback: if we have a question header, take everything after it until we hit obvious reasoning markers
      const headerMatch = content.match(/Question\s+\d+:?\s*/i);
      if (headerMatch && headerMatch.index !== undefined) {
        const afterHeader = content.substring(
          headerMatch.index + headerMatch[0].length
        );
        // Find the first occurrence of reasoning markers and stop there
        const reasoningMarkers = [
          "However",
          "But",
          "Wait",
          "Revised",
          "Yet",
          "Though",
          "Note",
          "Question",
          "Waiting",
          "[",
          "---",
        ];
        let endIndex = afterHeader.length;

        for (const marker of reasoningMarkers) {
          const markerIndex = afterHeader.indexOf("\n" + marker);
          if (markerIndex !== -1 && markerIndex < endIndex) {
            endIndex = markerIndex;
          }
        }

        extracted =
          "Question " + step + ": " + afterHeader.substring(0, endIndex).trim();
      }
    }
  }

  if (extracted && extracted.length > 50) {
    // Remove any trailing duplicate question headers
    extracted = extracted.replace(/\n+Question\s+\d+:.*$/i, "");
    content = extracted.trim();
  } else {
    // Last resort: take first 800 chars that contain the question header
    const headerIndex = content.indexOf("Question");
    if (headerIndex !== -1) {
      content = content.substring(headerIndex, headerIndex + 800).trim();
    }
  }

  // 4) Normalize header if needed: ensure it's "**Question N:" for this step
  const headerPattern = /\*\*Question \d+:/;
  if (headerPattern.test(content)) {
    const currentStepPattern = new RegExp(`\\*\\*Question ${step}:`);
    if (!currentStepPattern.test(content)) {
      // Rewrite header to match current step
      content = content.replace(/\*\*Question \d+:/, `**Question ${step}:`);
    }
  } else {
    // Ensure header is bold - convert plain "Question N:" to "**Question N:**"
    const plainHeaderPattern = new RegExp(`Question\\s+${step}:`, "i");
    if (plainHeaderPattern.test(content)) {
      content = content.replace(plainHeaderPattern, `**Question ${step}:**`);
    }
  }

  // 5) Remove duplicate Question headers (keep only first)
  const questionHeaders = content.match(/\*\*Question \d+:/g) || [];
  if (questionHeaders.length > 1) {
    const firstHeaderIndex = content.indexOf("**Question");
    const afterFirstHeader = content.substring(firstHeaderIndex);
    const secondHeaderIndex = afterFirstHeader.indexOf("**Question", 10);
    if (secondHeaderIndex > 0) {
      content = afterFirstHeader.substring(0, secondHeaderIndex).trim();
    }
  }

  // 6) Fix spacing issues after question headers - look for word followed by word without space
  content = content.replace(/([A-Za-z])([A-Z][a-z])/g, (match, p1, p2) => {
    // Only fix if it looks like a question header issue (word followed by capitalized word)
    if (
      match.includes("Question") ||
      match.includes("Overview") ||
      match.includes("Points") ||
      match.includes("Reach")
    ) {
      return p1 + " " + p2;
    }
    return match;
  });

  // Also fix specific cases like "PointsGiven" -> "Points Given"
  content = content.replace(/([A-Z][a-z]+)([A-Z][a-z]+)/g, (match, p1, p2) => {
    if (
      match.includes("ReachHow") ||
      match.includes("OverviewWhat") ||
      match.includes("PointsWhat") ||
      match.includes("PointsGiven") ||
      match.includes("ReachConsidering") ||
      match.includes("DataConsidering") ||
      match.includes("OperationsConsidering") ||
      match.includes("GoalsConsidering") ||
      match.includes("PainPointsConsidering") ||
      match.includes("CustomersConsidering") ||
      match.includes("CustomersReachConsidering") ||
      match.includes("CustomersReachGiven") ||
      match.includes("CustomersReachConsidering") ||
      match.includes("CustomersReachGiven") ||
      match.includes("CustomersReachConsidering") ||
      match.includes("CustomersReachGiven") ||
      match.includes("CustomersReachConsidering") ||
      match.includes("CustomersReachGiven") ||
      match.includes("CustomersReachConsidering") ||
      match.includes("DataHow") ||
      match.includes("DataGiven") ||
      match.includes("DataConsidering") ||
      match.includes("DataGiven") ||
      match.includes("VisionFINAL") ||
      match.includes("QUESTIONLooking") ||
      match.includes("VisionFinal")
    ) {
      return p1 + " " + p2;
    }
    return match;
  });

  // 7) Fix "FINAL QUESTION" formatting
  content = content.replace(
    /(Goals & Vision)FINAL QUESTION/i,
    "$1 (Final Question)"
  );
  content = content.replace(
    /(Goals & Vision)Final Question/i,
    "$1 (Final Question)"
  );

  // 8) Add line break after question topic for better readability
  // Look for question words that typically start the question body
  const questionWords = [
    "What",
    "How",
    "Who",
    "Where",
    "When",
    "Why",
    "Which",
    "With",
    "Looking",
    "Given",
    "Considering",
    "Based",
    "Focusing",
    "Building",
    "Expanding",
    "Improving",
    "Optimizing",
    "Streamlining",
    "Enhancing",
    "Developing",
    "Focusing",
  ];

  for (const word of questionWords) {
    const pattern = new RegExp(
      `(\\*\\*Question \\d+:\\*\\*[^\\n]*?)(\\s+${word})`,
      "g"
    );
    content = content.replace(pattern, `$1\n\n$2`);
  }

  return content.trim();
}

export async function textToSpeech(params: TTSParams): Promise<TTSResult> {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY is required for TTS");
  }

  const model = params.model || "nvidia/magpie-tts-flow";
  const voice = params.voice || "alloy";
  const body: Record<string, unknown> = {
    model,
    input: params.text,
    format: "wav",
  };

  if (voice) body.voice = voice;
  if (typeof params.speed === "number") body.speed = params.speed;
  if (typeof params.pitch === "number") body.pitch = params.pitch;

  const startedAt = Date.now();
  const requestId = `tts_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/octet-stream",
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const errorText = await res.text();
      logMetrics("tts", model, latencyMs, undefined, undefined, false);
      const err = new Error(`NIM TTS error ${res.status}: ${errorText}`);
      (err as any).status = res.status;
      (err as any).body = errorText;
      (err as any).requestId = requestId;
      throw err;
    }

    const audioBuffer = await res.arrayBuffer();
    logMetrics("tts", model, latencyMs, undefined, undefined, true);

    return {
      audio: audioBuffer,
      model,
      requestId,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    logMetrics("tts", model, latencyMs, undefined, undefined, false);
    throw error;
  }
}
