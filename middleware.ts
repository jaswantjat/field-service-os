import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  // If no session exists, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/portal", "/hq", "/calendar", "/complete/:path*"],
};