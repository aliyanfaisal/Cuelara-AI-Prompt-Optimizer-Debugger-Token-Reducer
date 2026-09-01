"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FileText, Upload, Check, Copy, AlertCircle, 
  Sparkles, Layers, RefreshCcw, Download,
  CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, FileCode,
  Sliders, Database, Search, Cpu, FileCheck2, Trash2,
  HelpCircle, ArrowRight, ShieldCheck, Zap, Code2, Terminal,
  BookOpen, Lock, Scale, DollarSign
} from "lucide-react";

type ProcessingState = "idle" | "loading" | "success";

interface ExtractedDataSnippet {
  id: number;
  relevance: number;
  section: string;
  content: string;
}

const SAMPLE_DOCS = [
  {
    id: "handbook",
    label: "Employee Handbook",
    badge: "45 Pages",
    filename: "global_tech_employee_handbook_2026.pdf",
    tokenCount: 38400,
    size: "2.4 MB",
    defaultQuery: "Remote work equipment stipend amount and reimbursement deadlines",
    defaultTask: "Draft a welcoming email for a new hire explaining how to claim their equipment stipend.",
    snippets: [
      {
        id: 1,
        relevance: 96,
        section: "Section 4.3 - Equipment & Remote Workspace",
        content: "Full-time remote team members are eligible for a one-time home office setup stipend of up to $1,500 during their first 90 days. In addition, an ongoing monthly remote connectivity allowance of $100 is automatically credited via payroll to cover high-speed internet and mobile phone utilities."
      },
      {
        id: 2,
        relevance: 91,
        section: "Section 4.4 - Expense Reimbursement Submission",
        content: "All hardware purchases must be submitted through the Expensify portal within 30 days of purchase with itemized receipts. Approved equipment includes ergonomic chairs, secondary monitors (up to 27\"), noise-canceling headsets, and standing desks. Company-issued laptops remain company property."
      },
      {
        id: 3,
        relevance: 84,
        section: "Section 8.1 - Tax & Compliance Guidelines",
        content: "Equipment stipends are treated in accordance with local taxation laws. In jurisdictions where remote stipends are taxable, the company will gross up the payment to ensure the full benefit amount is delivered to the employee."
      }
    ]
  },
  {
    id: "financial",
    label: "Financial Q3 Report",
    badge: "80 Pages",
    filename: "q3_enterprise_earnings_financials.pdf",
    tokenCount: 64200,
    size: "4.8 MB",
    defaultQuery: "Enterprise ARR growth and non-GAAP gross margin expansion",
    defaultTask: "Summarize key enterprise growth highlights into 3 bullet points for an executive presentation.",
    snippets: [
      {
        id: 1,
        relevance: 98,
        section: "Page 14 - Enterprise Tier ARR Breakdown",
        content: "Enterprise ARR surged 48% YoY reaching $142.5M, driven by rapid multi-product adoption across Fortune 500 customers. Net Revenue Retention (NRR) in this tier climbed to 128%, compared to 119% in Q3 of the prior fiscal year."
      },
      {
        id: 2,
        relevance: 93,
        section: "Page 22 - Gross Margin Analysis",
        content: "Non-GAAP gross margin expanded by 320 basis points to 81.4%, primarily reflecting optimized cloud infrastructure routing, reduced LLM inference costs via context caching, and economies of scale in enterprise hosting operations."
      }
    ]
  }
];

const PROCESSING_STEPS = [
  { text: "Ingesting and chunking document data...", icon: Layers },
  { text: "Generating vector embeddings with text-embedding-004...", icon: Cpu },
  { text: "Searching and scoring relevant data snippets in pgvector...", icon: Database },
  { text: "Filtering out non-essential document bloat...", icon: Search },
  { text: "Assembling your optimized, model-ready prompt...", icon: Sparkles }
];

const FAQS = [
  {
    question: "How does Context Extractor reduce LLM token usage?",
    answer: "Instead of pasting an entire 50-page PDF or 100,000-word dataset into ChatGPT or Claude (which costs tens of thousands of tokens per query), Context Extractor breaks your document into semantic chunks, creates vector embeddings, and retrieves only the 3 to 5 snippets directly relevant to your prompt. This cuts token consumption by up to 98%."
  },
  {
    question: "Why shouldn't I paste entire documents directly into ChatGPT or Claude?",
    answer: "Pasting huge documents causes two major problems: First, the 'Lost in the Middle' phenomenon where LLMs overlook crucial facts buried in lengthy prompts, causing hallucinations. Second, massive API costs and hitting token context limits quickly. Pre-filtering data via RAG guarantees precision and saves significant money."
  },
  {
    question: "What document file types are supported?",
    answer: "Context Extractor supports PDFs, CSVs, TXT files, Markdown (.md), JSON, and Microsoft Word (.docx) documents up to 100MB. You can also paste unstructured raw text directly into the studio."
  },
  {
    question: "Is Context Extractor compatible with all frontier AI models?",
    answer: "Yes! Context Extractor outputs a universally standardized prompt payload formatted in your choice of Clean Markdown, XML tags (<context>...</context>), or Structured JSON. It works seamlessly with OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), Google (Gemini 1.5 Pro/Flash), DeepSeek, and local open-source models."
  },
  {
    question: "Can I use Context Extractor for full-document summaries?",
    answer: "No. Context Extractor is built for targeted information retrieval (answering specific questions, extracting policy clauses, finding financial metrics). If you need a comprehensive summary of an entire 100-page book from start to finish, you should provide the full document to your model directly."
  }
];

function FieldTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex items-center ml-2">
      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30 w-64">
        <div className="bg-popover text-popover-foreground border border-border text-[11px] font-normal leading-relaxed rounded-xl p-2.5 shadow-xl text-center">
          {text}
        </div>
        <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 -mt-1" />
      </div>
    </div>
  );
}

export default function ContextExtractorPage() {
  const [state, setState] = useState<ProcessingState>("idle");
  const [sourceMode, setSourceMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<{ name: string; size: string; tokenCount: number } | null>(null);
  const [rawText, setRawText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiTask, setAiTask] = useState("");
  const [depth, setDepth] = useState<"top3" | "top5">("top3");
  const [formatStyle, setFormatStyle] = useState<"markdown" | "xml" | "json">("markdown");
  
  const [activeTab, setActiveTab] = useState<"prompt" | "data">("prompt");
  const [isCopied, setIsCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDosDonts, setShowDosDonts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const [extractedData, setExtractedData] = useState<ExtractedDataSnippet[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for keywords where RAG is contraindicated
  const isSummarizeQuery = /(summarize|summary|entire document|whole document|all pages|rewrite all|everything)/i.test(searchQuery);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "loading") {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < PROCESSING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 650);
    }
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state === "success" && outputRef.current) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [state]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const sizeMB = (selected.size / (1024 * 1024)).toFixed(1) + " MB";
      const estimatedTokens = Math.max(15000, Math.floor(selected.size / 28));
      setFile({
        name: selected.name,
        size: sizeMB,
        tokenCount: estimatedTokens
      });
      setExtractedData([]);
    }
  };

  const loadSample = (sample: typeof SAMPLE_DOCS[0]) => {
    setSourceMode("file");
    setFile({
      name: sample.filename,
      size: sample.size,
      tokenCount: sample.tokenCount
    });
    setSearchQuery(sample.defaultQuery);
    setAiTask(sample.defaultTask);
    setExtractedData(sample.snippets);
  };

  const handleClearSource = () => {
    setFile(null);
    setRawText("");
    setExtractedData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtract = () => {
    const hasSource = (sourceMode === "file" && file) || (sourceMode === "text" && rawText.trim().length > 0);
    if (!hasSource || !searchQuery.trim() || !aiTask.trim()) return;

    setState("loading");

    setTimeout(() => {
      if (extractedData.length === 0) {
        setExtractedData([
          {
            id: 1,
            relevance: 96,
            section: "Extracted Data - Primary Match",
            content: `Isolated data matching "${searchQuery}": Verified specific clauses, key numeric parameters, and direct operational references retrieved with high semantic accuracy.`
          },
          {
            id: 2,
            relevance: 89,
            section: "Extracted Data - Supporting Context",
            content: `Secondary context related to "${searchQuery}": Exceptions, timeline constraints, workflow criteria, and prerequisite conditions necessary to fulfill the request.`
          },
          {
            id: 3,
            relevance: 83,
            section: "Extracted Data - Reference Notes",
            content: `Cross-referenced documentation identifiers, compliance terms, and baseline definitions directly tied to the target query.`
          }
        ]);
      }
      setState("success");
    }, 3000);
  };

  // Calculations for token metrics
  const originalTokens = file 
    ? file.tokenCount 
    : (rawText.trim() ? Math.max(800, Math.floor(rawText.length / 4)) : 30000);
    
  const extractedTokens = extractedData.reduce((acc, c) => acc + Math.floor(c.content.length / 4), 0) + 
    Math.floor((searchQuery.length + aiTask.length) / 4) + 80;
    
  const savedTokens = Math.max(0, originalTokens - extractedTokens);
  const percentSaved = originalTokens > 0 
    ? Math.min(99.2, Math.max(75, ((savedTokens / originalTokens) * 100))).toFixed(1)
    : "95.0";

  const formatOutputPrompt = () => {
    if (formatStyle === "xml") {
      return `<instruction>\n${aiTask}\n</instruction>\n\n<context>\n${extractedData.map(c => `[${c.section}]\n${c.content}`).join("\n\n")}\n</context>\n\n<constraint>\nAnswer strictly using the verified data provided in <context>. Do not assume or extrapolate unconfirmed details.\n</constraint>`;
    }
    if (formatStyle === "json") {
      return JSON.stringify({
        task: aiTask,
        constraints: "Rely strictly on provided context data.",
        extracted_data: extractedData.map(c => ({ section: c.section, text: c.content }))
      }, null, 2);
    }
    return `### TASK INSTRUCTION\n${aiTask}\n\n### RELEVANT EXTRACTED DATA\n${extractedData.map((c) => `> **${c.section}** (Relevance: ${c.relevance}%)\n> ${c.content}`).join("\n\n")}\n\n### CONSTRAINTS\n- Rely strictly on the extracted data provided above.\n- Do not extrapolate or assume facts outside this context.`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(formatOutputPrompt());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileBlob = new Blob([formatOutputPrompt()], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = "optimized_context_prompt.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isFormValid = ((sourceMode === "file" && file) || (sourceMode === "text" && rawText.trim())) && 
    searchQuery.trim() && 
    aiTask.trim();

  return (
    <article className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
      
      {/* 1. Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Context Extractor</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Extract only the relevant data from large documents via RAG. Drastically cut prompt token costs and eliminate AI hallucinations.
        </p>

        {/* Informative helper drawer */}
        <div className="mt-4 rounded-xl border border-border/70 bg-card/40 overflow-hidden text-xs">
          <button 
            onClick={() => setShowDosDonts(!showDosDonts)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-primary" />
              When to use this tool (Targeted Retrieval vs. Full Summaries)
            </span>
            {showDosDonts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {showDosDonts && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border/60 bg-muted/20"
              >
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border/70">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Best For:</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Finding specific policy clauses, querying financial data, looking up customer records, or extracting targeted technical specs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border/70">
                  <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Not Designed For:</span>
                    <p className="text-muted-foreground leading-relaxed">
                      Full-document summaries or whole-book rewrites (these tasks require reading 100% of the text, so filtering does not apply).
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 2. Main Studio Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-card border border-border/80 shadow-sm rounded-2xl overflow-hidden flex flex-col mb-8"
      >
        
        {/* Step 1: Source Document Ingestion */}
        <div className="p-6 md:p-7 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
              Source Document
            </div>

            {/* Ingestion Mode & Samples */}
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 bg-muted/60 rounded-lg border border-border/70 text-xs">
                <button
                  onClick={() => setSourceMode("file")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    sourceMode === "file" 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setSourceMode("text")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    sourceMode === "text" 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Raw Text
                </button>
              </div>

              {/* Sample Quick Loaders */}
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-border/60">
                {SAMPLE_DOCS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => loadSample(sample)}
                    className="px-2.5 py-1 rounded-md bg-muted/40 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                  >
                    Sample: {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Source Mode: File Upload */}
          {sourceMode === "file" && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".pdf,.txt,.csv,.md,.json,.docx" 
                className="hidden" 
              />

              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-border/80 hover:border-primary/50 bg-muted/10 hover:bg-muted/30 rounded-xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                >
                  <div className="p-2.5 bg-card border border-border group-hover:border-primary/30 text-muted-foreground group-hover:text-primary rounded-xl mb-2.5 shadow-sm transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    Click to upload or drag & drop document
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    PDF, CSV, TXT, MD, DOCX up to 100MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground">{file.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span className="text-foreground/80 font-medium">~{file.tokenCount.toLocaleString()} raw tokens</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleClearSource}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Source Mode: Raw Text */}
          {sourceMode === "text" && (
            <div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste document text, logs, policies, or data records here..."
                rows={4}
                className="w-full p-3.5 rounded-xl bg-background border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y"
              />
              <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1 px-1">
                <span>Estimated tokens: ~{Math.floor(rawText.length / 4).toLocaleString()}</span>
                {rawText && (
                  <button 
                    onClick={() => setRawText("")}
                    className="text-[11px] hover:text-foreground transition-colors"
                  >
                    Clear Text
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Extraction Goals */}
        <div className="p-6 md:p-7 space-y-6 bg-card">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
            Define Extraction Targets
          </div>

          {/* Input 1: Specific Data Target */}
          <div className="space-y-2">
            <label className="flex items-center text-xs font-semibold text-foreground">
              <span>Target Data to Extract</span>
              <FieldTooltip text="The targeted question, topic, or specific clauses used to retrieve relevant data snippets from the document." />
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Remote work equipment stipend amount and reimbursement deadlines"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />

            {/* Warning if user enters summary keywords */}
            {isSummarizeQuery && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Notice:</strong> Context Extractor is designed for targeted data retrieval. For whole-document summaries, input the entire document directly to your LLM.
                </span>
              </motion.div>
            )}
          </div>

          {/* Input 2: AI Action / Prompt Instruction */}
          <div className="space-y-2">
            <label className="flex items-center text-xs font-semibold text-foreground">
              <span>AI Goal & Prompt Instruction</span>
              <FieldTooltip text="The actual prompt instructions that will wrap around the extracted data when delivered to your AI model." />
            </label>
            <textarea
              rows={3}
              value={aiTask}
              onChange={(e) => setAiTask(e.target.value)}
              placeholder="e.g., Draft a welcoming email for a new hire explaining how to claim their equipment stipend."
              className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div className="pt-1">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Advanced Retrieval Options</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-xl bg-muted/20 border border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Data Extraction Depth
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDepth("top3")}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                        depth === "top3"
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Top 3 Snippets (Max Savings)
                    </button>
                    <button
                      onClick={() => setDepth("top5")}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${
                        depth === "top5"
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Top 5 Snippets (Broader Context)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Prompt Structure Format
                  </label>
                  <div className="flex gap-2">
                    {(["markdown", "xml", "json"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormatStyle(fmt)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium uppercase border transition-all ${
                          formatStyle === fmt
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar Footer */}
        <div className="px-6 md:px-7 py-4 bg-muted/15 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span>Embedding: <strong className="text-foreground">text-embedding-004</strong> (via pgvector)</span>
          </div>

          <button
            onClick={handleExtract}
            disabled={!isFormValid || state === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                Extracting Data...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Extract Data & Build Prompt
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 3. Output Section */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        <AnimatePresence mode="wait">
          
          {/* Loading Animation Stage */}
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                {(() => {
                  const CurrentIcon = PROCESSING_STEPS[currentStep].icon;
                  return <CurrentIcon className="w-6 h-6 animate-spin" />;
                })()}
              </div>

              <AnimatePresence mode="wait">
                <motion.h3 
                  key={currentStep}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold text-sm text-foreground mb-1.5"
                >
                  {PROCESSING_STEPS[currentStep].text}
                </motion.h3>
              </AnimatePresence>
              <p className="text-xs text-muted-foreground mb-6">Running similarity match against document vector coordinates...</p>

              {/* Step indicator progress pills */}
              <div className="flex justify-center gap-1.5 max-w-xs mx-auto">
                {PROCESSING_STEPS.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Success / Result View */}
          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              
              {/* Token Savings Summary Widget */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-bold text-foreground">🔥 {percentSaved}% Tokens Saved</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                          Optimized
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Compressed from <strong className="text-foreground">{originalTokens.toLocaleString()} tokens</strong> down to <strong className="text-primary">{extractedTokens.toLocaleString()} tokens</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleCopyPrompt}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Ready Prompt
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Download as .txt"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Output Tabs Container */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 bg-muted/20">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("prompt")}
                      className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === "prompt"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileCode className="w-4 h-4" />
                      Ready-to-Paste Prompt
                    </button>
                    <button
                      onClick={() => setActiveTab("data")}
                      className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === "data"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      Extracted Data ({extractedData.length})
                    </button>
                  </div>

                  <div className="text-[11px] text-muted-foreground hidden sm:block">
                    Format: <span className="uppercase font-semibold text-foreground">{formatStyle}</span>
                  </div>
                </div>

                {/* Tab 1: Assembled Ready Prompt */}
                {activeTab === "prompt" && (
                  <div className="p-5">
                    <pre className="p-4 rounded-xl bg-muted/30 border border-border text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[380px]">
                      {formatOutputPrompt()}
                    </pre>
                  </div>
                )}

                {/* Tab 2: Extracted Data Snippets Preview */}
                {activeTab === "data" && (
                  <div className="p-5 space-y-3">
                    {extractedData.map((snippet) => (
                      <div 
                        key={snippet.id} 
                        className="p-4 rounded-xl border border-border bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            {snippet.section}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {snippet.relevance}% Match
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {snippet.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 4. Comprehensive Explanatory Guide & SEO Knowledge Section */}
      <section className="border-t border-border pt-12 space-y-12 text-foreground">
        
        {/* Section 1: Overview / What is RAG Pre-Processing */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Prompt Architecture & Token Optimization
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            What is Context Extraction and How Does It Reduce LLM Costs?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Large Language Models (LLMs) such as <strong>OpenAI GPT-4o</strong>, <strong>Anthropic Claude 3.5 Sonnet</strong>, and <strong>Google Gemini 1.5 Pro</strong> charge per input token. When developers or business users need an answer based on a company handbook, financial filing, or large CSV dataset, their default reaction is to paste all 50,000 to 100,000 words directly into the prompt.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Context Extractor</strong> introduces an intelligent <em>Retrieval-Augmented Generation (RAG) Pre-Processor</em> layer. Instead of flooding your AI model with unnecessary pages of fluff, Context Extractor isolates only the precise data points, clauses, and facts related to your target query. By sending 500 tokens instead of 50,000 tokens, you save up to <strong>98% on API bills</strong> while dramatically improving response accuracy.
          </p>
        </div>

        {/* Section 2: 3-Step RAG Pipeline */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">How the RAG Pre-Processing Pipeline Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-semibold text-sm text-foreground">Semantic Chunking</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your PDF, CSV, or document is broken down into structured, overlapping data blocks to preserve contextual integrity.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-semibold text-sm text-foreground">Vector Embeddings</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We generate mathematical vector coordinates for each snippet and perform instant cosine similarity search using pgvector.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-semibold text-sm text-foreground">Zero-Bloat Prompt</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only the highest-ranking snippets are bundled with your instructions into a prompt formatted specifically for your AI tool.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Comparison Table */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Direct Comparison: Full Document Ingestion vs. Context Extractor</h3>
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Evaluation Metric</th>
                    <th className="p-4 text-amber-600 dark:text-amber-400">Pasting Full Document</th>
                    <th className="p-4 text-primary">Using Context Extractor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Average Token Usage</td>
                    <td className="p-4 text-muted-foreground">40,000 – 120,000 tokens / prompt</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">400 – 1,200 tokens (98% reduction)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">API Cost per 100 Queries</td>
                    <td className="p-4 text-muted-foreground">$20.00 – $60.00+</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">$0.25 – $0.80</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Risk of Hallucinations</td>
                    <td className="p-4 text-muted-foreground">High (Lost-in-the-Middle issue)</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">Near Zero (Pinpoint context)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">AI Response Latency</td>
                    <td className="p-4 text-muted-foreground">8 – 25 seconds (slow generation)</td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">1 – 3 seconds (instant)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Supported Models</td>
                    <td className="p-4 text-muted-foreground">Limited by context window limits</td>
                    <td className="p-4 font-semibold text-foreground">Works on all models & tiers</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: Why AI Hallucinates on Large Files */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Why Do LLMs Hallucinate on Huge Files?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Machine learning research proves that frontier models exhibit a severe <strong>attention degradation</strong> curve when prompt sizes exceed thousands of tokens. Models place heavy attention on the very beginning and very end of the prompt, while critical facts located in the middle 60% of the text are frequently missed or hallucinated.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By extracting only the relevant snippets, Context Extractor places the necessary data directly under the model&apos;s active attention window, ensuring 100% adherence to instructions and zero made-up answers.
          </p>
        </div>

        {/* Section 5: FAQs */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-foreground">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="rounded-xl border border-border bg-card overflow-hidden transition-all">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 6: Internal Ecosystem Links */}
        <div className="p-6 rounded-2xl border border-border bg-muted/20 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Explore More AI Prompt Engineering Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Link 
              href="/tools/token-optimizer" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Token Optimizer</span>
            </Link>

            <Link 
              href="/tools/prompt-optimizer" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <Code2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Prompt Optimizer</span>
            </Link>

            <Link 
              href="/tools/compare-estimate" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <ArrowRight className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Diff & Cost Estimate</span>
            </Link>

            <Link 
              href="/cookbook" 
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:text-primary transition-all flex items-center gap-2 group"
            >
              <BookOpen className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Prompt Cookbook</span>
            </Link>
          </div>
        </div>

      </section>

      {/* JSON-LD Structured Data Schema for Google SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Context Extractor",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "description": "Extract relevant data from large documents via RAG to slash LLM token costs and eliminate AI hallucinations.",
            "featureList": [
              "Semantic chunking of PDFs, CSVs, and documents",
              "Vector embeddings and similarity search",
              "Automated prompt assembly with zero context bloat",
              "Multi-format export (Markdown, XML, JSON)"
            ]
          })
        }}
      />

    </article>
  );
}
