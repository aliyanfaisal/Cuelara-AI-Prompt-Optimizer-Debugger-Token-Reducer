import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Privacy Policy — Cuelara",
  description: "Our full privacy policy is being finalized and will be published here soon.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<ShieldCheck />} title="Privacy Policy" description="Our full privacy policy is being finalized and will be published here soon." />;
}
