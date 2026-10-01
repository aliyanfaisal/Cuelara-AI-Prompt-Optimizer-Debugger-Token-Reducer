import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { ConnectExtension } from "./ConnectExtension";

export const dynamic = "force-dynamic";
// The state value is a one-time secret shared with the extension, so keep the URL out of search results and Referer headers.
export const metadata: Metadata = { title: "Connect the extension", robots: { index: false, follow: false }, referrer: "no-referrer" };

const STATE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export default async function ConnectExtensionPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  if (!state || !STATE_PATTERN.test(state)) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 pb-24 pt-32">
        <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Open this from the extension</h1>
          <p className="text-sm text-muted-foreground">Click <strong className="text-foreground">Connect your account</strong> in the Cuelara extension to link it to your account.</p>
        </div>
      </div>
    );
  }

  const session = await getSessionUser();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/extension/connect?state=${state}`)}`);

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { email: true, name: true, isActive: true } });
  if (!user || !user.isActive) redirect("/login?error=Unauthorized+Access");

  return <ConnectExtension state={state} account={user.email ?? user.name ?? "your account"} />;
}
