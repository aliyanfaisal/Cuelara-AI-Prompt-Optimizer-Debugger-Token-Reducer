import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=Invalid+activation+link", req.url));
  }

  try {
    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!activationToken) {
      return NextResponse.redirect(new URL("/login?error=Invalid+or+expired+activation+link", req.url));
    }

    if (activationToken.expiresAt < new Date()) {
      await prisma.activationToken.delete({ where: { id: activationToken.id } });
      return NextResponse.redirect(new URL("/login?error=Activation+link+expired", req.url));
    }

    // Activate user
    await prisma.user.update({
      where: { id: activationToken.userId },
      data: { isActive: true },
    });

    // Delete token
    await prisma.activationToken.delete({ where: { id: activationToken.id } });

    return NextResponse.redirect(new URL("/login?success=Account+activated.+You+can+now+log+in.", req.url));
  } catch (error) {
    console.error("Activation error:", error);
    return NextResponse.redirect(new URL("/login?error=Something+went+wrong", req.url));
  }
}
