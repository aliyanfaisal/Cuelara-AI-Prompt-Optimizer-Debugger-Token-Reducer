"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Code, PenTool, BarChart, Image as ImageIcon, Settings, Copy, ArrowRight } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { id: "all", label: "All Prompts", icon: null },
  { id: "engineering", label: "Engineering", icon: Code },
  { id: "content", label: "Content & SEO", icon: PenTool },
  { id: "data", label: "Data Analysis", icon: BarChart },
  { id: "image", label: "Image Gen", icon: ImageIcon },
  { id: "system", label: "System", icon: Settings },
];

const MOCK_PROMPTS = [
  {
    id: 1,
    title: "Senior React Developer Persona",
    slug: "senior-react-developer-persona",
    category: "engineering",
    model: "Claude 3.5 Sonnet",
    description: "A highly constrained system prompt for generating clean, modern React code using Tailwind and Framer Motion.",
    snippet: `You are a Senior Frontend Engineer specializing in React, Next.js, and Tailwind CSS.
Your code must adhere to the following rules:
1. Always use functional components with TypeScript.
2. Favor Tailwind utility classes over custom CSS.
3. Use Framer Motion for any micro-interactions.
4. Provide ONLY the code block, no markdown explanations unless asked.`,
  },
  {
    id: 2,
    title: "High-Converting SEO Blog Post",
    slug: "high-converting-seo-blog-post",
    category: "content",
    model: "GPT-4o",
    description: "Generate an SEO-optimized blog article with LSI keywords, compelling meta descriptions, and proper H-tags.",
    snippet: `Act as a top-tier SEO copywriter. Write a 1,500-word blog post about [TOPIC].
Constraints:
- Include the primary keyword "[KEYWORD]" in the H1 and at least two H2s.
- Keep paragraphs under 3 sentences for readability.
- Write a 160-character meta description at the very end.`,
  },
  {
    id: 3,
    title: "JSON Data Extraction Pipeline",
    slug: "json-data-extraction-pipeline",
    category: "data",
    model: "GPT-4o Mini",
    description: "Extract specific data points from messy unstructured text and strictly format it into a JSON array.",
    snippet: `Extract the following entities from the provided text: [Company Name, Revenue, CEO Name, Industry].
Output strictly as a JSON array of objects.
Do not wrap the output in markdown code blocks.
Do not include any pleasantries or explanation text.
If a value is missing, use null.`,
  },
  {
    id: 4,
    title: "Cinematic Product Photography",
    slug: "cinematic-product-photography",
    category: "image",
    model: "Midjourney v6",
    description: "A highly detailed prompt for generating photorealistic product shots with dramatic studio lighting.",
    snippet: `Commercial product photography of a sleek minimalist smart watch on a dark slate podium.
Lighting: Dramatic studio lighting, rim light, softbox reflections.
Atmosphere: Moody, premium, luxurious.
Camera: Shot on 85mm lens, f/1.8, high resolution, 8k --ar 16:9 --style raw --v 6.0`,
  },
  {
    id: 5,
    title: "Secure API Request Handler",
    slug: "secure-api-request-handler",
    category: "engineering",
    model: "Claude 3 Haiku",
    description: "Generate a secure Express/Node.js route handler with input validation and rate limiting.",
    snippet: `Write a Node.js Express route handler for a POST request to '/api/users'.
Requirements:
- Validate input using Zod.
- Sanitize data to prevent SQL injection.
- Wrap the logic in a try/catch block.
- Return standardized error responses (e.g., 400 for bad request, 500 for server error).`,
  },
  {
    id: 6,
    title: "SaaS Onboarding Email Sequence",
    slug: "saas-onboarding-email-sequence",
    category: "content",
    model: "Claude 3.5 Sonnet",
    description: "Write a 3-part automated email sequence to welcome new users and drive feature adoption.",
    snippet: `Write a 3-part email onboarding sequence for a B2B SaaS product called [PRODUCT].
Email 1: Welcome & quick win (Send immediately).
Email 2: Discovering the core feature (Send Day 2).
Email 3: Invitation to join the community/webinar (Send Day 4).
Tone: Conversational, helpful, and concise.`,
  },
];

export default function CookbookPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPrompts = MOCK_PROMPTS.filter((prompt) => {
    const matchesCategory = activeCategory === "all" || prompt.category === activeCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      
      {/* 1. Hero & Search Section */}
      <section className="relative w-full pt-32 pb-12 md:pt-40 md:pb-16 overflow-hidden flex flex-col items-center border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
              Prompt Cookbook
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              A curated library of production-ready prompts. Search, copy, and deploy highly optimized instructions for any model.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-colors opacity-50" />
              <div className="relative flex items-center bg-card border border-border/60 rounded-2xl p-2 shadow-sm">
                <div className="pl-4 pr-2 text-muted-foreground">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="text"
                  placeholder="Search prompts (e.g., 'React', 'SEO', 'Data')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-foreground text-sm py-3 px-2 focus-visible:outline-none placeholder:text-muted-foreground/60"
                />
                <div className="pr-2 hidden sm:block">
                  <span className="px-2 py-1 bg-muted rounded text-[10px] font-bold text-muted-foreground border border-border/50">⌘K</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 w-full py-12 flex flex-col">
        
        {/* Horizontal Centered Filters */}
        <div className="flex flex-col items-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 bg-muted/40 border border-border/50 rounded-xl overflow-x-auto max-w-full scrollbar-hide">
            {CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id;
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive ? "text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="cookbookCategory"
                      className="absolute inset-0 bg-background border border-border/60 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Prompt Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPrompts.length > 0 ? (
              filteredPrompts.map((prompt, i) => (
                <motion.div
                  key={prompt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="h-full"
                >
                  <Link 
                    href={`/cookbook/${prompt.slug}`} 
                    className="group flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all h-full hover:border-primary/40 relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="p-6 relative z-10 flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="px-2.5 py-1 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider border border-border/50">
                          {prompt.model}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                          <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform" />
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">
                        {prompt.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
                        {prompt.description}
                      </p>
                      
                      {/* Snippet Preview */}
                      <div className="mt-auto bg-muted/40 border border-border/50 rounded-xl p-4 relative overflow-hidden group/snippet">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-muted/90 z-10" />
                        <pre className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                          {prompt.snippet}
                        </pre>
                        
                        {/* Overlay Copy Button */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/snippet:opacity-100 transition-opacity">
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs font-bold shadow-md hover:bg-muted">
                            <Copy className="w-3.5 h-3.5" /> Quick Copy
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <p className="text-muted-foreground mb-2">No prompts found matching your search.</p>
                <button 
                  onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                  className="text-primary font-bold text-sm hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination UI */}
        <div className="flex items-center justify-center gap-2 mt-16">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              className={`w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                page === 1 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {page}
            </button>
          ))}
          
          <span className="text-muted-foreground px-2">...</span>
          
          <button className="w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            8
          </button>
          
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Newsletter CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24 p-1 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/30 to-primary/30"
        >
          <div className="bg-card rounded-[22px] p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(var(--foreground)_1px,transparent_1px)] [background-size:20px_20px]" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Code className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Never write a prompt from scratch</h3>
              <p className="text-muted-foreground mb-8">
                Get new optimized prompt templates delivered to your inbox every week. We test them, you copy them.
              </p>
              
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 px-5 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  required
                />
                <button 
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Free Prompts
                </button>
              </form>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
