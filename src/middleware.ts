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

    // Already signed in: /login and /register are for signing in, not for a second session.
    if ((pathname === "/login" || pathname === "/register") && token) {
      const dest = (token.roles as string[])?.includes("ADMIN") ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Admin routes and the user dashboard always require auth (signed-out visitors go to /login and come back).
        if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return !!token;

        // /login and /register stay public here — the redirect for an already-signed-in visitor happens above, in middleware().
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
    "/dashboard/:path*",
    "/login",
    "/register",
    // Add other protected routes here later
  ],
};
