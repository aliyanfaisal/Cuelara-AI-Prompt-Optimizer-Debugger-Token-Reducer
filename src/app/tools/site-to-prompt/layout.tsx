import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site to Prompt | Turn Any Website's Design into an AI Prompt for v0, Bolt & Midjourney",
  description: "Paste a URL and get a precise prompt that recreates its design. We measure the real colors, fonts, spacing, radii and layout from the rendered page, then write a prompt tuned for v0, Bolt, Claude, ChatGPT, Midjourney or FLUX.",
  keywords: [
    "Website to Prompt",
    "Site to Prompt",
    "Website Design to AI Prompt",
    "Clone Website Style with AI",
    "Extract Website Colors and Fonts",
    "v0 Prompt Generator",
    "Bolt.new Prompt Generator",
    "Midjourney UI Prompt",
    "Design Tokens Extractor",
    "CSS to Prompt",
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: { canonical: "/tools/site-to-prompt" },
  openGraph: {
    title: "Site to Prompt | Turn Any Website's Design into an AI Prompt",
    description: "Measure a site's real design tokens and get a ready-to-paste prompt for AI UI builders and image generators.",
    url: "https://cuelara.com/tools/site-to-prompt",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Site to Prompt | Website Design to AI Prompt",
    description: "Paste a URL, get a prompt that recreates its colors, type, spacing and layout.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
