import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { siteUrl } from "@/lib/blog";

const TITLE = "Refund Policy";
const DESCRIPTION = "Our refund policy for Cuelara paid plans: eligibility, how to request one, and how Paddle (our payment processor) handles it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/refund-policy" },
  openGraph: { type: "website", title: `${TITLE} | Cuelara`, description: DESCRIPTION, url: `${siteUrl()}/refund-policy` },
};

const CONTENT = `
## 1. Who handles billing

Cuelara's paid plans are billed by **Paddle.com Market Limited**, our payment processor and merchant of record. Paddle collects payment, handles tax and issues the receipt for every charge — your card statement will show a Paddle charge, not Cuelara. Refunds, when approved, are issued back to the original payment method through Paddle.

## 2. Subscription cancellation

You can cancel your subscription at any time from [Dashboard → Subscription](/dashboard/subscription) or [Dashboard → Payment Methods](/dashboard/payment-methods). Cancelling stops future billing immediately and moves your account to the Free plan right away — we do not charge you again after you cancel.

## 3. Refund eligibility

- **First-time subscribers:** if you're unhappy with a paid plan, contact us within **7 days** of your first payment for that plan and we'll issue a full refund, no questions asked.
- **Renewals:** we generally don't refund a renewal charge once the new billing period has started, since cancelling before renewal avoids the charge entirely. We'll still review genuine billing errors (e.g. a duplicate charge, or a charge after you'd already cancelled) case by case.
- **Yearly plans:** the same first-payment window applies. Beyond that, refunds for the unused part of a yearly term are considered case by case, at our discretion.
- **Abuse:** we reserve the right to decline a refund where the account shows signs of abuse of this policy (e.g. repeated subscribe-refund cycles) or of our [Terms of Service](/terms).

## 4. How to request a refund

Use our [contact form](/contact) or email [support@cuelara.com](mailto:support@cuelara.com) with your account email and the reason for the request. We aim to respond within 2 business days. Approved refunds are processed by Paddle and typically appear on your statement within 5–10 business days, depending on your bank or card issuer.

## 5. Changes to this policy

We may update this policy from time to time; the date at the top reflects the latest version. Changes apply to charges made after the update, not retroactively.

## 6. Contact

Questions about a charge or this policy: [contact us](/contact) or email [support@cuelara.com](mailto:support@cuelara.com).
`;

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      title="Refund Policy"
      updated="September 29, 2026"
      intro="How refunds work for Cuelara paid plans, billed through Paddle."
      markdown={CONTENT}
    />
  );
}
