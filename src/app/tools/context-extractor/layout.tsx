import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Context Extractor | RAG Prompt Pre-Processor & Token Reducer",
  description: "Extract only the relevant data snippets from large PDFs, CSVs, and documents via RAG. Slash LLM token costs by up to 98% and eliminate AI hallucinations in ChatGPT, Claude, and Gemini.",
  keywords: [
    "Context Extractor",
    "RAG Prompt Generator",
    "Reduce AI Token Usage",
    "Token Saver",
    "Lower OpenAI API Costs",
    "Optimize Prompts for Token Efficiency",
    "Document to Prompt",
    "AI Hallucination Prevention",
    "Prompt Engineering Toolkit",
    "Semantic Search Context",
    "Context Compressor"
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: {
    canonical: "/tools/context-extractor",
  },
  openGraph: {
    title: "Context Extractor | RAG Prompt Pre-Processor & Token Reducer",
    description: "Extract only hyper-relevant data from massive documents to slash token usage and eliminate AI hallucinations.",
    url: "https://cuelara.com/tools/context-extractor",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Context Extractor | RAG Prompt Pre-Processor",
    description: "Cut token costs by 98% and stop AI hallucinations with precision semantic context extraction.",
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
