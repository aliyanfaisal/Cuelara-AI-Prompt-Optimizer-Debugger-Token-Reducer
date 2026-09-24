import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { siteUrl } from "@/lib/blog";

const TITLE = "Terms of Service";
const DESCRIPTION = "The rules for using Cuelara: accounts, acceptable use, usage limits, AI output, content and liability.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { type: "website", title: `${TITLE} | Cuelara`, description: DESCRIPTION, url: `${siteUrl()}/terms` },
};

const CONTENT = `
## 1. Agreement

These terms govern your use of Cuelara, including cuelara.com, our prompt tools, the Prompt Cookbook, the blog and any related services (together, the "Service"). By using the Service you agree to these terms and to our [Privacy Policy](/privacy). If you do not agree, please do not use the Service.

## 2. Who can use Cuelara

You must be at least 13 years old, and old enough in your country to enter into a binding agreement. If you use Cuelara for an organization, you confirm you have the authority to accept these terms on its behalf.

## 3. Your account

Some features need an account. You agree to give accurate information, keep your password secure and tell us promptly if you think your account has been accessed without permission. You are responsible for activity under your account. We may suspend or close accounts that break these terms.

## 4. Acceptable use

You agree not to:

- break the law or infringe anyone's rights using the Service;
- upload or submit content you do not have the right to use, or that contains malware;
- attempt to disrupt, overload, probe or bypass the security or usage limits of the Service;
- scrape, resell or systematically extract the Service or its data without our written permission;
- use the Service to generate content that is unlawful, harassing, deceptive or that sexually exploits or endangers children;
- use the Service to analyze a website you do not have permission to analyze in a way that violates that site's terms or the law;
- misrepresent your identity or impersonate others.

## 5. Plans and usage limits

Cuelara offers a free plan and paid plans with different daily usage limits, shown on the [pricing page](/pricing). Limits apply per tool per day and may differ for visitors, signed-in users and each plan. We may change limits, plans and prices; where a change affects a plan you have paid for, we will give you reasonable notice. Paid plans are currently arranged through our team, and any payment terms will be agreed with you before you are charged.

## 6. AI output

Cuelara's tools use artificial intelligence and automated analysis. Results can be incomplete, inaccurate or unsuitable for your purpose, and may be similar to output other users receive. You are responsible for reviewing output before you rely on it or publish it, especially for legal, medical, financial, security or other high-stakes decisions. Token counts, cost estimates and scores are estimates, not guarantees.

## 7. Your content

You keep ownership of the content you submit (your prompts, documents and messages) and of the output you generate. You give us a limited, non-exclusive license to process that content only to operate and provide the Service to you, including by sending it to the AI providers described in our Privacy Policy. You confirm you have the rights needed to submit it.

## 8. Our content and intellectual property

The Service, including its software, design, branding, Prompt Cookbook and blog articles, belongs to Cuelara or its licensors and is protected by intellectual property laws. You may use cookbook prompts and generated output for your own personal or business purposes. You may not copy, republish or resell our articles, cookbook or software as your own product without permission.

## 9. Third-party services

The Service relies on third parties, such as AI model providers, hosting and email services, and may link to third-party sites. We do not control them and are not responsible for their content, availability or practices.

## 10. Availability and changes

We work to keep Cuelara available and improving, but we provide it on an as-is basis. It may be interrupted, changed or discontinued in whole or in part, including features, tools and limits.

## 11. Disclaimer of warranties

To the fullest extent permitted by law, the Service is provided "as is" and "as available", without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy and non-infringement.

## 12. Limitation of liability

To the fullest extent permitted by law, Cuelara and its team will not be liable for any indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data or goodwill, arising from your use of the Service. Our total liability for any claim relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim or USD 50. Nothing in these terms limits liability that cannot be limited by law.

## 13. Indemnity

You agree to defend and compensate us for claims and costs arising from your misuse of the Service, your content or your breach of these terms, to the extent permitted by law.

## 14. Termination

You can stop using Cuelara at any time and can ask us to delete your account. We may suspend or end your access if you breach these terms, put the Service or other users at risk, or where the law requires. Sections that by their nature should continue (such as ownership, disclaimers and liability limits) survive termination.

## 15. Changes to these terms

We may update these terms. When we make a material change we will update the date at the top of this page and, where appropriate, notify you. Continuing to use the Service after a change means you accept the updated terms.

## 16. General

These terms are the entire agreement between you and Cuelara about the Service. If a part is found unenforceable, the rest stays in effect. Our failure to enforce a right is not a waiver of it. You may not transfer your rights under these terms without our consent.

## 17. Contact

Questions about these terms: use our [contact form](/contact).
`;

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="September 24, 2026"
      intro="Please read these terms before using Cuelara. They explain what you can expect from us and what we expect from you."
      markdown={CONTENT}
    />
  );
}
