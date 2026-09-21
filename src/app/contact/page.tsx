import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Contact — Cuelara",
  description: "A way to reach us directly is coming soon. Thanks for your patience.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<Mail />} title="Contact" description="A way to reach us directly is coming soon. Thanks for your patience." />;
}
