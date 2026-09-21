import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Terms of Service — Cuelara",
  description: "Our terms of service are being finalized and will be published here soon.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<ScrollText />} title="Terms of Service" description="Our terms of service are being finalized and will be published here soon." />;
}
