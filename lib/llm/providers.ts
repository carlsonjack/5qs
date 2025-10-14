/**
 * Multi-provider AI system for 99% uptime reliability
 * Implements provider fallbacks, health monitoring, and retry logic
 */

import { chatCompletion as nimChatCompletion } from "../nim/client";

export interface AIProvider {
  name: string;
  priority: number; // Lower = higher priority
  isAvailable: boolean;
  lastError?: string;
  lastHealthCheck?: number;
  healthCheckInterval: number; // ms
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  guided_json?: Record<string, unknown>;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: string;
  requestId?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
}

// Provider configurations
const PROVIDERS: Record<string, AIProvider> = {
  nvidia_primary: {
    name: "NVIDIA NIM Primary",
    priority: 1,
    isAvailable: true,
    healthCheckInterval: 300000, // 5 minutes
  },
  nvidia_fallback: {
    name: "NVIDIA NIM Fallback",
    priority: 2,
    isAvailable: true,
    healthCheckInterval: 300000, // 5 minutes // 1 minute
  },
  openai: {
    name: "OpenAI GPT-4",
    priority: 3,
    isAvailable: !!process.env.OPENAI_API_KEY,
    healthCheckInterval: 300000, // 5 minutes
  },
  anthropic: {
    name: "Anthropic Claude",
    priority: 4,
    isAvailable: !!process.env.ANTHROPIC_API_KEY,
    healthCheckInterval: 300000, // 5 minutes
  },
};

// Model mappings for each provider
const MODEL_MAPPINGS = {
  nvidia_primary: {
    "nvidia/llama-3.1-nemotron-70b-instruct":
      "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1":
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    default: "nvidia/llama-3.1-nemotron-70b-instruct",
  },
  nvidia_fallback: {
    "nvidia/llama-3.1-nemotron-70b-instruct":
      "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1":
      "nvidia/llama-3.1-nemotron-70b-instruct", // Use smaller model as fallback
    default: "nvidia/llama-3.1-nemotron-70b-instruct",
  },
  openai: {
    "nvidia/llama-3.1-nemotron-70b-instruct": "gpt-4o-mini",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1": "gpt-4o",
    default: "gpt-4o-mini",
  },
  anthropic: {
    "nvidia/llama-3.1-nemotron-70b-instruct": "claude-3-haiku-20240307",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1": "claude-3-5-sonnet-20241022",
    default: "claude-3-haiku-20240307",
  },
};

// Health check functions
async function checkNvidiaHealth(): Promise<boolean> {
  try {
    const result = await nimChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      max_tokens: 10,
      temperature: 0.1,
    });
    return !!result.content;
  } catch (error) {
    console.warn("NVIDIA health check failed:", error);
    return false;
  }
}

async function checkOpenAIHealth(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) return false;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    return response.ok;
  } catch (error) {
    console.warn("OpenAI health check failed:", error);
    return false;
  }
}

async function checkAnthropicHealth(): Promise<boolean> {
  if (!process.env.ANTHROPIC_API_KEY) return false;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    return response.ok;
  } catch (error) {
    console.warn("Anthropic health check failed:", error);
    return false;
  }
}

// Provider implementations
async function callNvidiaProvider(
  params: ChatCompletionParams,
  isFallback = false
): Promise<ChatCompletionResult> {
  const modelMap = isFallback
    ? MODEL_MAPPINGS.nvidia_fallback
    : MODEL_MAPPINGS.nvidia_primary;
  const model = modelMap[params.model || "default"] || modelMap.default;

  const nimParams = {
    messages: params.messages,
    model,
    temperature: params.temperature,
    top_p: params.top_p,
    max_tokens: params.max_tokens,
    nvext: params.guided_json ? { guided_json: params.guided_json } : undefined,
  };

  const result = await nimChatCompletion(nimParams);

  return {
    content: result.content,
    model: result.model,
    provider: isFallback ? "nvidia_fallback" : "nvidia_primary",
    requestId: result.requestId,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: result.latencyMs,
  };
}

async function callOpenAIProvider(
  params: ChatCompletionParams
): Promise<ChatCompletionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const model =
    MODEL_MAPPINGS.openai[params.model || "default"] ||
    MODEL_MAPPINGS.openai.default;
  const startTime = Date.now();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      temperature: params.temperature || 0.3,
      top_p: params.top_p || 0.9,
      max_tokens: params.max_tokens || 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    content: data.choices[0]?.message?.content || "",
    model: data.model,
    provider: "openai",
    requestId: data.id,
    tokensIn: data.usage?.prompt_tokens,
    tokensOut: data.usage?.completion_tokens,
    latencyMs,
  };
}

async function callAnthropicProvider(
  params: ChatCompletionParams
): Promise<ChatCompletionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured");
  }

  const model =
    MODEL_MAPPINGS.anthropic[params.model || "default"] ||
    MODEL_MAPPINGS.anthropic.default;
  const startTime = Date.now();

  // Convert system messages for Anthropic
  const systemMessage = params.messages.find((m) => m.role === "system");
  const conversationMessages = params.messages.filter(
    (m) => m.role !== "system"
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages: conversationMessages,
      system: systemMessage?.content,
      max_tokens: params.max_tokens || 1024,
      temperature: params.temperature || 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    content: data.content[0]?.text || "",
    model: data.model,
    provider: "anthropic",
    requestId: data.id,
    tokensIn: data.usage?.input_tokens,
    tokensOut: data.usage?.output_tokens,
    latencyMs,
  };
}

// Health monitoring
let healthCheckTimers: Record<string, NodeJS.Timeout> = {};

function startHealthMonitoring() {
  // NVIDIA Primary
  healthCheckTimers.nvidia_primary = setInterval(async () => {
    const isHealthy = await checkNvidiaHealth();
    PROVIDERS.nvidia_primary.isAvailable = isHealthy;
    PROVIDERS.nvidia_primary.lastHealthCheck = Date.now();
    if (!isHealthy) {
      PROVIDERS.nvidia_primary.lastError = "Health check failed";
      console.warn("🔴 NVIDIA Primary provider unhealthy");
    } else if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
      // Only log 10% of successful health checks in development to reduce noise
      console.log("🟢 NVIDIA Primary provider healthy");
    }
  }, PROVIDERS.nvidia_primary.healthCheckInterval);

  // NVIDIA Fallback (same endpoint, different model)
  healthCheckTimers.nvidia_fallback = setInterval(async () => {
    const isHealthy = await checkNvidiaHealth();
    PROVIDERS.nvidia_fallback.isAvailable = isHealthy;
    PROVIDERS.nvidia_fallback.lastHealthCheck = Date.now();
  }, PROVIDERS.nvidia_fallback.healthCheckInterval);

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    healthCheckTimers.openai = setInterval(async () => {
      const isHealthy = await checkOpenAIHealth();
      PROVIDERS.openai.isAvailable = isHealthy;
      PROVIDERS.openai.lastHealthCheck = Date.now();
      if (!isHealthy) {
        PROVIDERS.openai.lastError = "Health check failed";
        console.warn("🔴 OpenAI provider unhealthy");
      } else if (
        process.env.NODE_ENV === "development" &&
        Math.random() < 0.1
      ) {
        console.log("🟢 OpenAI provider healthy");
      }
    }, PROVIDERS.openai.healthCheckInterval);
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    healthCheckTimers.anthropic = setInterval(async () => {
      const isHealthy = await checkAnthropicHealth();
      PROVIDERS.anthropic.isAvailable = isHealthy;
      PROVIDERS.anthropic.lastHealthCheck = Date.now();
      if (!isHealthy) {
        PROVIDERS.anthropic.lastError = "Health check failed";
        console.warn("🔴 Anthropic provider unhealthy");
      } else if (
        process.env.NODE_ENV === "development" &&
        Math.random() < 0.1
      ) {
        console.log("🟢 Anthropic provider healthy");
      }
    }, PROVIDERS.anthropic.healthCheckInterval);
  }
}

// Main function with intelligent fallback
export async function reliableChatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletionResult> {
  // Get available providers sorted by priority
  const availableProviders = Object.entries(PROVIDERS)
    .filter(([_, provider]) => provider.isAvailable)
    .sort(([_, a], [__, b]) => a.priority - b.priority);

  if (availableProviders.length === 0) {
    throw new Error(
      "No AI providers available. Please check your configuration."
    );
  }

  const errors: Array<{ provider: string; error: string }> = [];

  // Try each provider in order
  for (const [providerId, provider] of availableProviders) {
    try {
      console.log(`🔄 Attempting ${provider.name}...`);

      let result: ChatCompletionResult;

      switch (providerId) {
        case "nvidia_primary":
          result = await callNvidiaProvider(params, false);
          break;
        case "nvidia_fallback":
          result = await callNvidiaProvider(params, true);
          break;
        case "openai":
          result = await callOpenAIProvider(params);
          break;
        case "anthropic":
          result = await callAnthropicProvider(params);
          break;
        default:
          throw new Error(`Unknown provider: ${providerId}`);
      }

      // Success! Log metrics and return
      console.log(`✅ ${provider.name} succeeded`, {
        model: result.model,
        latency: result.latencyMs,
        tokens: `${result.tokensIn}→${result.tokensOut}`,
      });

      return result;
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      errors.push({ provider: provider.name, error: errorMessage });
      console.warn(`❌ ${provider.name} failed:`, errorMessage);

      // Mark provider as unhealthy if it's a non-retryable error
      if (error.status === 401 || error.status === 403) {
        provider.isAvailable = false;
        provider.lastError = `Authentication error: ${errorMessage}`;
      } else if (error.status >= 500) {
        provider.isAvailable = false;
        provider.lastError = `Server error: ${errorMessage}`;
      }

      // Continue to next provider
      continue;
    }
  }

  // All providers failed
  console.error("🔴 All AI providers failed");
  const errorSummary = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join("; ");
  throw new Error(`All AI providers failed. Errors: ${errorSummary}`);
}

export function getProviderStatus() {
  return Object.entries(PROVIDERS).map(([id, provider]) => ({
    id,
    name: provider.name,
    priority: provider.priority,
    isAvailable: provider.isAvailable,
    lastError: provider.lastError,
    lastHealthCheck: provider.lastHealthCheck,
  }));
}

// Initialize health monitoring when module loads
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  // Server-side only, and only in production to avoid quota usage in development
  startHealthMonitoring();
  console.log("🔄 AI provider health monitoring started");
} else if (typeof window === "undefined") {
  console.log("🔄 AI provider health monitoring disabled in development");
}
