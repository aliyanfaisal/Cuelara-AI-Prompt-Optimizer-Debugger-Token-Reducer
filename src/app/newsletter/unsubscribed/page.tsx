import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
        <MailX className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">You&apos;re unsubscribed</h1>
      <p className="mb-8 text-muted-foreground">
        You won&apos;t receive any more newsletter emails from Cuelara. You can resubscribe any time from the footer.
      </p>
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">
        Back to Cuelara
      </Link>
    </div>
  );
}
