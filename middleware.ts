import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Check for bearer token in Authorization header or cookie
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const cookieToken = request.cookies.get("better-auth.session_token")?.value;
  
  // If no token exists in either location, redirect to login
  if (!token && !cookieToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/portal", "/hq", "/calendar", "/complete/:path*"],
};