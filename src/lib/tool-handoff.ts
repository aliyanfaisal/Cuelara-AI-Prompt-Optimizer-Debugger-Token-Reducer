"use client";

// Carries a result from one tool page to the next (e.g. "Next: Check it for ambiguity") across a full
// navigation, since there's no shared client state between pages. sessionStorage survives the navigation
// but not a new tab, which is fine here — handoffs are same-tab, one-shot reads.
const KEY = "cuelara:tool-handoff";

export function setToolHandoff(text: string): void {
  try {
    sessionStorage.setItem(KEY, text);
  } catch {
    // Private browsing / storage disabled: the link still navigates, it just won't prefill.
  }
}

/** Reads and clears the pending handoff, if any. Call once on mount. */
export function consumeToolHandoff(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    if (value !== null) sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
