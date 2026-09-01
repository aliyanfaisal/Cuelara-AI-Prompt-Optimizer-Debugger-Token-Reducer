import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Debugger | Scan AI Prompts for Flaws, Bias & Contradictions",
  description: "Scan your AI prompts for logical loopholes, vague constraints, edge-case vulnerabilities, and hallucinations before deploying to ChatGPT, Claude, or production LLM systems.",
  keywords: [
    "Prompt Debugger",
    "Debug AI Prompts",
    "AI Prompt Vulnerability Scanner",
    "Prompt Testing Tool",
    "Fix AI Hallucinations",
    "Prompt Engineering Best Practices",
    "Detect Prompt Bias",
    "Prompt Security Check",
    "AI Prompt Audit"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/prompt-debugger",
  },
  openGraph: {
    title: "Prompt Debugger | Scan AI Prompts for Flaws, Bias & Contradictions",
    description: "Detect logical loopholes, missing constraints, and hallucinations before you send your prompt to AI.",
    url: "https://cuelara.com/tools/prompt-debugger",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Debugger | Audit & Test AI Prompts",
    description: "Catch contradictory instructions and edge-case flaws in your prompts before production.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
