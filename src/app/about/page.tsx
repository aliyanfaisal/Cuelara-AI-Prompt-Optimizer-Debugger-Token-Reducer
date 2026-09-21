import type { Metadata } from "next";
import { Info } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "About Us — Cuelara",
  description: "The story behind Cuelara and the team building it is coming soon.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<Info />} title="About Us" description="The story behind Cuelara and the team building it is coming soon." />;
}
