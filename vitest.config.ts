import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60000, // 60 seconds for AI API calls
    hookTimeout: 30000, // 30 seconds for setup/teardown
    exclude: ["**/e2e/**", "**/node_modules/**"], // Exclude Playwright e2e tests
    env: {
      LLM_DEFAULT_MODEL: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      LLM_PLAN_MODEL: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      LLM_COST_MODE_MODEL: "nvidia/llama-3.1-nemotron-nano-4b-v1.1",
      LLM_FAST_MODEL: "nvidia/llama-3.1-nemotron-nano-4b-v1.1",
      NVIDIA_API_URL: "https://integrate.api.nvidia.com/v1/chat/completions",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
