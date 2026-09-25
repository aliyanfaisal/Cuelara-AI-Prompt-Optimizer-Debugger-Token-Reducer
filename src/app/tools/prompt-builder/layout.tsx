import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Builder | Turn Any Idea into a Ready-to-Use AI Prompt",
  description:
    "Describe what you want in plain words and get a complete, well-structured prompt for ChatGPT, Claude, Gemini, Cursor and more. No invented requirements, no padding, just a clear prompt you can paste and use.",
  keywords: [
    "Prompt Builder",
    "AI Prompt Generator",
    "Prompt Generator",
    "ChatGPT Prompt Builder",
    "Claude Prompt Generator",
    "Gemini Prompt Generator",
    "Cursor Prompt Generator",
    "Write Better AI Prompts",
    "Idea to Prompt",
    "Prompt Engineering Tool",
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/prompt-builder",
  },
  openGraph: {
    title: "Prompt Builder | Turn Any Idea into a Ready-to-Use AI Prompt",
    description: "Describe your idea in plain words and get a clear, structured prompt for the AI model of your choice.",
    url: "https://cuelara.com/tools/prompt-builder",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Builder | Idea to Perfect AI Prompt",
    description: "Turn a rough idea into a clear, structured prompt for ChatGPT, Claude, Gemini, Cursor and more.",
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
