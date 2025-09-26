// Test guided JSON with NVIDIA NIM
import { chatCompletion } from "./lib/nim/client.js";

async function testGuidedJSON() {
  try {
    console.log("Testing guided JSON with NVIDIA NIM...");

    const result = await chatCompletion({
      model: "nvidia/llama-3.1-nemotron-70b-instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts business information. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content:
            "Extract business type and pain points from: 'We run a coffee shop downtown and struggle with manual scheduling of our 5 employees.'",
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
      nvext: {
        guided_json: {
          type: "object",
          properties: {
            businessType: { type: "string" },
            painPoints: { type: "string" },
          },
          required: ["businessType", "painPoints"],
          additionalProperties: false,
        },
      },
    });

    console.log("✅ Guided JSON Response:");
    console.log(result.content);

    // Try to parse it
    const parsed = JSON.parse(result.content);
    console.log("✅ Parsed successfully:", parsed);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testGuidedJSON();
