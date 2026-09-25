"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { PROVIDER_LABELS } from "@/lib/providers";
import { MAX_OPENROUTER_MODELS, type OrderableProvider } from "@/lib/model-order";
import {
  activateOwnKeysPlan, addOwnKey, deleteOwnKey, setOwnKeyActive, setUseOwnKeys, updateOwnOrder, updateOwnOpenRouterModels,
  type OwnKeyRow, type OwnModelsState,
} from "./actions";

const KEY_HINTS: Record<OrderableProvider, string> = {
  gemini: "Google AI Studio key. Also used for Context Extractor embeddings.",
  groq: "Groq console key.",
  openrouter: "OpenRouter key — free models only.",
};

export function ActivateOwnKeysPlan({ planName }: { planName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await activateOwnKeysPlan();
            if ("error" in result) return setError(result.error);
            router.refresh();
          })
        }
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Switch to {planName}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

function SortableRow({ provider, position, activeKeys }: { provider: OrderableProvider; position: number; activeKeys: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: provider });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-background px-3 py-3 ${isDragging ? "relative z-10 border-primary shadow-lg" : "border-border"}`}
    >
      <button {...attributes} {...listeners} aria-label={`Drag to reorder ${PROVIDER_LABELS[provider]}`} className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{position}</span>
      <p className="text-sm font-semibold">{PROVIDER_LABELS[provider]}</p>
      <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${activeKeys > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
        {activeKeys > 0 ? `${activeKeys} active key${activeKeys === 1 ? "" : "s"}` : "no keys — skipped"}
      </span>
    </div>
  );
}

function KeyCard({ provider, keys, onChange }: { provider: OrderableProvider; keys: OwnKeyRow[]; onChange: (keys: OwnKeyRow[]) => void }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setSaving(true);
    setError(null);
    const result = await addOwnKey(provider, newKey, newLabel);
    setSaving(false);
    if ("error" in result) return setError(result.error);
    setNewKey("");
    setNewLabel("");
    setAdding(false);
    router.refresh(); // pulls the saved row (real id, masked key) back from the server
  }

  async function handleToggle(id: string, isActive: boolean) {
    setBusyId(id);
    const result = await setOwnKeyActive(id, isActive);
    setBusyId(null);
    if ("error" in result) return setError(result.error);
    onChange(keys.map((k) => (k.id === id ? { ...k, isActive } : k)));
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteOwnKey(id);
    setBusyId(null);
    if ("error" in result) return setError(result.error);
    onChange(keys.filter((k) => k.id !== id));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h4 className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4 text-primary" /> {PROVIDER_LABELS[provider]}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{KEY_HINTS[provider]}</p>
      </div>
      <div className="space-y-2.5 p-5">
        {keys.length === 0 && !adding && <p className="text-sm italic text-muted-foreground">No keys added yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
            <input type="checkbox" checked={k.isActive} disabled={busyId === k.id} onChange={(e) => handleToggle(k.id, e.target.checked)} aria-label="Key active" className="h-4 w-4 accent-[var(--primary)]" />
            <span className="font-mono text-sm">{k.maskedKey}</span>
            {k.label && <span className="truncate text-xs text-muted-foreground">{k.label}</span>}
            <button onClick={() => handleDelete(k.id)} disabled={busyId === k.id} title="Remove key" className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50">
              {busyId === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        ))}
        {adding ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <input type="password" autoComplete="off" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Paste API key" autoFocus className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <div className="flex gap-2 pt-1">
              <button onClick={handleAdd} disabled={saving || !newKey.trim()} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving ? "Saving..." : "Save key"}</button>
              <button onClick={() => { setAdding(false); setNewKey(""); setNewLabel(""); }} className="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary">
            <Plus className="h-4 w-4" /> Add {PROVIDER_LABELS[provider]} key
          </button>
        )}
        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </div>
  );
}

export function ModelsManager({ initial }: { initial: OwnModelsState }) {
  const [useOwn, setUseOwn] = useState(initial.useOwnKeys);
  const [order, setOrder] = useState(initial.order);
  const [models, setModels] = useState(initial.openRouterModels);
  const [keys, setKeys] = useState<Record<string, OwnKeyRow[]>>(initial.keysByProvider);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // After router.refresh() the server sends the new key rows; adopt them.
  const serverKeys = initial.keysByProvider;
  const [seenServerKeys, setSeenServerKeys] = useState(serverKeys);
  if (serverKeys !== seenServerKeys) {
    setSeenServerKeys(serverKeys);
    setKeys(serverKeys);
  }

  const activeCount = (p: OrderableProvider) => (keys[p] ?? []).filter((k) => k.isActive).length;
  const hasAnyKey = order.some((p) => activeCount(p) > 0);

  async function handleToggle(next: boolean) {
    setError(null);
    const result = await setUseOwnKeys(next);
    if ("error" in result) return setError(result.error);
    setUseOwn(next);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(order, order.indexOf(active.id as OrderableProvider), order.indexOf(over.id as OrderableProvider));
    setOrder(next);
    const result = await updateOwnOrder(next);
    if ("error" in result) {
      setError(result.error);
      setOrder(previous);
    }
  }

  const slots = Array.from({ length: MAX_OPENROUTER_MODELS }, (_, i) => models[i] ?? "");
  const options = [...initial.freeModels, ...models.filter((m) => !initial.freeModels.some((f) => f.id === m)).map((id) => ({ id, contextLength: undefined as number | undefined }))];

  async function handleSlot(index: number, value: string) {
    const nextSlots = [...slots];
    nextSlots[index] = value;
    const next = nextSlots.filter(Boolean);
    if (new Set(next).size !== next.length) return setError("Pick two different models.");
    setError(null);
    const result = await updateOwnOpenRouterModels(next);
    if ("error" in result) return setError(result.error);
    setModels(next);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={useOwn} onChange={(e) => handleToggle(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
          <span>
            <span className="block text-sm font-bold text-foreground">Use my own keys</span>
            <span className="block text-xs text-muted-foreground">
              When on, your tools run on the keys below, in the order you set, and the provider bills you directly. If none of your keys are active, the tools fall back to Cuelara&apos;s models.
            </span>
            {useOwn && !hasAnyKey && <span className="mt-1 block text-xs font-semibold text-amber-600 dark:text-amber-400">No active keys yet — add one below to start using them.</span>}
          </span>
        </label>
        {error && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold text-foreground">Model priority</h3>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">Drag to reorder. Providers are tried top to bottom; one without an active key is skipped. Saves automatically.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {order.map((p, i) => <SortableRow key={p} provider={p} position={i + 1} activeKeys={activeCount(p)} />)}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold text-foreground">OpenRouter free models</h3>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">If the first fails, the second is tried. Leave both empty to use the richest-context free models automatically.</p>
        <div className="space-y-2">
          {slots.map((value, i) => (
            <label key={i} className="flex items-center gap-3 text-xs">
              <span className="w-16 shrink-0 font-medium text-muted-foreground">{i === 0 ? "First" : "Fallback"}</span>
              <select value={value} disabled={i > 0 && !slots[0]} onChange={(e) => handleSlot(i, e.target.value)} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50">
                <option value="">{i === 0 ? "Automatic" : "None"}</option>
                {options.map((m) => <option key={m.id} value={m.id}>{m.id}{m.contextLength ? ` (${Math.round(m.contextLength / 1000)}k ctx)` : ""}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        {order.map((p) => (
          <KeyCard key={p} provider={p} keys={keys[p] ?? []} onChange={(next) => setKeys((prev) => ({ ...prev, [p]: next }))} />
        ))}
      </div>
    </div>
  );
}
