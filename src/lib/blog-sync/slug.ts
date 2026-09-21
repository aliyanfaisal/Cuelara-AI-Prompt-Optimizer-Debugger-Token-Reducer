export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slugifies labels, drops ones that slugify to nothing, and de-duplicates by slug (first name wins). */
export function toLabelSlugs(names: string[]): { name: string; slug: string }[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name);
    if (slug && !seen.has(slug)) seen.set(slug, name.trim());
  }
  return [...seen].map(([slug, name]) => ({ slug, name }));
}

/** Returns `base`, or `base-2`, `base-3`, ... — the first candidate `isTaken` reports as free. */
export async function resolveUniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  for (let n = 2; await isTaken(candidate); n++) candidate = `${base}-${n}`;
  return candidate;
}
