import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Protect admin routes
    if (pathname.startsWith("/admin/dashboard")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/admin/login?error=Unauthorized+Access", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Only require auth for specific paths right now
        // For example, if we want to protect /tools/saved later:
        // if (pathname.startsWith("/tools/saved")) return !!token;
        
        // Admin routes always require auth
        if (pathname.startsWith("/admin/dashboard")) return !!token;

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
    "/admin/dashboard/:path*",
    // Add other protected routes here later
  ],
};
