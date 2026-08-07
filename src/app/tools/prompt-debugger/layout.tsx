import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Debugger | Identify Vulnerabilities",
  description: "Identify logical loopholes, bias, and edge-cases before you deploy your prompt to production.",
  openGraph: {
    title: "Prompt Debugger | Cuelara",
    description: "Debug your AI prompts to find logical loopholes and edge-cases.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
