import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diff & Cost Estimate | Visual Prompt Diff & LLM Token Savings Calculator",
  description: "Compare two prompt versions side-by-side with visual text diff highlighting. Calculate token reductions, latency improvements, and dollar savings across OpenAI, Anthropic, and Gemini.",
  keywords: [
    "Prompt Diff Tool",
    "AI Cost Estimate",
    "Prompt Token Calculator",
    "Compare Prompts Side by Side",
    "Prompt Cost Estimator",
    "LLM Cost Comparison",
    "OpenAI Cost Calculator",
    "Claude Token Savings",
    "Prompt Versioning Tool",
    "Reduce LLM Bills"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/compare-estimate",
  },
  openGraph: {
    title: "Diff & Cost Estimate | Visual Prompt Diff & Token Savings Calculator",
    description: "Compare your original prompt with an optimized version to visualize text diffs and compute exact API dollar savings.",
    url: "https://cuelara.com/tools/compare-estimate",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diff & Cost Estimate | Compare AI Prompts",
    description: "Visual side-by-side prompt diffing with instant token and dollar cost calculations.",
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
