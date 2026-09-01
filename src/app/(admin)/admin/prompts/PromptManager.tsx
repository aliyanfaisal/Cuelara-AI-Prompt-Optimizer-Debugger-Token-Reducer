"use client";

import { useState } from "react";
import { Search, Eye, EyeOff, Trash2, X, Lock, Unlock, AlignLeft, Hash, Plus, Image as ImageIcon } from "lucide-react";
import { togglePromptVisibility, deletePrompt, createPrompt } from "./actions";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export default function PromptManager({ initialPrompts }: { initialPrompts: any[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingPrompt, setViewingPrompt] = useState<any>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    title: "",
    image: "",
    content: "",
    model: "",
    tokens: 0,
    cost: 0,
    isPublic: false,
    tags: "",
  });

  const filteredPrompts = initialPrompts.filter(prompt => 
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    prompt.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleToggleVisibility(prompt: any) {
    const actionText = prompt.isPublic ? 'make private' : 'make public';
    if (confirm(`Are you sure you want to ${actionText} "${prompt.title}"?`)) {
      const result = await togglePromptVisibility(prompt.id, !prompt.isPublic);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }

  async function handleDelete(prompt: any) {
    if (confirm(`Are you absolutely sure you want to delete "${prompt.title}"? This cannot be undone.`)) {
      const result = await deletePrompt(prompt.id);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }

  async function handleCreatePrompt(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    
    const tagsArray = newPrompt.tags.split(",").map(t => t.trim()).filter(t => t !== "");
    
    const result = await createPrompt({
      ...newPrompt,
      tags: tagsArray,
    });
    
    if (result.error) {
      alert(result.error);
    } else {
      setIsCreateModalOpen(false);
      setNewPrompt({
        title: "", image: "", content: "", model: "", tokens: 0, cost: 0, isPublic: false, tags: ""
      });
      router.refresh();
    }
    setIsCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center bg-card border border-border rounded-xl px-4 py-3 shadow-sm w-full max-w-md">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input 
            type="text" 
            placeholder="Search prompts by title or user email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
          />
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] shrink-0"
        >
          <Plus className="w-5 h-5" /> Add New Prompt
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 font-semibold text-sm text-muted-foreground">Title & Model</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Author</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Tokens</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Visibility</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground">Created</th>
                <th className="p-4 font-semibold text-sm text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPrompts.map((prompt) => (
                <tr key={prompt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-foreground text-sm">{prompt.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {prompt.model || "Unknown Model"}
                      </span>
                      {prompt.tags?.length > 0 && (
                        <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {prompt.tags[0]} {prompt.tags.length > 1 && `+${prompt.tags.length - 1}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
                        {prompt.user?.image ? (
                          <Image src={prompt.user.image} alt="User" width={28} height={28} className="object-cover" />
                        ) : (
                          <span className="font-bold text-primary text-xs">{prompt.user?.email?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="truncate max-w-[120px]">
                        <p className="text-xs font-semibold">{prompt.user?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{prompt.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      {prompt.tokens || 0}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${prompt.isPublic ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {prompt.isPublic ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {prompt.isPublic ? 'Public' : 'Private'}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(prompt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewingPrompt(prompt)} className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg" title="View Prompt">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleVisibility(prompt)} className="p-2 text-muted-foreground hover:text-amber-500 transition-colors hover:bg-muted rounded-lg" title={prompt.isPublic ? "Make Private" : "Make Public"}>
                        {prompt.isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(prompt)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg" title="Delete Prompt">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredPrompts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No prompts found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Prompt Modal */}
      {viewingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <AlignLeft className="w-5 h-5 text-primary" /> 
                  {viewingPrompt.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  By {viewingPrompt.user?.email} • {new Date(viewingPrompt.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setViewingPrompt(null)} className="text-muted-foreground hover:text-foreground self-start p-1 bg-muted/50 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                  Model: {viewingPrompt.model || "N/A"}
                </span>
                <span className="text-xs font-semibold bg-muted text-foreground px-3 py-1 rounded-full border border-border flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {viewingPrompt.tokens || 0} tokens
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${viewingPrompt.isPublic ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                  {viewingPrompt.isPublic ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {viewingPrompt.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              
              {viewingPrompt.image && (
                <div className="mb-4">
                  <img src={viewingPrompt.image} alt={viewingPrompt.title} className="w-full max-h-64 object-cover rounded-xl border border-border" />
                </div>
              )}
              
              <div className="bg-muted/30 border border-border rounded-xl p-5 relative group">
                <div className="absolute top-3 right-3 text-xs text-muted-foreground uppercase tracking-wider font-bold">Content</div>
                <div className="text-sm text-foreground mt-4 pt-2 border-t border-border/50 max-w-none prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: viewingPrompt.content }}></div>
              </div>
              
              {viewingPrompt.tags && viewingPrompt.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingPrompt.tags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-md border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3 justify-end shrink-0">
              <button 
                onClick={() => setViewingPrompt(null)}
                className="px-5 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_4px_14px_0_rgb(0,0,0,0.1)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Prompt Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Create New Prompt
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground self-start p-1 bg-muted/50 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form id="create-prompt-form" onSubmit={handleCreatePrompt} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Title <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={newPrompt.title}
                    onChange={(e) => setNewPrompt({...newPrompt, title: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Master Marketing Strategist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Featured Image URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <input 
                      type="url" 
                      value={newPrompt.image}
                      onChange={(e) => setNewPrompt({...newPrompt, image: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Prompt Content (HTML Supported) <span className="text-red-500">*</span></label>
                <div className="border border-border rounded-lg overflow-hidden [&_.ql-toolbar]:bg-muted/50 [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-container]:border-none [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-base">
                  <ReactQuill 
                    theme="snow"
                    value={newPrompt.content}
                    onChange={(val) => setNewPrompt({...newPrompt, content: val})}
                    placeholder="Write your prompt content here..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Target Model</label>
                  <input 
                    type="text" 
                    value={newPrompt.model}
                    onChange={(e) => setNewPrompt({...newPrompt, model: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. GPT-4o"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Token Count</label>
                  <input 
                    type="number" 
                    value={newPrompt.tokens || ""}
                    onChange={(e) => setNewPrompt({...newPrompt, tokens: parseInt(e.target.value) || 0})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Estimated Cost ($)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    value={newPrompt.cost || ""}
                    onChange={(e) => setNewPrompt({...newPrompt, cost: parseFloat(e.target.value) || 0})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Tags (comma-separated)</label>
                  <input 
                    type="text" 
                    value={newPrompt.tags}
                    onChange={(e) => setNewPrompt({...newPrompt, tags: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="marketing, seo, blog"
                  />
                </div>
                <div className="flex flex-col h-full justify-center">
                  <label className="block text-sm font-semibold mb-2 text-foreground">Visibility</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={newPrompt.isPublic}
                      onChange={(e) => setNewPrompt({...newPrompt, isPublic: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      {newPrompt.isPublic ? <><Unlock className="w-4 h-4 text-emerald-500" /> Public</> : <><Lock className="w-4 h-4" /> Private</>}
                    </span>
                  </label>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3 justify-end shrink-0">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 font-bold rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="create-prompt-form"
                disabled={isCreating}
                className="px-5 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Save Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
