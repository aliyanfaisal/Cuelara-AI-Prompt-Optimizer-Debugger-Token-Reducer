"use client";

import { useState, useEffect } from "react";
import { Search, Edit2, Trash2, X, Plus, Eye, EyeOff, LayoutTemplate, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { createCookbookPrompt, updateCookbookPrompt, deleteCookbookPrompt, toggleCookbookPromptPublish } from "./actions";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const defaultFormState = {
  title: "",
  slug: "",
  categoryId: "",
  image: "",
  explanation: "",
  whenToUse: "",
  commonMistakes: "",
  bestPractices: "",
  promptTemplate: "",
  exampleInput: "",
  exampleOutput: "",
  faqs: "",
  seoTitle: "",
  seoDesc: "",
  published: false,
};

export default function CookbookPromptManager({ initialPrompts, categories }: { initialPrompts: any[], categories: any[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [activeFormTab, setActiveFormTab] = useState<"general" | "content" | "examples" | "seo">("general");
  
  const [formData, setFormData] = useState(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiIdea, setAiIdea] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredPrompts = initialPrompts.filter(prompt => 
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    prompt.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
  const paginatedPrompts = filteredPrompts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handle page change on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function openCreateModal() {
    setModalMode("create");
    setFormData(defaultFormState);
    setEditingPrompt(null);
    setActiveFormTab("general");
    setIsModalOpen(true);
  }

  function openEditModal(prompt: any) {
    setModalMode("edit");
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      slug: prompt.slug,
      categoryId: prompt.categoryId,
      image: prompt.image || "",
      explanation: prompt.explanation,
      whenToUse: prompt.whenToUse,
      commonMistakes: prompt.commonMistakes,
      bestPractices: prompt.bestPractices,
      promptTemplate: prompt.promptTemplate,
      exampleInput: prompt.exampleInput,
      exampleOutput: prompt.exampleOutput,
      faqs: prompt.faqs || "",
      seoTitle: prompt.seoTitle || "",
      seoDesc: prompt.seoDesc || "",
      published: prompt.published,
    });
    setActiveFormTab("general");
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.categoryId) {
      alert("Please select a category.");
      setActiveFormTab("general");
      return;
    }

    setIsSaving(true);
    let result;
    if (modalMode === "create") {
      result = await createCookbookPrompt(formData);
    } else {
      result = await updateCookbookPrompt(editingPrompt.id, formData);
    }
    
    if (result.error) {
      alert(result.error);
    } else {
      setIsModalOpen(false);
      router.refresh();
    }
    setIsSaving(false);
  }

  async function handleDelete(prompt: any) {
    if (confirm(`Are you absolutely sure you want to delete "${prompt.title}"? This cannot be undone.`)) {
      const result = await deleteCookbookPrompt(prompt.id);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }
  
  async function handleTogglePublish(prompt: any) {
    const action = prompt.published ? "unpublish" : "publish";
    if (confirm(`Are you sure you want to ${action} "${prompt.title}"?`)) {
      const result = await toggleCookbookPromptPublish(prompt.id, !prompt.published);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }

  async function handleAIGenerate() {
    if (!formData.categoryId) {
      alert("Please select a category first so the AI knows what context to use.");
      setActiveFormTab("general");
      return;
    }
    const categoryName = categories.find(c => c.id === formData.categoryId)?.name;
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-cookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName, idea: aiIdea })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }
      
      const generated = data.data;
      setFormData({
        ...formData,
        title: generated.title || formData.title,
        slug: (generated.title || formData.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        explanation: generated.explanation || "",
        whenToUse: generated.whenToUse || "",
        bestPractices: generated.bestPractices || "",
        commonMistakes: generated.commonMistakes || "",
        faqs: generated.faqs || "",
        promptTemplate: generated.promptTemplate || "",
        exampleInput: generated.exampleInput || "",
        exampleOutput: generated.exampleOutput || "",
        seoTitle: generated.seoTitle || "",
        seoDesc: generated.seoDesc || "",
      });
      
      setShowAiInput(false);
      alert("Successfully auto-generated all fields!");
    } catch (error: any) {
      alert("AI Generation Error: " + error.message);
    }
    setIsGenerating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center bg-card border border-border rounded-xl px-4 py-3 shadow-sm w-full max-w-md">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input 
            type="text" 
            placeholder="Search cookbook prompts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
          />
        </div>
        
        <button 
          onClick={openCreateModal}
          className="bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] shrink-0"
        >
          <Plus className="w-5 h-5" /> Add Cookbook Prompt
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 font-semibold text-sm text-muted-foreground">Title & Slug</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Category</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Status</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {paginatedPrompts.length > 0 ? (
                paginatedPrompts.map((prompt) => (
                  <tr key={prompt.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-primary" /> {prompt.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{prompt.slug}</p>
                  </td>
                  <td className="p-4 text-sm font-medium">
                    {prompt.category?.name || "Unknown"}
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${prompt.published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {prompt.published ? 'Published' : 'Draft'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleTogglePublish(prompt)} className="p-2 text-muted-foreground hover:text-amber-500 transition-colors hover:bg-muted rounded-lg" title={prompt.published ? "Unpublish" : "Publish"}>
                        {prompt.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEditModal(prompt)} className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(prompt)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No prompts found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPrompts.length)} of {filteredPrompts.length} prompts
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm bg-card border border-border rounded-md disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm bg-card border border-border rounded-md disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden relative max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {modalMode === 'create' ? 'Create Cookbook Prompt' : 'Edit Cookbook Prompt'}
              </h3>
              
              {modalMode === 'create' && (
                <div className="ml-6 flex items-center gap-2 relative">
                  <button 
                    type="button"
                    onClick={() => setShowAiInput(!showAiInput)}
                    className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-Generate
                  </button>
                  
                  {showAiInput && (
                    <div className="absolute top-full left-0 mt-2 bg-card border border-border shadow-xl rounded-xl p-4 w-96 z-10 flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-muted-foreground">Select Category (Required for AI)</label>
                        <select 
                          value={formData.categoryId}
                          onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Select Category...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={aiIdea}
                          onChange={(e) => setAiIdea(e.target.value)}
                          placeholder="Topic idea (optional)"
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAIGenerate())}
                        />
                        <button 
                          type="button"
                          onClick={handleAIGenerate}
                          disabled={isGenerating}
                          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold shrink-0 disabled:opacity-50 flex items-center justify-center min-w-[50px]"
                        >
                          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Go"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1"></div>
              
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground self-start p-1 bg-muted/50 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex border-b border-border px-6 pt-2 shrink-0 overflow-x-auto">
              <button onClick={() => setActiveFormTab("general")} className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeFormTab === "general" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>General</button>
              <button onClick={() => setActiveFormTab("content")} className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeFormTab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Rich Content</button>
              <button onClick={() => setActiveFormTab("examples")} className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeFormTab === "examples" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Template & Examples</button>
              <button onClick={() => setActiveFormTab("seo")} className={`px-4 py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeFormTab === "seo" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>SEO</button>
            </div>

            <form id="cookbook-form" onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* GENERAL TAB */}
              <div className={activeFormTab === "general" ? "block space-y-5" : "hidden"}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Title <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required
                      value={formData.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                        setFormData({ ...formData, title, ...(modalMode === 'create' ? { slug } : {}) });
                      }}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Slug <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required
                      value={formData.slug}
                      onChange={(e) => setFormData({...formData, slug: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Category <span className="text-red-500">*</span></label>
                    <select 
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Featured Image URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="url" 
                        value={formData.image}
                        onChange={(e) => setFormData({...formData, image: e.target.value})}
                        className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.published}
                      onChange={(e) => setFormData({...formData, published: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/50 border-border"
                    />
                    <span className="text-sm font-semibold">Publish this prompt</span>
                  </label>
                </div>
              </div>

              {/* CONTENT TAB (Rich Text) */}
              <div className={activeFormTab === "content" ? "block space-y-6" : "hidden"}>
                <div className="space-y-6 [&_.ql-toolbar]:bg-muted/50 [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-container]:border-none [&_.ql-editor]:min-h-[120px]">
                  <div className="border border-border rounded-lg overflow-hidden">
                    <label className="block text-sm font-semibold p-3 border-b border-border bg-muted/20">Explanation <span className="text-red-500">*</span></label>
                    <ReactQuill theme="snow" value={formData.explanation} onChange={(v) => setFormData({...formData, explanation: v})} />
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <label className="block text-sm font-semibold p-3 border-b border-border bg-muted/20">When to Use <span className="text-red-500">*</span></label>
                    <ReactQuill theme="snow" value={formData.whenToUse} onChange={(v) => setFormData({...formData, whenToUse: v})} />
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <label className="block text-sm font-semibold p-3 border-b border-border bg-muted/20">Best Practices <span className="text-red-500">*</span></label>
                    <ReactQuill theme="snow" value={formData.bestPractices} onChange={(v) => setFormData({...formData, bestPractices: v})} />
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <label className="block text-sm font-semibold p-3 border-b border-border bg-muted/20">Common Mistakes <span className="text-red-500">*</span></label>
                    <ReactQuill theme="snow" value={formData.commonMistakes} onChange={(v) => setFormData({...formData, commonMistakes: v})} />
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <label className="block text-sm font-semibold p-3 border-b border-border bg-muted/20">FAQs (Optional)</label>
                    <ReactQuill theme="snow" value={formData.faqs} onChange={(v) => setFormData({...formData, faqs: v})} />
                  </div>
                </div>
              </div>

              {/* EXAMPLES TAB */}
              <div className={activeFormTab === "examples" ? "block space-y-5" : "hidden"}>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Prompt Template <span className="text-red-500">*</span></label>
                  <p className="text-xs text-muted-foreground mb-2">The exact text the user will copy. Variables should be clear (e.g. [Insert Topic Here]).</p>
                  <textarea 
                    rows={6} required
                    value={formData.promptTemplate}
                    onChange={(e) => setFormData({...formData, promptTemplate: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Example Input <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={4} required
                    value={formData.exampleInput}
                    onChange={(e) => setFormData({...formData, exampleInput: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Example Output <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={6} required
                    value={formData.exampleOutput}
                    onChange={(e) => setFormData({...formData, exampleOutput: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono resize-y"
                  />
                </div>
              </div>

              {/* SEO TAB */}
              <div className={activeFormTab === "seo" ? "block space-y-5" : "hidden"}>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">SEO Title</label>
                  <input 
                    type="text" 
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({...formData, seoTitle: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">SEO Description</label>
                  <textarea 
                    rows={3}
                    value={formData.seoDesc}
                    onChange={(e) => setFormData({...formData, seoDesc: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                  />
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3 justify-end shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 font-bold rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="cookbook-form"
                disabled={isSaving}
                className="px-5 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Cookbook Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
