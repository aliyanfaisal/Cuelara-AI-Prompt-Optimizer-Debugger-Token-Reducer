import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Protect all admin routes
    if (pathname.startsWith("/admin")) {
      if (!(token?.roles as string[])?.includes("ADMIN")) {
        return NextResponse.redirect(new URL("/login?error=Unauthorized+Access", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Admin routes always require auth
        if (pathname.startsWith("/admin")) return !!token;

        return true; // Allow public access by default
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    // Add other protected routes here later
  ],
};
