import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diff & Cost Estimate | Compare Prompts",
  description: "Compare your original prompt with the optimized version to see exact cost savings and token reductions.",
  openGraph: {
    title: "Diff & Cost Estimate | Cuelara",
    description: "Compare your prompts to calculate cost savings and token diffs.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
