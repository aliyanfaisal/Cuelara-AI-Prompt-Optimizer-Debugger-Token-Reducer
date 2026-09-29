export function formatPlanPrice(cents: number, interval: "month" | "year" = "month"): { amount: string; period: string | null } {
  if (cents === 0) return { amount: "Free", period: null };
  const dollars = cents / 100;
  return { amount: `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`, period: interval === "month" ? "/month" : "/year" };
}

/** What a yearly price saves versus paying that plan's monthly price for 12 months, as a rounded percentage. */
export function yearlySavingsPercent(monthlyCents: number, yearlyCents: number): number {
  if (monthlyCents <= 0 || yearlyCents <= 0) return 0;
  const fullYearAtMonthly = monthlyCents * 12;
  return Math.max(0, Math.round((1 - yearlyCents / fullYearAtMonthly) * 100));
}

/** Plan.features is stored as one feature per line. */
export function planFeatures(features: string | null): string[] {
  return (features ?? "").split("\n").map((f) => f.trim()).filter(Boolean);
}
