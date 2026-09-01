import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token Optimizer | Reduce AI Prompt Token Usage & Cut API Costs",
  description: "Compress your prompt token count by up to 50% without losing meaning, constraints, or functionality. Calculate token savings and slash OpenAI, Claude, and Gemini API bills.",
  keywords: [
    "Token Optimizer",
    "Token Reducer",
    "Token Saver",
    "Reduce AI Token Usage",
    "Lower OpenAI API Costs",
    "Token Estimator Tool",
    "Optimize Prompts for Token Efficiency",
    "Concise AI Prompts",
    "Prompt Engineering Token Reduction",
    "Compress AI Prompts"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/token-optimizer",
  },
  openGraph: {
    title: "Token Optimizer | Reduce AI Prompt Token Usage & Cut API Costs",
    description: "Compress your prompt token count by up to 50% without losing meaning or constraints.",
    url: "https://cuelara.com/tools/token-optimizer",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Token Optimizer | Compress Prompt Tokens",
    description: "Cut your AI API costs in half with smart prompt token compression.",
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
