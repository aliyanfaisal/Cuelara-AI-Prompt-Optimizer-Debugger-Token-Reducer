"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Code2, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden pt-24 pb-32 md:pt-36 md:pb-48">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-accent/20 blur-[120px] mix-blend-screen" />
        </div>

        <div className="container mx-auto px-4 md:px-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            <span>The professional AI prompt toolkit</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl mb-6"
          >
            Better prompts. <br className="hidden sm:block" />
            <span className="text-gradient-primary">Fewer tokens.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl text-lg text-muted-foreground md:text-xl mb-10 leading-relaxed"
          >
            Stop wasting API costs on bloated prompts. Cuelara optimizes your instructions for maximum AI understanding, structural clarity, and token efficiency.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/tools"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
            >
              Start Optimizing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/cookbook"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background/50 backdrop-blur-sm px-8 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Explore Cookbook
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-24 bg-secondary/30 border-y border-border/40">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="h-6 w-6 text-primary" />}
              title="Token Optimization"
              description="Reduce prompt token usage by up to 40% without sacrificing meaning, saving you thousands on OpenAI and Anthropic API costs."
            />
            <FeatureCard 
              icon={<Code2 className="h-6 w-6 text-primary" />}
              title="Developer Focused"
              description="Built specifically for software engineers. Formats your messy thoughts into structured, highly-technical instructions for coding LLMs."
            />
            <FeatureCard 
              icon={<ShieldCheck className="h-6 w-6 text-primary" />}
              title="Prompt Debugger"
              description="Automatically detects vague wording, contradictory constraints, and missing context before you hit send."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass p-8 rounded-2xl flex flex-col items-start text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
      <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
