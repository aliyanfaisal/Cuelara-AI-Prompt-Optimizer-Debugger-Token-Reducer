"use client";

import { useRouter } from "next/navigation";

export function CategorySelect({ categories, active, q }: { categories: { name: string; slug: string }[]; active?: string; q?: string }) {
  const router = useRouter();

  return (
    <select
      value={active ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (e.target.value) params.set("category", e.target.value);
        if (q) params.set("q", q);
        const query = params.toString();
        router.push(query ? `/cookbook?${query}` : "/cookbook");
      }}
      aria-label="Filter by category"
      className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <option value="">All Prompts</option>
      {categories.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
