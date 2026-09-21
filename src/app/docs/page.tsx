import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "API Documentation — Cuelara",
  description: "Endpoints, authentication and code samples for calling Cuelara from your own apps are on the way.",
  robots: { index: false },
};

export default function Page() {
  return <ComingSoon icon={<BookOpen />} title="API Documentation" description="Endpoints, authentication and code samples for calling Cuelara from your own apps are on the way." />;
}
