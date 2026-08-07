import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token Optimizer | Reduce Prompt Costs",
  description: "Compress your prompt token count by up to 50% without losing meaning, constraints, or functionality. Perfect for high-volume API use cases.",
  openGraph: {
    title: "Token Optimizer | Cuelara",
    description: "Compress your prompt token count and save on API costs.",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
