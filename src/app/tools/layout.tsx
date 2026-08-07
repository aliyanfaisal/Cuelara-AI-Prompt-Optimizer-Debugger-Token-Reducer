import { Metadata } from "next";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "AI Prompt Engineering Toolkit | Cuelara",
  description: "A comprehensive suite of tools to write, optimize, debug, and analyze your AI prompts for frontier LLMs.",
  openGraph: {
    title: "AI Prompt Engineering Toolkit | Cuelara",
    description: "Write, optimize, and debug your AI prompts for maximum efficiency.",
    type: "website",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
