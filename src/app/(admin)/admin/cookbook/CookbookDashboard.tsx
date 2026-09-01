"use client";

import { useState } from "react";
import CookbookCategoryManager from "./CookbookCategoryManager";
import CookbookPromptManager from "./CookbookPromptManager";
import CookbookSettingsManager from "./CookbookSettingsManager";
import { Folder, FileText, Settings } from "lucide-react";

export default function CookbookDashboard({ 
  initialCategories, 
  initialPrompts,
  initialSettings
}: { 
  initialCategories: any[]; 
  initialPrompts: any[]; 
  initialSettings: any;
}) {
  const [activeTab, setActiveTab] = useState<"prompts" | "categories" | "settings">("prompts");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("prompts")}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "prompts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <FileText className="w-4 h-4" />
          Cookbook Prompts
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Folder className="w-4 h-4" />
          Categories
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="pt-4">
        {activeTab === "prompts" && (
          <CookbookPromptManager initialPrompts={initialPrompts} categories={initialCategories} />
        )}
        {activeTab === "categories" && (
          <CookbookCategoryManager initialCategories={initialCategories} />
        )}
        {activeTab === "settings" && (
          <CookbookSettingsManager initialSettings={initialSettings} />
        )}
      </div>
    </div>
  );
}
