import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/nim/client";

// Note: This API route is currently disabled in favor of browser-native speech synthesis
// It can be re-enabled if external TTS service is needed in the future
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, model, voice, speed, pitch } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required for TTS" },
        { status: 400 }
      );
    }

    // Call the TTS function on the server side where NVIDIA_API_KEY is available
    const ttsResult = await textToSpeech({
      text,
      model: model || "nvidia/magpie-tts-flow",
      voice,
      speed,
      pitch,
    });

    // Return the audio data as a base64 encoded string for the client
    const audioBase64 = Buffer.from(ttsResult.audio).toString("base64");

    return NextResponse.json({
      audio: audioBase64,
      contentType: "audio/wav",
    });
  } catch (error) {
    console.error("TTS API error:", error);

    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
