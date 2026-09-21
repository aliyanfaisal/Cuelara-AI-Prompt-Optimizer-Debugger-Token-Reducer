import type { Metadata } from "next";
import { History } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Changelog — Cuelara",
  description: "A running log of new tools, improvements and fixes will live here soon.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<History />} title="Changelog" description="A running log of new tools, improvements and fixes will live here soon." />;
}
