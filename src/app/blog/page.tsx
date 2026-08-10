"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Calendar, Clock, ChevronRight, Mail } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All", "Updates", "Guides", "Case Studies"];

const FEATURED_POST = {
  id: "feat-1",
  title: "The Ultimate Guide to Token Optimization in GPT-4o",
  excerpt: "Discover the exact prompt engineering strategies we use to reduce token costs by up to 45% without sacrificing output quality or instruction adherence.",
  category: "Guides",
  date: "Aug 12, 2026",
  readTime: "8 min read",
  image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1600",
  slug: "#",
};

const POSTS = [
  {
    id: 1,
    title: "How We Built the Prompt Debugger Engine",
    excerpt: "A deep dive into the heuristics and AST parsing techniques behind our newest vulnerability detection tool.",
    category: "Case Studies",
    date: "Aug 05, 2026",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
    slug: "#",
  },
  {
    id: 2,
    title: "Cuelara Pro is Now Live!",
    excerpt: "Introducing API access, saved workspaces, and team collaboration features for enterprise teams.",
    category: "Updates",
    date: "Jul 28, 2026",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
    slug: "#",
  },
  {
    id: 3,
    title: "Why Zero-Shot Prompts Fail in Production",
    excerpt: "Learn why relying solely on zero-shot prompting can lead to hallucinations, and how to fix it with few-shot techniques.",
    category: "Guides",
    date: "Jul 15, 2026",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1633412802994-5c058f151b66?auto=format&fit=crop&q=80&w=800",
    slug: "#",
  },
  {
    id: 4,
    title: "Benchmarking Claude 3.5 Sonnet vs GPT-4o",
    excerpt: "We ran 10,000 prompts through both models to determine which is truly better at following complex JSON schemas.",
    category: "Case Studies",
    date: "Jul 02, 2026",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800",
    slug: "#",
  },
  {
    id: 5,
    title: "New Feature: Diff & Cost Estimation",
    excerpt: "You can now visually compare token usage and estimated API costs side-by-side inside the optimizer.",
    category: "Updates",
    date: "Jun 20, 2026",
    readTime: "2 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
    slug: "#",
  },
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPosts = POSTS.filter(
    (post) => activeCategory === "All" || post.category === activeCategory
  );

  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      
      {/* 1. Dynamic Hero Section */}
      <section className="relative w-full pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              Engineering Blog
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight mb-6">
              Engineering the Future <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                of AI Prompts
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Deep dives into token optimization, prompt heuristics, and how to build production-ready AI applications.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 w-full pb-24">
        
        {/* 2. Featured Article */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <Link href={FEATURED_POST.slug} className="group flex flex-col lg:flex-row bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 relative">
            <div className="lg:w-3/5 h-[300px] lg:h-[400px] relative overflow-hidden">
              <img 
                src={FEATURED_POST.image} 
                alt={FEATURED_POST.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent lg:hidden" />
            </div>
            
            <div className="lg:w-2/5 p-8 md:p-10 flex flex-col justify-center relative">
              <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground mb-4">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {FEATURED_POST.category}
                </span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {FEATURED_POST.date}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {FEATURED_POST.readTime}</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight group-hover:text-primary transition-colors">
                {FEATURED_POST.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {FEATURED_POST.excerpt}
              </p>
              
              <div className="mt-auto flex items-center gap-2 text-sm font-bold text-primary group-hover:translate-x-2 transition-transform">
                Read Article <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 3. Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{category}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Animated Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post, i) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link href={post.slug} className="group flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all h-full">
                  <div className="w-full h-48 relative overflow-hidden bg-muted">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-2.5 py-1 rounded-md bg-background/90 backdrop-blur-sm text-[10px] font-bold text-foreground uppercase tracking-wider shadow-sm">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-3">
                      <span>{post.date}</span>
                      <span>{post.readTime}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6">
                      {post.excerpt}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Read Post</span>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors group-hover:translate-x-1 transform duration-300">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
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
            12
          </button>
          
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 5. Newsletter CTA */}
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
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Stay ahead of the curve</h3>
              <p className="text-muted-foreground mb-8">
                Get the latest prompt engineering strategies, token optimization tricks, and platform updates delivered straight to your inbox once a month. No spam.
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
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
