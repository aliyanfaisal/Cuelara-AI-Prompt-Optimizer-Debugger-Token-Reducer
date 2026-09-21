import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Pricing — Cuelara",
  description: "Simple plans with higher limits, API access and saved workspaces are coming. The core tools stay free to use.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<Tag />} title="Pricing" description="Simple plans with higher limits, API access and saved workspaces are coming. The core tools stay free to use." />;
}
