"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, CreditCard, Star, Users, Loader2, X, Check } from "lucide-react";
import { PLAN_TOOLS } from "@/lib/plan-tools";
import { createPlan, updatePlan, deletePlan, type PlanRow, type PlanLimitInput } from "./actions";

function formatUsd(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}/mo`;
}

interface FormState {
  name: string;
  description: string;
  priceDollars: string;
  isDefault: boolean;
  isActive: boolean;
  isFeatured: boolean;
  features: string;
  historyPerTool: string;
  limits: Record<string, string>; // tool -> string input, blank = no override
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  priceDollars: "0",
  isDefault: false,
  isActive: true,
  isFeatured: false,
  features: "",
  historyPerTool: "20",
  limits: {},
};

function planToForm(plan: PlanRow): FormState {
  const limits: Record<string, string> = {};
  for (const l of plan.limits) limits[l.tool] = String(l.dailyLimit);
  return {
    name: plan.name,
    description: plan.description ?? "",
    priceDollars: (plan.priceMonthlyCents / 100).toString(),
    isDefault: plan.isDefault,
    isActive: plan.isActive,
    isFeatured: plan.isFeatured,
    features: plan.features,
    historyPerTool: String(plan.historyPerTool),
    limits,
  };
}

function formToLimits(form: FormState): PlanLimitInput[] {
  return PLAN_TOOLS.map((t) => ({ tool: t.id, dailyLimit: Number(form.limits[t.id] || 0) }));
}

export default function PlansManager({ initialPlans }: { initialPlans: PlanRow[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEdit(plan: PlanRow) {
    setModalMode("edit");
    setEditingId(plan.id);
    setForm(planToForm(plan));
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    setFormError(null);

    const payload = {
      name: form.name,
      description: form.description,
      priceMonthlyCents: Math.round(Number(form.priceDollars || 0) * 100),
      isDefault: form.isDefault,
      isActive: form.isActive,
      features: form.features,
      isFeatured: form.isFeatured,
      historyPerTool: Number(form.historyPerTool),
      limits: formToLimits(form),
    };

    const result = modalMode === "create" ? await createPlan(payload) : await updatePlan(editingId!, payload);
    setIsSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    setIsModalOpen(false);
    // Full reload of plan list is simplest here — this is a low-traffic admin screen.
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this plan? Any users on it fall back to normal limits.")) return;
    setPendingDeleteId(id);
    const result = await deletePlan(id);
    setPendingDeleteId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <CreditCard className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No plans yet — create one to start granting custom limits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-border flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    {plan.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Star className="w-2.5 h-2.5" /> Default
                      </span>
                    )}
                    {!plan.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{formatUsd(plan.priceMonthlyCents)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit plan">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    disabled={pendingDeleteId === plan.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete plan"
                  >
                    {pendingDeleteId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {plan.description && <p className="px-5 pt-4 text-xs text-muted-foreground leading-relaxed">{plan.description}</p>}

              <div className="p-5 space-y-1.5 flex-1">
                {plan.limits.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No per-tool overrides — uses normal authenticated limits.</p>
                ) : (
                  plan.limits.map((l) => {
                    const label = PLAN_TOOLS.find((t) => t.id === l.tool)?.label ?? l.tool;
                    return (
                      <div key={l.tool} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{l.dailyLimit} / day</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> {plan.userCount} user{plan.userCount === 1 ? "" : "s"} on this plan
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">{modalMode === "create" ? "New Plan" : "Edit Plan"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">{formError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Plan name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Pro"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description (optional, shown on /pricing)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short tagline shown under the plan name on /pricing"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Monthly price (USD): display only, no billing yet</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceDollars}
                  onChange={(e) => setForm({ ...form, priceDollars: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Features shown on /pricing (one per line)</label>
                <textarea
                  rows={5}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder={"All 8 tools included\n15 runs per tool, per day"}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Saved history per tool (runs kept in each user&rsquo;s dashboard; older ones are deleted)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={form.historyPerTool}
                  onChange={(e) => setForm({ ...form, historyPerTool: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
                  Highlight as &ldquo;Most popular&rdquo;
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                  Default plan for new signups
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Per-tool daily limits — leave blank to use the tool&rsquo;s normal authenticated limit
                </label>
                <div className="space-y-2">
                  {PLAN_TOOLS.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-foreground">{t.label}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="default"
                        value={form.limits[t.id] ?? ""}
                        onChange={(e) => setForm({ ...form, limits: { ...form.limits, [t.id]: e.target.value } })}
                        className="w-24 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {modalMode === "create" ? "Create Plan" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
