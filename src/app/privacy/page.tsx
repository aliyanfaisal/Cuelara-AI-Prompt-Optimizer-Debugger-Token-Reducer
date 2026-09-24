import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { siteUrl } from "@/lib/blog";

const TITLE = "Privacy Policy";
const DESCRIPTION = "What Cuelara collects, why, who we share it with, how long we keep it and the choices you have.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", title: `${TITLE} | Cuelara`, description: DESCRIPTION, url: `${siteUrl()}/privacy` },
};

const CONTENT = `
## 1. Who we are

Cuelara ("we", "us") runs the website at cuelara.com and the tools, cookbook and blog on it. This policy explains what personal information we collect when you use Cuelara, why we collect it, and what you can do about it. If you have a question, [contact us](/contact).

## 2. What we collect

### Information you give us

- **Account details.** If you create an account we store your email address, your name (if you give one) and a securely hashed password. We never store your password in readable form.
- **Contact messages.** If you use the contact form we store your name, email address, subject and message so we can reply.
- **Uploaded documents.** If you use the Context Extractor, we process the file you upload (see "Uploaded documents" below).

### Information collected automatically

- **Usage counts.** To enforce daily limits we keep a count of how many times each tool was used per day. For signed-in users the count is tied to the account. For visitors it is tied to a one-way hash of the IP address, not the address itself.
- **Service logs.** We log technical details of calls to AI providers: which provider, model and tool, whether the call succeeded, and any error message. These logs do not include your prompts or documents.
- **Email logs.** We record the recipient, subject and delivery result of emails we send you (for example account activation and password reset).
- **Cookies and local storage.** See section 7.

## 3. What we do not store

The text you paste into the prompt tools (Prompt Optimizer, Token Optimizer, Prompt Debugger, Prompt Formatter, Intelligence Score, Context Extractor prompts, Site to Prompt) is processed to give you a result. We do not save it to your account and we do not use it to train models. It is handled by the AI providers described in section 5 for the duration of the request.

## 4. Uploaded documents

When you upload a document to the Context Extractor, we extract its text, split it into sections and compute numerical embeddings so we can find the passages relevant to your question. The extracted text and embeddings are stored in our database, linked to your account or your visitor identifier, so you can ask several questions about the same file. They are removed automatically after about 24 hours, and stale ones are cleared whenever you upload a new document. Please do not upload documents you are not allowed to share with a service provider.

## 5. Who we share information with

We do not sell your personal information. We share it only with the service providers that help us run Cuelara:

- **AI model providers.** To produce results, the content of a tool request is sent to one of the AI providers we use, which currently may include Google (Gemini), OpenAI, Anthropic (Claude), xAI (Grok), Groq and OpenRouter. Each provider processes that content under its own terms and privacy policy.
- **Hosting and database providers.** Our site and database run on third-party infrastructure.
- **Email delivery.** Emails we send you go through our SMTP mail provider.
- **Legal reasons.** We may disclose information if the law requires it or to protect the rights, safety and security of our users or the service.

Do not include passwords, payment card numbers, health information or other highly sensitive data in tool inputs.

## 6. How long we keep information

- **Account details:** until you ask us to delete your account.
- **Contact messages:** for as long as needed to handle your request and keep a record of it, then deleted on request.
- **Uploaded documents and embeddings:** about 24 hours.
- **Usage counts and service logs:** for a limited period for abuse prevention, capacity planning and debugging.

## 7. Cookies and local storage

We use a small number of essential items:

- a **session cookie** that keeps you signed in, and
- a **theme preference** in your browser's local storage (light or dark mode).

We do not currently use advertising cookies or third-party analytics scripts. If that changes we will update this policy first.

## 8. Security

We use HTTPS, hash passwords, restrict administrative access and keep API keys on the server. No system is perfectly secure, so we cannot guarantee absolute security, but we work to protect your information and to fix issues promptly.

## 9. Your choices and rights

Depending on where you live, you may have the right to access, correct, delete or export your personal information, to object to or restrict certain processing, and to complain to your local data protection authority. To exercise any of these rights, [contact us](/contact) from the email address on your account and tell us what you need. We will respond within a reasonable time, and within the deadlines the law requires.

## 10. Children

Cuelara is not directed at children under 13 and we do not knowingly collect their personal information. If you believe a child has given us information, contact us and we will delete it.

## 11. International transfers

Our providers may process information in countries other than your own. Where the law requires it, we rely on appropriate safeguards for those transfers.

## 12. Changes to this policy

We may update this policy from time to time. When we make a meaningful change we will update the date at the top of this page and, where appropriate, tell you by email or on the site.

## 13. Contact

Questions or requests about privacy: use our [contact form](/contact).
`;

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="September 24, 2026"
      intro="We keep this policy short and specific. It describes what Cuelara actually collects and does today."
      markdown={CONTENT}
    />
  );
}
