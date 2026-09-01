import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Optimizer | Convert Rough Ideas into Perfect AI Prompts",
  description: "Transform messy, vague instructions into high-performing, structured prompts for ChatGPT, Claude, and Gemini. Choose from Coding, Writing, Business, and Research modes to get perfect AI answers on your first try.",
  keywords: [
    "AI Prompt Optimizer",
    "Prompt Engineering Tool",
    "ChatGPT Prompt Optimizer",
    "Claude Prompt Generator",
    "Best AI Prompts",
    "Prompt Engineering Best Practices",
    "How to Structure an AI Prompt",
    "Prompt Templates for Developers",
    "AI Instruction Generator",
    "Gemini Prompt Templates"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/prompt-optimizer",
  },
  openGraph: {
    title: "Prompt Optimizer | Convert Rough Ideas into Perfect AI Prompts",
    description: "Transform messy, vague thoughts into structured, high-performing prompts for ChatGPT, Claude, and Gemini.",
    url: "https://cuelara.com/tools/prompt-optimizer",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Optimizer | Craft High-Performing AI Prompts",
    description: "Get accurate, hallucination-free AI responses on your first try with structured prompt engineering.",
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
