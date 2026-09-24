"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FileText, Upload, Check, Copy, AlertCircle,
  Sparkles, Layers, RefreshCcw, Download,
  CheckCircle2, XCircle, Info, ChevronDown, ChevronUp, FileCode,
  Sliders, FileCheck2, Trash2,
  HelpCircle, ArrowRight, ShieldCheck, Zap, Code2, Terminal,
  BookOpen, Lock, Scale, DollarSign
} from "lucide-react";
import { countPromptTokens } from "@/lib/token-count";
import { PromptOutputViewer, PromptViewToggle, type PromptViewMode } from "@/components/tools/PromptOutputViewer";
import { TimedProgress, type ProgressStep } from "@/components/tools/TimedProgress";
import { useSavedRun, SavedRunBanner } from "@/components/tools/useSavedRun";

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

const MAX_FILE_MB = 5;

// A fresh upload chunks, embeds, and searches the whole document — the reuse path (same
// document, new query) skips ingest/embedding and is much faster.
const UPLOAD_STEPS: ProgressStep[] = [
  { label: "Ingesting and chunking document data...", seconds: 5 },
  { label: "Generating vector embeddings with gemini-embedding-001...", seconds: 8 },
  { label: "Searching and scoring relevant data snippets...", seconds: 4 },
  { label: "Filtering out non-essential document bloat...", seconds: 3 },
  { label: "Assembling your optimized, model-ready prompt...", seconds: 4 },
];
const REUSE_STEPS: ProgressStep[] = [
  { label: "Searching and scoring relevant data snippets...", seconds: 3 },
  { label: "Filtering out non-essential document bloat...", seconds: 2 },
  { label: "Assembling your optimized, model-ready prompt...", seconds: 3 },
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
    answer: "Context Extractor supports PDFs, CSVs, TXT files, Markdown (.md), JSON, and Microsoft Word (.docx) documents up to 5MB. You can also paste unstructured raw text directly into the studio."
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
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [serverOriginalTokens, setServerOriginalTokens] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentsRemaining, setDocumentsRemaining] = useState<number | null>(null);
  const [documentsLimit, setDocumentsLimit] = useState<number | null>(null);
  const [promptsRemaining, setPromptsRemaining] = useState<number | null>(null);
  const [promptsLimit, setPromptsLimit] = useState<number | null>(null);
  const [rawText, setRawText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiTask, setAiTask] = useState("");
  const [depth, setDepth] = useState<"top3" | "top5">("top3");
  const [formatStyle, setFormatStyle] = useState<"markdown" | "xml" | "json">("markdown");

  const [wantsPrompt, setWantsPrompt] = useState(true);
  const [activeTab, setActiveTab] = useState<"prompt" | "data">("prompt");
  const [promptViewMode, setPromptViewMode] = useState<PromptViewMode>("rendered");
  const [isCopied, setIsCopied] = useState(false);
  const [showDosDonts, setShowDosDonts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [extractedData, setExtractedData] = useState<ExtractedDataSnippet[]>([]);
  // Holds the real result while TimedProgress finishes its own fill/hold animation — see onFinished below.
  const [pendingResult, setPendingResult] = useState<{
    snippets?: ExtractedDataSnippet[];
    originalTokens?: number;
    documentId?: string | null;
    usage?: { documentsRemaining?: number; documentsLimit?: number; promptsRemaining?: number; promptsLimit?: number };
  } | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for keywords where RAG is contraindicated
  const isSummarizeQuery = /(summarize|summary|entire document|whole document|all pages|rewrite all|everything)/i.test(searchQuery);

  useEffect(() => {
    if (state === "success" && outputRef.current) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [state]);

  const refreshUsage = async () => {
    try {
      const res = await fetch("/api/tools/context-extractor/usage");
      const data = await res.json();
      if (res.ok) {
        setDocumentsRemaining(data.documentsRemaining);
        setDocumentsLimit(data.documentsLimit);
        setPromptsRemaining(data.promptsRemaining);
        setPromptsLimit(data.promptsLimit);
      }
    } catch {
      // Quota display is informational only — silently skip on failure.
    }
  };

  useEffect(() => {
    refreshUsage();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > MAX_FILE_MB * 1024 * 1024) {
        setErrorMessage(`This file is over the ${MAX_FILE_MB}MB limit. Please upload a smaller document.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const sizeMB = (selected.size / (1024 * 1024)).toFixed(1) + " MB";
      const estimatedTokens = Math.max(15000, Math.floor(selected.size / 28));
      setFile({
        name: selected.name,
        size: sizeMB,
        tokenCount: estimatedTokens
      });
      setFileObj(selected);
      setIsSample(false);
      setServerOriginalTokens(null);
      setErrorMessage(null);
      setExtractedData([]);
      setDocumentId(null);
    }
  };

  const loadSample = (sample: typeof SAMPLE_DOCS[0]) => {
    setSourceMode("file");
    setFile({
      name: sample.filename,
      size: sample.size,
      tokenCount: sample.tokenCount
    });
    setFileObj(null);
    setIsSample(true);
    setServerOriginalTokens(null);
    setErrorMessage(null);
    setDocumentId(null);
    setSearchQuery(sample.defaultQuery);
    setAiTask(sample.defaultTask);
    setExtractedData(sample.snippets);
  };

  const handleClearSource = () => {
    setFile(null);
    setFileObj(null);
    setIsSample(false);
    setServerOriginalTokens(null);
    setErrorMessage(null);
    setDocumentId(null);
    setRawText("");
    setExtractedData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Once a document has been uploaded, chunked and embedded, its id lets us run more
  // prompts against it without re-uploading — that only spends a "prompt" slot, not
  // a "document" slot. Any change to the source (new file, edited text, sample) clears it.
  const willReuseDocument = !!documentId && !isSample;

  const applyUsage = (data: { documentsRemaining?: number; documentsLimit?: number; promptsRemaining?: number; promptsLimit?: number }) => {
    if (typeof data.documentsRemaining === "number") setDocumentsRemaining(data.documentsRemaining);
    if (typeof data.documentsLimit === "number") setDocumentsLimit(data.documentsLimit);
    if (typeof data.promptsRemaining === "number") setPromptsRemaining(data.promptsRemaining);
    if (typeof data.promptsLimit === "number") setPromptsLimit(data.promptsLimit);
  };

  // Reopened from history: show the saved excerpts and inputs without any request. A file's own contents
  // aren't saved, only its name and (for about a day) the processed document, so a file run can ask new
  // questions while that lasts and otherwise asks for the file again. Pasted text is saved whole.
  const saved = useSavedRun<
    {
      sourceMode: "file" | "text";
      filename: string;
      fileSize: string;
      rawText: string;
      aiTask: string;
      formatStyle: "markdown" | "xml" | "json";
      wantsPrompt: boolean;
      searchQuery: string;
      depth: "top3" | "top5";
      documentId: string;
    },
    { snippets: ExtractedDataSnippet[]; originalTokens: number }
  >("context-extractor");
  useEffect(() => {
    const run = saved.run;
    if (!run) return;
    const i = run.input;
    setSourceMode(i.sourceMode);
    if (i.sourceMode === "file") {
      setFile({ name: i.filename || "document", size: i.fileSize || "", tokenCount: run.result.originalTokens });
      setDocumentId(i.documentId || null);
    } else {
      setRawText(i.rawText);
    }
    setFileObj(null);
    setIsSample(false);
    setSearchQuery(i.searchQuery);
    setAiTask(i.aiTask);
    setDepth(i.depth === "top5" ? "top5" : "top3");
    setFormatStyle(i.formatStyle);
    setWantsPrompt(i.wantsPrompt);
    setServerOriginalTokens(run.result.originalTokens);
    setExtractedData(run.result.snippets);
    setState("success");
  }, [saved.run]);

  const handleExtract = async () => {
    const hasSource = (sourceMode === "file" && file) || (sourceMode === "text" && rawText.trim().length > 0);
    if (!hasSource || !searchQuery.trim() || !aiTask.trim()) return;

    setErrorMessage(null);
    setState("loading");
    setPendingResult(null);

    // Sample documents stay a canned demo — no API call, no quota used.
    if (isSample) {
      setTimeout(() => setPendingResult({}), 1500);
      return;
    }

    // Display-only details saved with the run so history can reopen it exactly as it looked.
    const history = {
      sourceMode,
      filename: file?.name ?? "",
      fileSize: file?.size ?? "",
      rawText: sourceMode === "text" ? rawText : "",
      aiTask,
      formatStyle,
      wantsPrompt,
      historyId: saved.run?.id,
    };

    try {
      let response: Response;

      if (willReuseDocument) {
        response = await fetch("/api/tools/context-extractor/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, searchQuery, aiTask, depth, history }),
        });
      } else {
        const formData = new FormData();
        if (sourceMode === "file" && fileObj) {
          formData.append("file", fileObj);
        } else {
          formData.append("rawText", rawText);
        }
        formData.append("searchQuery", searchQuery);
        formData.append("aiTask", aiTask);
        formData.append("depth", depth);
        formData.append("history", JSON.stringify(history));

        response = await fetch("/api/tools/context-extractor", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        // A reused document that expired or no longer belongs to this session — drop
        // it so the next attempt falls through to a fresh upload instead of looping.
        if (data.expired) setDocumentId(null);
        await refreshUsage();
        throw new Error(data.error || "Something went wrong while processing your document.");
      }

      // Stashed here, not applied yet — TimedProgress finishes its own fill/hold animation first (see onFinished).
      setPendingResult({ snippets: data.snippets, originalTokens: data.originalTokens, documentId: data.documentId, usage: data });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  };

  // Calculations for token metrics
  const rawTextTokens = useMemo(() => countPromptTokens(rawText), [rawText]);
  const originalTokens = serverOriginalTokens ?? (file
    ? file.tokenCount
    : (rawText.trim() ? Math.max(800, rawTextTokens) : 30000));

  const extractedTokens = useMemo(
    () =>
      extractedData.reduce((acc, c) => acc + countPromptTokens(c.content), 0) +
      countPromptTokens(searchQuery) + countPromptTokens(aiTask) + 80,
    [extractedData, searchQuery, aiTask]
  );

  const savedTokens = originalTokens - extractedTokens;
  const percentSavedRaw = originalTokens > 0 ? (savedTokens / originalTokens) * 100 : 0;
  const percentSaved = Math.max(0, Math.min(99.2, percentSavedRaw)).toFixed(1);
  const hasMeaningfulSavings = percentSavedRaw >= 10;

  const formatOutputPrompt = () => {
    if (!wantsPrompt) {
      // Data-only mode: just the matched excerpts, no task wrapper.
      if (formatStyle === "xml") {
        return `<context>\n${extractedData.map(c => `[${c.section}]\n${c.content}`).join("\n\n")}\n</context>`;
      }
      if (formatStyle === "json") {
        return JSON.stringify({
          extracted_data: extractedData.map(c => ({ section: c.section, relevance: c.relevance, text: c.content }))
        }, null, 2);
      }
      return extractedData.map((c) => `> **${c.section}** (Relevance: ${c.relevance}%)\n> ${c.content}`).join("\n\n");
    }
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
    const extension = formatStyle === "xml" ? "xml" : formatStyle === "json" ? "json" : "md";
    const mimeType = formatStyle === "json" ? "application/json" : formatStyle === "xml" ? "application/xml" : "text/markdown";
    const element = document.createElement("a");
    const fileBlob = new Blob([formatOutputPrompt()], { type: mimeType });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `optimized-context-prompt.${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isFormValid = ((sourceMode === "file" && file) || (sourceMode === "text" && rawText.trim())) &&
    searchQuery.trim() &&
    (!wantsPrompt || aiTask.trim());

  return (
    <article className="flex flex-col w-full py-8">

      {/* 1. Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-3"
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
          Upload a large document and get back one optimized, ready-to-paste prompt — your instructions paired with only the matching extracted data, cutting token costs and hallucinations.
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

      <SavedRunBanner saved={saved} tool="context-extractor" />

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
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                Source Document
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 ml-7">
                One upload, unlimited angles — generate multiple prompts from this document without re-uploading it.
              </p>
            </div>

            {/* Ingestion Mode & Samples */}
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 bg-muted/60 rounded-lg border border-border/70 text-xs">
                <button
                  onClick={() => setSourceMode("file")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${sourceMode === "file"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => { setSourceMode("text"); setIsSample(false); setServerOriginalTokens(null); setDocumentId(null); }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${sourceMode === "text"
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
                    PDF, CSV, TXT, MD, DOCX up to {MAX_FILE_MB}MB
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
                onChange={(e) => { setRawText(e.target.value); setDocumentId(null); }}
                placeholder="Paste document text, logs, policies, or data records here..."
                rows={4}
                className="w-full p-3.5 rounded-xl bg-background border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y"
              />
              <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1 px-1">
                <span>Estimated tokens: ~{rawTextTokens.toLocaleString()}</span>
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
            <div className="flex items-center justify-between">
              <label className="flex items-center text-xs font-semibold text-foreground">
                <span>AI Goal & Prompt Instruction</span>
                <FieldTooltip text="The actual prompt instructions that will wrap around the extracted data when delivered to your AI model." />
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={wantsPrompt}
                onClick={() => setWantsPrompt(!wantsPrompt)}
                className="flex items-center gap-2 shrink-0"
                title={wantsPrompt ? "Turn off to get just the extracted data, no prompt" : "Turn on to build a ready-to-paste prompt"}
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {wantsPrompt ? "Build prompt" : "Data only"}
                </span>
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wantsPrompt ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${wantsPrompt ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                </span>
              </button>
            </div>

            {wantsPrompt ? (
              <textarea
                rows={3}
                value={aiTask}
                onChange={(e) => setAiTask(e.target.value)}
                placeholder="e.g., Draft a welcoming email for a new hire explaining how to claim their equipment stipend."
                className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/45 dark:placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
              />
            ) : (
              <p className="text-[11px] text-muted-foreground px-1">
                Off — we'll just show you the matching excerpts, no prompt built around them.
              </p>
            )}
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
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${depth === "top3"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Top 3 Snippets (Max Savings)
                    </button>
                    <button
                      onClick={() => setDepth("top5")}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${depth === "top5"
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
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium uppercase border transition-all ${formatStyle === fmt
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5" title="New documents you can upload &amp; embed today">
              <FileText className="w-3.5 h-3.5 text-primary" />
              {documentsRemaining !== null && documentsLimit !== null ? (
                <><strong className="text-foreground">{documentsRemaining}</strong> / {documentsLimit} documents today</>
              ) : (
                "documents today"
              )}
            </span>
            <span className="flex items-center gap-1.5" title={wantsPrompt ? "Prompts you can generate today, including reruns on documents already uploaded" : "Extractions you can run today, including reruns on documents already uploaded"}>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {promptsRemaining !== null && promptsLimit !== null ? (
                <><strong className="text-foreground">{promptsRemaining}</strong> / {promptsLimit} {wantsPrompt ? "prompts" : "extractions"} today</>
              ) : (
                wantsPrompt ? "prompts today" : "extractions today"
              )}
            </span>
          </div>

          <button
            onClick={handleExtract}
            disabled={!isFormValid || state === "loading" || promptsRemaining === 0 || (!willReuseDocument && documentsRemaining === 0)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {state === "loading" ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                {wantsPrompt ? (willReuseDocument ? "Generating Prompt..." : "Extracting Data...") : "Extracting..."}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {wantsPrompt
                  ? (willReuseDocument ? "Generate Another Prompt" : "Extract Data & Build Prompt")
                  : (willReuseDocument ? "Run Another Extraction" : "Extract Data")}
              </>
            )}
          </button>
        </div>

        {willReuseDocument && state !== "loading" && (
          <div className="px-6 md:px-7 py-2.5 bg-primary/5 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-primary shrink-0" />
            Reusing <strong className="text-foreground">{file?.name}</strong> — this only spends {wantsPrompt ? "a prompt" : "an extraction"}, not another document.
          </div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-6 md:px-7 py-3 bg-red-500/10 border-t border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </motion.div>

      {/* 3. Output Section */}
      <div ref={outputRef} className="scroll-mt-24 mb-16">
        <AnimatePresence mode="wait">

          {/* Loading Animation Stage */}
          {state === "loading" && (
            <TimedProgress
              key={willReuseDocument || isSample ? "reuse" : "upload"}
              accent="primary"
              icon={Layers}
              steps={willReuseDocument || isSample ? REUSE_STEPS : UPLOAD_STEPS}
              subtitle="Running similarity match against document vector coordinates..."
              slowHint="Still working — a large document or a busy free model queue can take a little longer."
              done={pendingResult !== null}
              onFinished={() => {
                if (!pendingResult) return;
                if (pendingResult.snippets) setExtractedData(pendingResult.snippets);
                if (typeof pendingResult.originalTokens === "number") setServerOriginalTokens(pendingResult.originalTokens);
                if ("documentId" in pendingResult) setDocumentId(pendingResult.documentId ?? null);
                if (pendingResult.usage) applyUsage(pendingResult.usage);
                setPendingResult(null);
                setState("success");
              }}
            />
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
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${hasMeaningfulSavings
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-primary/10 border border-primary/20 text-primary"
                    }`}>
                    {hasMeaningfulSavings ? <Sparkles className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                  </div>
                  <div>
                    {hasMeaningfulSavings ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-foreground">🔥 {percentSaved}% Tokens Saved</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                            Optimized
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Compressed from <strong className="text-foreground">{originalTokens.toLocaleString()} tokens</strong> down to <strong className="text-primary">{extractedTokens.toLocaleString()} tokens</strong>.
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-base sm:text-lg font-bold text-foreground">Minimal token savings on this one</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Source was <strong className="text-foreground">{originalTokens.toLocaleString()} tokens</strong>; the matched excerpts plus prompt structure came to <strong className="text-foreground">{extractedTokens.toLocaleString()} tokens</strong>. For a document this short, extraction mainly adds precision and sourcing — not a size cut. Consider pasting the original directly instead.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Output Tabs Container */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 bg-muted/20">
                  <div className="flex gap-2">
                    {wantsPrompt && (
                      <button
                        onClick={() => setActiveTab("prompt")}
                        className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "prompt"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <FileCode className="w-4 h-4" />
                        Ready-to-Paste Prompt
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("data")}
                      className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === "data" || !wantsPrompt
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
                {activeTab === "prompt" && wantsPrompt && (
                  <div className="p-5">
                    {/* Action bar: task + data are already embedded below — copy it as a prompt, or save it as a document */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-border/60">
                      <p className="text-[11px] text-muted-foreground max-w-xs">
                        Task instructions and matching data, embedded into one prompt.
                      </p>
                      <div className="flex items-center gap-2">
                        <PromptViewToggle viewMode={promptViewMode} onViewModeChange={setPromptViewMode} />
                        <button
                          onClick={handleCopyPrompt}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Prompt
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download as Document
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                      <PromptOutputViewer
                        content={formatOutputPrompt()}
                        viewMode={promptViewMode}
                        onViewModeChange={setPromptViewMode}
                        accentColor="primary"
                        language={formatStyle}
                        maxHeight="max-h-[440px]"
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2: Extracted Data Snippets Preview */}
                {(activeTab === "data" || !wantsPrompt) && (
                  <div className="p-5 space-y-3">
                    {!wantsPrompt && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                        <p className="text-[11px] text-muted-foreground max-w-xs">
                          Just the matching excerpts — no prompt built around them.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyPrompt}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Data
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleDownload}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    )}
                    {extractedData.map((snippet) => (
                      <div
                        key={snippet.id}
                        className="p-4 rounded-xl border border-border bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                            {snippet.section}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {snippet.relevance}% Match
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
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
