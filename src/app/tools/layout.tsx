import { Metadata } from "next";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Prompt Optimizer & Context Extractor Tools | Cuelara",
  description: "Free tools to turn rough prompts into structured, production-ready instructions and extract only the relevant context from large documents for ChatGPT, Claude, and Gemini.",
  openGraph: {
    title: "Prompt Optimizer & Context Extractor Tools | Cuelara",
    description: "Structure your prompts and cut document token usage with Cuelara's core AI prompt engineering tools.",
    type: "website",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
