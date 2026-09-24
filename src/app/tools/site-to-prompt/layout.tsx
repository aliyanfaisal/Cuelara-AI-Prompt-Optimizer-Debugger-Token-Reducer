import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site to Prompt | Turn Any Website's Design into an AI Prompt for v0, Bolt & Midjourney",
  description: "Get a prompt that recreates any website's design: colors, typography, spacing, layout, sections and tech stack, ready for v0, Bolt, Claude, ChatGPT, Midjourney or FLUX. We measure the real rendered page, not a screenshot.",
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
    "Website Layout to Prompt",
    "Detect Website Tech Stack",
    "Recreate Website Design with AI",
  ],
  authors: [{ name: "Cuelara" }],
  creator: "Cuelara",
  publisher: "Cuelara",
  alternates: { canonical: "/tools/site-to-prompt" },
  openGraph: {
    title: "Site to Prompt | Turn Any Website's Design into an AI Prompt",
    description: "Turn a website's design into a ready-to-use AI prompt: exact colors, fonts, layout, sections and tech stack, for AI UI builders and image generators.",
    url: "https://cuelara.com/tools/site-to-prompt",
    siteName: "Cuelara",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Site to Prompt | Website Design to AI Prompt",
    description: "Paste a URL, get a prompt that rebuilds its design: colors, fonts, layout, sections and tech stack.",
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
