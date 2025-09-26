import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/llm/providers";

export async function GET() {
  try {
    const providerStatus = getProviderStatus();
    const healthyProviders = providerStatus.filter((p) => p.isAvailable);
    const totalProviders = providerStatus.length;

    const systemHealth = {
      status: healthyProviders.length > 0 ? "healthy" : "unhealthy",
      uptime: healthyProviders.length / totalProviders,
      providers: providerStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    };

    const statusCode = healthyProviders.length > 0 ? 200 : 503;

    return NextResponse.json(systemHealth, { status: statusCode });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

