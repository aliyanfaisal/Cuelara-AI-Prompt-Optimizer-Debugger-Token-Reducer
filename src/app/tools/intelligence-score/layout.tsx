import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intelligence Score | AI Prompt Clarity & Quality Grader (0-100)",
  description: "Grade your prompt's clarity, specificity, and AI-readiness with an instant 0–100 intelligence score. Get actionable suggestions before prompting ChatGPT, Claude, or Gemini.",
  keywords: [
    "Prompt Intelligence Score",
    "AI Prompt Grader",
    "Grade AI Prompts",
    "Prompt Clarity Checker",
    "Test AI Prompts",
    "Prompt Quality Score",
    "Prompt Engineering Evaluation",
    "Prompt Optimization Score",
    "AI Prompt Assessment"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/intelligence-score",
  },
  openGraph: {
    title: "Intelligence Score | AI Prompt Clarity & Quality Grader (0-100)",
    description: "Evaluate your prompt's clarity, constraint density, and readiness for frontier LLMs.",
    url: "https://cuelara.com/tools/intelligence-score",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Intelligence Score | AI Prompt Grader",
    description: "Get a comprehensive 0–100 intelligence score evaluating your prompt before running it in AI.",
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
