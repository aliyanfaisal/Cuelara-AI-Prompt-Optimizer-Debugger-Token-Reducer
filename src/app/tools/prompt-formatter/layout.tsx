import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Formatter | Standardize AI Prompts into Markdown, XML & JSON",
  description: "Instantly convert messy walls of text into cleanly formatted, standardized prompts (Markdown, XML tags, or JSON). Optimize readability and model comprehension for ChatGPT, Claude, and Gemini.",
  keywords: [
    "AI Prompt Formatter",
    "Prompt Formatter",
    "Markdown Prompt Generator",
    "XML Claude Prompt Format",
    "JSON Prompt Structure",
    "Prompt Formatting Tool",
    "Standardize AI Instructions",
    "Clean Up AI Prompts",
    "Structured Prompt Engineering",
    "Prompt Structure Layouts"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/prompt-formatter",
  },
  openGraph: {
    title: "Prompt Formatter | Standardize AI Prompts into Markdown, XML & JSON",
    description: "Convert messy walls of text into standardized, model-friendly sections in seconds.",
    url: "https://cuelara.com/tools/prompt-formatter",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Formatter | Clean & Structure AI Prompts",
    description: "Format messy text into structured Markdown, XML, or JSON prompts for instant AI comprehension.",
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
