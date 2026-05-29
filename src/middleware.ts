import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/invitations",
  "/oauth2",
  "/_next",
  "/favicon.ico",
];

async function fetchMe(backendUrl: string, cookie: string) {
  return fetch(`${backendUrl}/api/v1/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const cookie = request.headers.get("cookie") ?? "";

  try {
    let meResponse = await fetchMe(backendUrl, cookie);

    // Access token expired — try to refresh before redirecting to login
    if (meResponse.status === 401) {
      const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: cookie },
        cache: "no-store",
      });

      if (refreshResponse.ok) {
        // Extract the new Set-Cookie headers from the refresh response
        const newCookies = refreshResponse.headers.getSetCookie?.() ??
          [refreshResponse.headers.get("set-cookie")].filter(Boolean) as string[];

        // Build updated cookie string for the retry request
        const newAccessCookie = newCookies.find(c => c.startsWith("asa_access_token="));
        const updatedCookie = newAccessCookie
          ? cookie.replace(/asa_access_token=[^;]+/, newAccessCookie.split(";")[0]) + "; " + newAccessCookie.split(";")[0]
          : cookie;

        meResponse = await fetchMe(backendUrl, updatedCookie);

        if (meResponse.ok) {
          const user = await meResponse.json();
          const response = buildResponse(request, pathname, user);
          // Forward new cookies to the browser
          newCookies.forEach(c => response.headers.append("Set-Cookie", c));
          return response;
        }
      }

      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!meResponse.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const user = await meResponse.json();
    return buildResponse(request, pathname, user);
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

function buildResponse(request: NextRequest, pathname: string, user: any): NextResponse {
  // Cambio de contraseña obligatorio — prioridad sobre onboarding
  if (user.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // Onboarding obligatorio solo para estudiantes (no para personal interno)
  const isStaff = Array.isArray(user.roles) &&
    user.roles.some((r: string) => ["ADMIN", "SUPER_ADMIN", "PROGRAM_LEADER"].includes(r));

  if (!isStaff && !user.onboardingCompleted && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|forgot-password|reset-password).*)"],
};
