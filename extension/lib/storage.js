// All persistent extension state. The token lives in storage.local (never storage.sync, so it isn't copied to
// other devices). Nothing here is ever sent anywhere except the token as a bearer header to cuelara.com.

export async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return typeof token === "string" ? token : null;
}

export async function setToken(token) {
  await chrome.storage.local.set({ token });
}

export async function clearAccount() {
  await chrome.storage.local.remove(["token", "account"]);
}

/** Cached `me` response so the popup can paint instantly while it refreshes. */
export async function getAccountCache() {
  const { account } = await chrome.storage.local.get("account");
  return account || null;
}

export async function setAccountCache(account) {
  await chrome.storage.local.set({ account });
}

/** Site rules: [{ domain, mode: "block" | "allow" }]. Mirrors the account's rules when connected. */
export async function getRules() {
  const { rules } = await chrome.storage.local.get("rules");
  return Array.isArray(rules) ? rules : [];
}

export async function setRules(rules) {
  await chrome.storage.local.set({ rules });
}

/** Rule removals the server hasn't acknowledged yet (offline); replayed on the next sync. */
export async function getPendingDeletes() {
  const { pendingDeletes } = await chrome.storage.local.get("pendingDeletes");
  return Array.isArray(pendingDeletes) ? pendingDeletes : [];
}

export async function setPendingDeletes(domains) {
  await chrome.storage.local.set({ pendingDeletes: domains });
}

/**
 * The user's one-time acknowledgement that text they send through a tool goes to Cuelara and its AI providers.
 * Stored with a version so a future change to what is sent can ask again.
 */
export const NOTICE_VERSION = 1;

export async function getConsent() {
  const { noticeAccepted } = await chrome.storage.local.get("noticeAccepted");
  return noticeAccepted === NOTICE_VERSION;
}

export async function setConsent() {
  await chrome.storage.local.set({ noticeAccepted: NOTICE_VERSION });
}
