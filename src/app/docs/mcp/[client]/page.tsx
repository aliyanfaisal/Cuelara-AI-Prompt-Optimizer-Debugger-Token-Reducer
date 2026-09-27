import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Terminal, MessageSquare, MousePointer2, Code2, Bot, Sparkles, Rocket, type LucideIcon } from "lucide-react";
import { siteUrl } from "@/lib/blog";
import { CodeBlock } from "@/components/markdown/CodeBlock";
import { markdownProseClass } from "@/components/markdown/prose";
import { MCP_CLIENTS, getMcpClient, type McpClientDoc } from "@/lib/docs/mcp-clients";

const ICONS: Record<McpClientDoc["icon"], LucideIcon> = {
  terminal: Terminal,
  "message-square": MessageSquare,
  "mouse-pointer": MousePointer2,
  code: Code2,
  github: Bot,
  sparkles: Sparkles,
  rocket: Rocket,
};

export function generateStaticParams() {
  return MCP_CLIENTS.map((c) => ({ client: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ client: string }> }): Promise<Metadata> {
  const { client: slug } = await params;
  const client = getMcpClient(slug);
  if (!client) return {};
  return {
    title: `Connect ${client.name} — Cuelara MCP`,
    description: client.tagline,
  };
}

export default async function Page({ params }: { params: Promise<{ client: string }> }) {
  const { client: slug } = await params;
  const client = getMcpClient(slug);
  if (!client) notFound();

  const Icon = ICONS[client.icon];

  return (
    <article className="container mx-auto max-w-3xl px-4 py-24 md:py-32">
      <Link href="/docs/mcp" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> MCP overview
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{client.name}</h1>
          <p className="text-sm text-muted-foreground">{client.tagline}</p>
        </div>
      </div>
      <div className={markdownProseClass}>
        <ReactMarkdown components={{ pre: CodeBlock }}>{client.content(siteUrl())}</ReactMarkdown>
      </div>
    </article>
  );
}
