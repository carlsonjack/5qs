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
  model: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  nvext?: {
    guided_json?: Record<string, unknown>;
  };
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
  maxRetries = 2
): Promise<{ res: Response; requestId?: string; startedAt: number }> {
  let attempt = 0;
  let lastError: any = null;
  const startedAt = Date.now();

  while (attempt <= maxRetries) {
    try {
      // Add timeout to prevent extremely long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
          `Request timeout after 30 seconds (attempt ${attempt + 1})`
        );
        throw new Error("Request timeout - please try again");
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
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.4,
    top_p: params.top_p ?? 0.95,
    max_tokens: params.max_tokens ?? 4096, // Increased default to prevent truncation
    stream: params.stream ?? false,
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

  const { res, requestId, startedAt } = await doFetch(CHAT_URL, init);
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
    // For guided JSON mode, check reasoning_content as NIM may put the response there
    if (isGuidedJson) {
      pushCandidate((message as any).reasoning_content);
    }
    // Skip notes to prevent internal thinking from showing
    // pushCandidate((message as any).notes);
  }

  pushCandidate(choice?.text);
  pushCandidate(choice?.content);
  // For guided JSON mode, check reasoning_content as NIM may put the response there
  if (isGuidedJson) {
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
      .trim();

    // Remove any content before the first **Question** or **Step** marker
    const questionMatch = content.match(/(\*\*Question \d+:|Question \d+:)/);
    if (questionMatch) {
      content = content.substring(content.indexOf(questionMatch[0])).trim();
    }

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

      // Remove duplicate question headers
      .replace(/Question \d+:.*Question \d+:.*$/gm, (match) => {
        const lines = match.split("\n");
        const firstQuestion = lines.find((line) => line.includes("Question"));
        return firstQuestion || match;
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
          line.includes("Awaiting your response"))
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
  logMetrics("chat", params.model, latencyMs, tokensIn, tokensOut, true);

  return {
    content,
    model: params.model,
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
