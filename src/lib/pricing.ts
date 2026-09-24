export function formatPlanPrice(cents: number): { amount: string; period: string | null } {
  if (cents === 0) return { amount: "Free", period: null };
  const dollars = cents / 100;
  return { amount: `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`, period: "/month" };
}

/** Plan.features is stored as one feature per line. */
export function planFeatures(features: string | null): string[] {
  return (features ?? "").split("\n").map((f) => f.trim()).filter(Boolean);
}
