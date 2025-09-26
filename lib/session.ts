import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "ai-5q-session-id";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function generateSessionId(): string {
  return uuidv4();
}

export function getSessionIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
}

export function getSessionIdFromCookies(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export function createSessionCookie(sessionId: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: "/",
  };
}

export function getOrCreateSessionId(request: NextRequest): string {
  let sessionId = getSessionIdFromRequest(request);

  if (!sessionId) {
    sessionId = generateSessionId();
  }

  return sessionId;
}

export function getOrCreateSessionIdFromCookies(): string {
  let sessionId = getSessionIdFromCookies();

  if (!sessionId) {
    sessionId = generateSessionId();
  }

  return sessionId;
}

// Helper to extract user info from request headers (for anonymous sessions)
export function extractUserInfo(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const referer = request.headers.get("referer") || "";
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    xForwardedFor?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return {
    userAgent,
    referer,
    ipAddress,
  };
}

// Helper to extract UTM parameters from referer
export function extractUtmParams(referer: string) {
  try {
    const url = new URL(referer);
    return {
      utmSource: url.searchParams.get("utm_source"),
      utmMedium: url.searchParams.get("utm_medium"),
      utmCampaign: url.searchParams.get("utm_campaign"),
    };
  } catch {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    };
  }
}
