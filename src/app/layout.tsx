import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { PublicLayoutWrapper } from "@/components/layout/PublicLayoutWrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://cuelara.com"),
  title: {
    default: "Cuelara — AI Prompt Optimizer & Context Extractor",
    template: "%s | Cuelara",
  },
  description:
    "Turn rough prompts into structured, production-ready instructions and extract only the relevant context from large documents — free tools built for ChatGPT, Claude, and Gemini.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Cuelara — AI Prompt Optimizer & Context Extractor",
    description:
      "Turn rough prompts into structured, production-ready instructions and extract only the relevant context from large documents.",
    url: "https://cuelara.com",
    siteName: "Cuelara",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cuelara — AI Prompt Optimizer & Context Extractor",
    description:
      "Turn rough prompts into structured, production-ready instructions and extract only the relevant context from large documents.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <PublicLayoutWrapper>
              {children}
            </PublicLayoutWrapper>
            <ThemeSwitcher />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
