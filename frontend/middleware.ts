import { NextResponse, NextRequest } from "next/server";

// Open auth: middleware is a no-op. Client-side AuthGuard handles redirects so we
// can keep cookies + bearer tokens flexible while running behind the preview URL.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|public|api).*)"],
};
