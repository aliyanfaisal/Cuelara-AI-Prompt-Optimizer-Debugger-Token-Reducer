"use client";

import { useState, useEffect } from "react";
import { Search, Edit2, Trash2, X, Plus, Sparkles, Loader2, Check } from "lucide-react";
import { createCookbookCategory, updateCookbookCategory, deleteCookbookCategory, bulkCreateCookbookCategories } from "./actions";
import { useRouter } from "next/navigation";

export default function CookbookCategoryManager({ initialCategories }: { initialCategories: any[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: "", slug: "", description: "", parentId: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk Generation State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3>(1);
  const [bulkHint, setBulkHint] = useState("");
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [generatedCategories, setGeneratedCategories] = useState<{name: string, slug: string, description: string, selected: boolean, children?: {name: string, slug: string, description: string, selected: boolean}[]}[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const filteredCategories = initialCategories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function openCreateModal() {
    setModalMode("create");
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "", parentId: "" });
    setIsModalOpen(true);
  }

  function openEditModal(category: any) {
    setModalMode("edit");
    setEditingCategory(category);
    setFormData({ 
      name: category.name, 
      slug: category.slug, 
      description: category.description || "",
      parentId: category.parentId || ""
    });
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    let result;
    if (modalMode === "create") {
      result = await createCookbookCategory(formData);
    } else {
      result = await updateCookbookCategory(editingCategory.id, formData);
    }
    
    if (result.error) {
      alert(result.error);
    } else {
      setIsModalOpen(false);
      router.refresh();
    }
    setIsSaving(false);
  }

  async function handleDelete(category: any) {
    if (confirm(`Are you sure you want to delete category "${category.name}"? This cannot be undone.`)) {
      const result = await deleteCookbookCategory(category.id);
      if (result.error) alert(result.error);
      else router.refresh();
    }
  }

  async function handleGenerateBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkStep(2);
    try {
      const res = await fetch("/api/admin/generate-bulk-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint: bulkHint, count: bulkCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      
      const mapped = data.data.map((c: any) => ({ 
        ...c, 
        selected: true,
        children: c.children ? c.children.map((child: any) => ({ ...child, selected: true })) : []
      }));
      setGeneratedCategories(mapped);
      setBulkStep(3);
    } catch (error: any) {
      alert("Error: " + error.message);
      setBulkStep(1);
    }
  }

  async function handleImportBulk() {
    setIsBulkSaving(true);
    
    // Filter out unselected parents, and for selected parents, filter out unselected children
    const toImport = generatedCategories
      .filter(c => c.selected)
      .map(c => ({
        name: c.name,
        slug: c.slug,
        description: c.description,
        children: c.children?.filter(child => child.selected).map(child => ({
          name: child.name,
          slug: child.slug,
          description: child.description
        })) || []
      }));
    
    if (toImport.length === 0) {
      alert("No categories selected.");
      setIsBulkSaving(false);
      return;
    }

    const result = await bulkCreateCookbookCategories(toImport);
    if (result.error) {
      alert(result.error);
    } else {
      setShowBulkModal(false);
      setGeneratedCategories([]);
      setBulkStep(1);
      router.refresh();
      alert(`Successfully imported ${result.count} categories!`);
    }
    setIsBulkSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center bg-card border border-border rounded-xl px-4 py-3 shadow-sm w-full max-w-md">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
          />
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => {
              setBulkStep(1);
              setBulkHint("");
              setBulkCount(10);
              setGeneratedCategories([]);
              setShowBulkModal(true);
            }}
            className="bg-amber-500/10 text-amber-600 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.05)]"
          >
            <Sparkles className="w-5 h-5" /> Auto-Generate
          </button>
          
          <button 
            onClick={openCreateModal}
            className="bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)]"
          >
            <Plus className="w-5 h-5" /> Add Category
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {paginatedCategories.length > 0 ? (
                paginatedCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{cat.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {cat.parentId ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                          {initialCategories.find(c => c.id === cat.parentId)?.name || "Unknown"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{cat.slug}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground truncate max-w-xs">{cat.description || "No description"}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(cat)} className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-lg" title="Edit Category">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg" title="Delete Category">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No categories found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of {filteredCategories.length} categories
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
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden relative">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {modalMode === 'create' ? 'Create Category' : 'Edit Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form id="category-form" onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData({ ...formData, name, ...(modalMode === 'create' ? { slug } : {}) });
                  }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Slug <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  placeholder="e.g. marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Brief description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Parent Category (Optional)</label>
                <select 
                  value={formData.parentId}
                  onChange={(e) => setFormData({...formData, parentId: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">None (Top-level)</option>
                  {initialCategories.filter(c => c.id !== editingCategory?.id && !c.parentId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </form>
            
            <div className="p-6 border-t border-border bg-muted/20 flex gap-3 justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 font-bold rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="category-form"
                disabled={isSaving}
                className="px-5 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> AI Category Generator
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {bulkStep === 1 && (
              <form id="bulk-form" onSubmit={handleGenerateBulk} className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Context / Hint (Optional)</label>
                  <p className="text-xs text-muted-foreground mb-3">Provide a hint to guide the AI on what kinds of categories you need (e.g. "Categories related to AI video generation").</p>
                  <textarea 
                    rows={3}
                    value={bulkHint}
                    onChange={(e) => setBulkHint(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                    placeholder="e.g., I need categories for an AI automation platform..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Number of Parent Categories</label>
                  <p className="text-xs text-muted-foreground mb-3">The AI will generate this many top-level categories, plus up to 3 sub-categories for each.</p>
                  <input 
                    type="number"
                    min="1" max="50"
                    required
                    value={bulkCount}
                    onChange={(e) => setBulkCount(parseInt(e.target.value) || 10)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit"
                    className="px-6 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    Generate {bulkCount} Categories
                  </button>
                </div>
              </form>
            )}

            {bulkStep === 2 && (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <h4 className="text-lg font-bold">Generating Categories...</h4>
                <p className="text-muted-foreground mt-2">The AI is thinking. This usually takes 5-10 seconds.</p>
              </div>
            )}

            {bulkStep === 3 && (
              <>
                <div className="p-6 flex-1 overflow-y-auto bg-muted/10 space-y-3">
                  <p className="text-sm font-medium mb-4">Select the categories you want to import:</p>
                  {generatedCategories.map((cat, idx) => (
                    <div key={idx} className={`rounded-xl border transition-colors overflow-hidden ${cat.selected ? 'bg-card border-primary ring-1 ring-primary/20' : 'bg-card/50 border-border opacity-70 hover:opacity-100'}`}>
                      <label className="flex items-start gap-4 p-4 cursor-pointer">
                        <div className="mt-0.5">
                          <input 
                            type="checkbox"
                            checked={cat.selected}
                            onChange={(e) => {
                              const newCats = [...generatedCategories];
                              newCats[idx].selected = e.target.checked;
                              // Auto check/uncheck children based on parent
                              if (newCats[idx].children) {
                                newCats[idx].children.forEach(child => child.selected = e.target.checked);
                              }
                              setGeneratedCategories(newCats);
                            }}
                            className="w-5 h-5 rounded text-primary focus:ring-primary/50 border-border"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-foreground">{cat.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 mb-1.5">{cat.slug}</p>
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        </div>
                      </label>
                      
                      {/* Children rendering */}
                      {cat.children && cat.children.length > 0 && (
                        <div className="bg-muted/30 border-t border-border px-4 py-3 pl-12 space-y-2">
                          {cat.children.map((child, childIdx) => (
                            <label key={childIdx} className="flex items-start gap-3 cursor-pointer">
                              <div className="mt-0.5">
                                <input 
                                  type="checkbox"
                                  checked={child.selected}
                                  onChange={(e) => {
                                    const newCats = [...generatedCategories];
                                    newCats[idx].children![childIdx].selected = e.target.checked;
                                    setGeneratedCategories(newCats);
                                  }}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary/50 border-border"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-foreground leading-tight">{child.name}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5 mb-1">{child.slug}</p>
                                <p className="text-xs text-muted-foreground">{child.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-border bg-card flex justify-between items-center shrink-0">
                  <p className="text-sm font-medium">
                    {generatedCategories.filter(c => c.selected).length + generatedCategories.reduce((acc, curr) => acc + (curr.children?.filter(child => child.selected).length || 0), 0)} total selected
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setBulkStep(1)}
                      className="px-5 py-2.5 font-bold rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                      disabled={isBulkSaving}
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleImportBulk}
                      disabled={isBulkSaving || generatedCategories.filter(c => c.selected).length === 0}
                      className="px-6 py-2.5 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {isBulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Import Selected
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
