import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

function getProjectRef() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    const { host } = new URL(url);
    return host.split(".")[0];
  } catch {
    return null;
  }
}

async function hasSupabaseSessionCookie() {
  try {
    const cookieStore = await cookies();
    const projectRef = getProjectRef();

    return cookieStore.getAll().some(({ name }) => {
      if (
        name === "sb-access-token" ||
        name === "sb-refresh-token" ||
        name === "__Host-sb-auth-token"
      ) {
        return true;
      }

      if (!projectRef) {
        return name.startsWith("sb-") && name.endsWith("-auth-token");
      }

      return (
        name === `sb-${projectRef}-auth-token` ||
        name === `sb-${projectRef}-refresh-token`
      );
    });
  } catch {
    return false;
  }
}

export async function createClient() {
  try {
    const cookieStore = await cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              return cookieStore.getAll();
            } catch {
              return [];
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
  } catch (error) {
    console.log("Failed to create Supabase client, continuing without auth");
    return null;
  }
}

export function createClientFromRequest(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );
}

export async function getUser() {
  try {
    if (!(await hasSupabaseSessionCookie())) {
      return null;
    }

    const supabase = await createClient();
    if (!supabase) {
      console.log("Supabase client not available, continuing without user");
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (
        error.name === "AuthSessionMissingError" ||
        (typeof error.message === "string" &&
          error.message.toLowerCase().includes("auth session missing"))
      ) {
        return null;
      }

      console.error("Error getting user:", error);
      return null;
    }

    return user;
  } catch (error) {
    // Handle cases where auth session is missing or invalid
    console.log("No valid auth session found, continuing without user");
    return null;
  }
}

export async function getSession() {
  try {
    if (!hasSupabaseSessionCookie()) {
      return null;
    }

    const supabase = await createClient();
    if (!supabase) {
      console.log("Supabase client not available, continuing without session");
      return null;
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (
        error.name === "AuthSessionMissingError" ||
        (typeof error.message === "string" &&
          error.message.toLowerCase().includes("auth session missing"))
      ) {
        return null;
      }

      console.error("Error getting session:", error);
      return null;
    }

    return session;
  } catch (error) {
    // Handle cases where auth session is missing or invalid
    console.log("No valid auth session found, continuing without session");
    return null;
  }
}
