"use client";

import { useState } from "react";
import { updateCookbookSettings } from "./actions";
import { KeyRound, ShieldAlert } from "lucide-react";

export default function CookbookSettingsManager({ initialSettings }: { initialSettings: { geminiApiKey: string } }) {
  const [apiKey, setApiKey] = useState(initialSettings.geminiApiKey);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    const result = await updateCookbookSettings(apiKey);
    
    if (result.error) {
      alert(result.error);
    } else {
      alert("Settings saved successfully!");
    }
    setIsSaving(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            API Keys & Integrations
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure third-party API keys. These keys are stored securely and used only for internal dashboard tools, like the AI Cookbook Auto-Generator.
          </p>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Security Notice</p>
                <p>Never share your API keys. They will be stored in your database and accessed only on the server side when calling external APIs.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Google Gemini API Key</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="AIzaSy..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                Required for the "Auto-Generate with AI" feature in Cookbook Prompts. 
                Get a free key from <a href="https://aistudio.google.com/" target="_blank" className="text-primary hover:underline">Google AI Studio</a>.
              </p>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
