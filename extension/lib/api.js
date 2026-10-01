import { getApiBase } from "./config.js";
import { clearAccount, getToken } from "./storage.js";
import { toolById } from "./tools.js";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Calls cuelara.com with the connected account's token, or anonymously when nobody is connected. */
export async function apiFetch(path, { method = "GET", body } = {}) {
  const [base, token] = await Promise.all([getApiBase(), getToken()]);
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiError("Couldn't reach Cuelara. Check your connection and try again.", { code: "NETWORK" });
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return data;

  // The token was revoked (e.g. from the dashboard): drop it so the extension falls back to anonymous use.
  if (res.status === 401 && token && data && data.code !== "NOT_CONNECTED") {
    await clearAccount();
    throw new ApiError("You were signed out. Connect your account again.", { status: 401, code: "SIGNED_OUT" });
  }
  throw new ApiError((data && data.error) || "Something went wrong. Please try again.", { status: res.status, code: (data && data.code) || "" });
}

export const getMe = () => apiFetch("/api/extension/me");

/** Runs one text tool on `text` and resolves to { text, note }. */
export async function runTool(toolId, text) {
  const tool = toolById(toolId);
  if (!tool) throw new ApiError("Unknown tool.");
  const res = await apiFetch(tool.path, { method: "POST", body: tool.body(text) });
  const out = tool.output(res);
  if (typeof out !== "string" || !out.trim()) throw new ApiError("The AI didn't return a result. Please try again.", { status: 502 });
  return { text: out, note: tool.note ? tool.note(res) : "" };
}

export const putRule = (domain, mode) => apiFetch("/api/extension/site-rules", { method: "PUT", body: { domain, mode } });
export const deleteRule = (domain) => apiFetch(`/api/extension/site-rules?domain=${encodeURIComponent(domain)}`, { method: "DELETE" });
export const mergeRules = (rules) => apiFetch("/api/extension/site-rules", { method: "POST", body: { rules } });

export async function disconnectAccount() {
  try {
    await apiFetch("/api/extension/disconnect", { method: "POST" });
  } catch {
    // Revoking is best-effort: the token is dropped locally either way.
  }
  await clearAccount();
}
