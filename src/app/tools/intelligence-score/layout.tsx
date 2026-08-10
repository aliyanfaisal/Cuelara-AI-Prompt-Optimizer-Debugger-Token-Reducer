import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intelligence Score | Grade Your Prompts",
  description: "Grade the clarity and effectiveness of your prompt before you send it to the model.",
  openGraph: {
    title: "Intelligence Score | Cuelara",
    description: "Grade the clarity and effectiveness of your prompt.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
