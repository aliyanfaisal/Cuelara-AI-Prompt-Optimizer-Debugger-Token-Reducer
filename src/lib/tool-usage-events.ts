/** Tool pages dispatch this after a run so the sidebar's usage meters update without a page reload. */
export const TOOL_USAGE_CHANGED_EVENT = "cuelara:tool-usage-changed";

export function notifyToolUsageChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TOOL_USAGE_CHANGED_EVENT));
}
