import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { previewInvite } from "@/lib/workspace";
import { AcceptInvite } from "./AcceptInvite";

export const dynamic = "force-dynamic";
// The URL carries a credential (the token), so it must never be indexed or leaked through a Referer header.
export const metadata: Metadata = { title: "Team invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, session] = await Promise.all([previewInvite(token), getServerSession(authOptions)]);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const me = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }) : null;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 pb-24 pt-32">
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        {!invite ? (
          <>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Invitation not found</h1>
            <p className="mb-6 text-sm text-muted-foreground">This link is no longer valid — it may have been used, replaced by a newer invitation, or revoked. Ask your team manager to send a new one.</p>
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">Go to Cuelara</Link>
          </>
        ) : invite.expired ? (
          <>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">This invitation has expired</h1>
            <p className="text-sm text-muted-foreground">Ask {invite.inviterName} to send you a new one.</p>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Team invitation</p>
            <h1 className="mb-2 text-2xl font-black tracking-tight text-foreground">Join {invite.workspaceName}</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {invite.inviterName} invited <strong className="text-foreground">{invite.email}</strong> to join as {invite.role === "ADMIN" ? "an admin" : "a member"}. You&rsquo;ll get the team&rsquo;s shared prompt library and the Team plan&rsquo;s daily limits.
            </p>
            {!me ? (
              <div className="space-y-3">
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                  Sign in to accept
                </Link>
                <p className="text-xs text-muted-foreground">
                  No account yet? <Link href="/register" className="font-semibold text-primary hover:underline">Create one</Link> with <strong>{invite.email}</strong>, activate it from the email we send, then come back to this link.
                </p>
              </div>
            ) : me.email?.toLowerCase() !== invite.email.toLowerCase() ? (
              <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                You&rsquo;re signed in as {me.email}, but this invitation was sent to {invite.email}. Sign out and sign in with that address to accept it.
              </p>
            ) : (
              <AcceptInvite token={token} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
