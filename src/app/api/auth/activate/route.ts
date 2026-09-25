import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/error-report";

// req.url reflects the internal bind address behind a reverse proxy (e.g. 0.0.0.0:3000),
// not the public domain — every redirect must be built off the real public URL instead.
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, APP_URL));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return redirectTo("/login?error=Invalid+activation+link");
  }

  try {
    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!activationToken) {
      return redirectTo("/login?error=Invalid+or+expired+activation+link");
    }

    if (activationToken.expiresAt < new Date()) {
      await prisma.activationToken.delete({ where: { id: activationToken.id } });
      return redirectTo("/login?error=Activation+link+expired");
    }

    // Activate user
    await prisma.user.update({
      where: { id: activationToken.userId },
      data: { isActive: true },
    });

    // The token is deliberately NOT deleted here (only when it expires, above). Some
    // email clients and disposable-mail providers prefetch/scan links automatically,
    // which would otherwise consume the token before the user ever clicks it — leaving
    // it valid until expiry makes a repeat click (scanner + human) both succeed instead
    // of the human getting a false "invalid link" error for an activation that already worked.

    return redirectTo("/login?success=Account+activated.+You+can+now+log+in.");
  } catch (error) {
    console.error("Activation error:", error);
    void reportError(error, { source: "api", route: "/api/auth/activate" });
    return redirectTo("/login?error=Something+went+wrong");
  }
}
