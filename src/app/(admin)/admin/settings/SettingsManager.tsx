"use client";

import { useState } from "react";
import { updateToolSettings } from "./actions";
import { FileText, ShieldAlert, Wand2, Zap, Bug, Terminal } from "lucide-react";

export default function SettingsManager({
  initialSettings,
}: {
  initialSettings: {
    contextExtractorMaxFileMb: string;
    contextExtractorDocumentDailyLimit: string;
    contextExtractorPromptDailyLimit: string;
    contextExtractorDocumentDailyLimitAuth: string;
    contextExtractorPromptDailyLimitAuth: string;
    promptOptimizerDailyLimit: string;
    promptOptimizerDailyLimitAuth: string;
    tokenOptimizerDailyLimit: string;
    tokenOptimizerDailyLimitAuth: string;
    promptDebuggerDailyLimit: string;
    promptDebuggerDailyLimitAuth: string;
    promptFormatterDailyLimit: string;
    promptFormatterDailyLimitAuth: string;
  };
}) {
  const [maxFileMb, setMaxFileMb] = useState(initialSettings.contextExtractorMaxFileMb);
  const [documentDailyLimit, setDocumentDailyLimit] = useState(initialSettings.contextExtractorDocumentDailyLimit);
  const [promptDailyLimit, setPromptDailyLimit] = useState(initialSettings.contextExtractorPromptDailyLimit);
  const [documentDailyLimitAuth, setDocumentDailyLimitAuth] = useState(initialSettings.contextExtractorDocumentDailyLimitAuth);
  const [promptDailyLimitAuth, setPromptDailyLimitAuth] = useState(initialSettings.contextExtractorPromptDailyLimitAuth);
  const [promptOptimizerDailyLimit, setPromptOptimizerDailyLimit] = useState(initialSettings.promptOptimizerDailyLimit);
  const [promptOptimizerDailyLimitAuth, setPromptOptimizerDailyLimitAuth] = useState(initialSettings.promptOptimizerDailyLimitAuth);
  const [tokenOptimizerDailyLimit, setTokenOptimizerDailyLimit] = useState(initialSettings.tokenOptimizerDailyLimit);
  const [tokenOptimizerDailyLimitAuth, setTokenOptimizerDailyLimitAuth] = useState(initialSettings.tokenOptimizerDailyLimitAuth);
  const [promptDebuggerDailyLimit, setPromptDebuggerDailyLimit] = useState(initialSettings.promptDebuggerDailyLimit);
  const [promptDebuggerDailyLimitAuth, setPromptDebuggerDailyLimitAuth] = useState(initialSettings.promptDebuggerDailyLimitAuth);
  const [promptFormatterDailyLimit, setPromptFormatterDailyLimit] = useState(initialSettings.promptFormatterDailyLimit);
  const [promptFormatterDailyLimitAuth, setPromptFormatterDailyLimitAuth] = useState(initialSettings.promptFormatterDailyLimitAuth);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const result = await updateToolSettings({
      maxFileMb,
      documentDailyLimit,
      promptDailyLimit,
      documentDailyLimitAuth,
      promptDailyLimitAuth,
      promptOptimizerDailyLimit,
      promptOptimizerDailyLimitAuth,
      tokenOptimizerDailyLimit,
      tokenOptimizerDailyLimitAuth,
      promptDebuggerDailyLimit,
      promptDebuggerDailyLimitAuth,
      promptFormatterDailyLimit,
      promptFormatterDailyLimitAuth,
    });

    if (result.error) {
      alert(result.error);
    } else {
      alert("Settings saved successfully!");
    }
    setIsSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Context Extractor
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Limits applied to the Context Extractor tool.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Cost control</p>
              <p>Uploading a document embeds every chunk (the expensive part); generating a prompt off an already-uploaded document only embeds the new query. Anonymous visitors are tracked by IP; signed-in users get their own, higher limits that follow their account instead.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5">Max upload size (MB)</label>
            <input
              type="number"
              min={1}
              value={maxFileMb}
              onChange={(e) => setMaxFileMb(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Documents larger than this are rejected before parsing — applies to everyone.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anonymous visitors</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Documents per day</label>
              <input
                type="number"
                min={1}
                value={documentDailyLimit}
                onChange={(e) => setDocumentDailyLimit(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many new documents a single IP address may upload &amp; embed per UTC day.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Prompts per day</label>
              <input
                type="number"
                min={1}
                value={promptDailyLimit}
                onChange={(e) => setPromptDailyLimit(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a single IP address may generate per UTC day — including reruns against documents already uploaded.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-primary pt-4">Signed-in users</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Documents per day</label>
              <input
                type="number"
                min={1}
                value={documentDailyLimitAuth}
                onChange={(e) => setDocumentDailyLimitAuth(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many new documents a logged-in account may upload &amp; embed per UTC day — tracked by account, not IP.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Prompts per day</label>
              <input
                type="number"
                min={1}
                value={promptDailyLimitAuth}
                onChange={(e) => setPromptDailyLimitAuth(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a logged-in account may generate per UTC day.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Prompt Optimizer
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Limits applied to the Prompt Optimizer tool.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Cost control</p>
              <p>Each optimization is one Gemini generation call. Anonymous visitors are tracked by IP; signed-in users get their own, higher limit that follows their account instead.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anonymous visitors</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Optimizations per day</label>
              <input
                type="number"
                min={1}
                value={promptOptimizerDailyLimit}
                onChange={(e) => setPromptOptimizerDailyLimit(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a single IP address may optimize per UTC day.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-primary pt-4">Signed-in users</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Optimizations per day</label>
              <input
                type="number"
                min={1}
                value={promptOptimizerDailyLimitAuth}
                onChange={(e) => setPromptOptimizerDailyLimitAuth(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a logged-in account may optimize per UTC day — tracked by account, not IP.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Token Optimizer
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Limits applied to the Token Optimizer tool.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Cost control</p>
              <p>Each compression is one Gemini generation call. Anonymous visitors are tracked by IP; signed-in users get their own, higher limit that follows their account instead.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anonymous visitors</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Compressions per day</label>
              <input
                type="number"
                min={1}
                value={tokenOptimizerDailyLimit}
                onChange={(e) => setTokenOptimizerDailyLimit(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a single IP address may compress per UTC day.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-primary pt-4">Signed-in users</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Compressions per day</label>
              <input
                type="number"
                min={1}
                value={tokenOptimizerDailyLimitAuth}
                onChange={(e) => setTokenOptimizerDailyLimitAuth(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a logged-in account may compress per UTC day — tracked by account, not IP.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bug className="w-5 h-5 text-emerald-500" />
            Prompt Debugger
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Limits applied to the Prompt Debugger tool.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Cost control</p>
              <p>Each audit is one AI generation call. Anonymous visitors are tracked by IP; signed-in users get their own, higher limit that follows their account instead.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anonymous visitors</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Audits per day</label>
              <input
                type="number"
                min={1}
                value={promptDebuggerDailyLimit}
                onChange={(e) => setPromptDebuggerDailyLimit(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a single IP address may audit per UTC day.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-primary pt-4">Signed-in users</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Audits per day</label>
              <input
                type="number"
                min={1}
                value={promptDebuggerDailyLimitAuth}
                onChange={(e) => setPromptDebuggerDailyLimitAuth(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a logged-in account may audit per UTC day — tracked by account, not IP.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-pink-500" />
            Prompt Formatter
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Limits applied to the Prompt Formatter tool.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Cost control</p>
              <p>Each format is one AI generation call. Anonymous visitors are tracked by IP; signed-in users get their own, higher limit that follows their account instead.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anonymous visitors</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Formats per day</label>
              <input
                type="number"
                min={1}
                value={promptFormatterDailyLimit}
                onChange={(e) => setPromptFormatterDailyLimit(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a single IP address may format per UTC day.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-primary pt-4">Signed-in users</p>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Formats per day</label>
              <input
                type="number"
                min={1}
                value={promptFormatterDailyLimitAuth}
                onChange={(e) => setPromptFormatterDailyLimitAuth(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground mt-2">
                How many prompts a logged-in account may format per UTC day — tracked by account, not IP.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
