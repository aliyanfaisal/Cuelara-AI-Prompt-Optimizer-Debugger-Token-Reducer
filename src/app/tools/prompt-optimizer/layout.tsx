import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prompt Optimizer | Build Production-Ready Instructions",
  description: "Transform vague brain-dumps into precisely structured, professional prompts tailored for any frontier LLM.",
  openGraph: {
    title: "Prompt Optimizer | Cuelara",
    description: "Transform vague brain-dumps into precisely structured, professional prompts.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
