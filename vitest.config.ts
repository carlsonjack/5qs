import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
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
