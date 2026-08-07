import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Formatter | Clean & Structure Instructions",
  description: "Clean up, structure, and standardise messy prompts automatically for better readability and model comprehension.",
  openGraph: {
    title: "Prompt Formatter | Cuelara",
    description: "Format your messy AI prompts into clean, structured markdown or JSON.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
