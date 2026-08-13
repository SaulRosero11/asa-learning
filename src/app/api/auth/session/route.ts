import { NextRequest, NextResponse } from "next/server";

// Recibe los tokens del backend tras OAuth2 y los setea como cookies en el dominio de Next.js
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const at = searchParams.get("at");
  const rt = searchParams.get("rt");
  const isLong = searchParams.get("long") === "true";
  const mustChangePassword = searchParams.get("mcp") === "true";
  const onboardingCompleted = searchParams.get("oc") === "true";

  if (!at) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const redirectPath = mustChangePassword
    ? "/change-password"
    : !onboardingCompleted
    ? "/onboarding"
    : "/dashboard";

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("asa_access_token", at, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });

  if (rt) {
    response.cookies.set("asa_refresh_token", rt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/api/v1/auth/refresh",
      maxAge: isLong ? 2592000 : 1800,
    });
  }

  return response;
}
