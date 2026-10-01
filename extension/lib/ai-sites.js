// The AI tools where the Cuelara field widget runs on its own. Every other website needs the user to activate it
// (toolbar click) or to "always allow" it. Keep this list and manifest.json's host_permissions in sync —
// scripts/build-extension.mjs fails the build if they drift apart.
//
// `subdomains: true` covers the domain and everything under it (an AI-only domain). Otherwise only the exact host
// is matched, optionally limited to a path, for sites that are not AI-only.
const SITES = [
  // Chat assistants
  { host: "chatgpt.com", subdomains: true },
  { host: "chat.openai.com" },
  { host: "platform.openai.com" },
  { host: "claude.ai", subdomains: true },
  { host: "console.anthropic.com" },
  { host: "gemini.google.com" },
  { host: "aistudio.google.com" },
  { host: "notebooklm.google.com" },
  { host: "labs.google" },
  { host: "copilot.microsoft.com" },
  { host: "perplexity.ai", subdomains: true },
  { host: "grok.com", subdomains: true },
  { host: "x.com", path: "/i/grok*" },
  { host: "chat.deepseek.com" },
  { host: "chat.mistral.ai" },
  { host: "chat.qwen.ai" },
  { host: "chat.z.ai" },
  { host: "kimi.com", subdomains: true },
  { host: "poe.com", subdomains: true },
  { host: "meta.ai", subdomains: true },
  { host: "you.com", subdomains: true },
  { host: "pi.ai", subdomains: true },
  { host: "t3.chat" },
  { host: "genspark.ai", subdomains: true },
  { host: "manus.im", subdomains: true },
  { host: "monica.im", subdomains: true },
  { host: "felo.ai", subdomains: true },
  { host: "huggingface.co", path: "/chat*" },
  { host: "character.ai", subdomains: true },
  { host: "phind.com", subdomains: true },
  { host: "openrouter.ai", subdomains: true },
  { host: "lmarena.ai", subdomains: true },
  // Builders and coding
  { host: "v0.dev" },
  { host: "v0.app" },
  { host: "bolt.new" },
  { host: "lovable.dev", subdomains: true },
  { host: "replit.com" },
  { host: "github.com", path: "/copilot*" },
  // Image, video and audio
  { host: "midjourney.com", subdomains: true },
  { host: "leonardo.ai", subdomains: true },
  { host: "ideogram.ai", subdomains: true },
  { host: "krea.ai", subdomains: true },
  { host: "firefly.adobe.com" },
  { host: "runwayml.com", subdomains: true },
  { host: "suno.com", subdomains: true },
  // Writing and productivity
  { host: "notion.so", subdomains: true },
  { host: "gamma.app", subdomains: true },
  { host: "jasper.ai", subdomains: true },
  { host: "writesonic.com", subdomains: true },
  { host: "copy.ai", subdomains: true },
];

/** Chrome match patterns for every built-in AI site (https only). */
export const AI_SITE_MATCHES = SITES.map((s) => `https://${s.subdomains ? "*." : ""}${s.host}${s.path || "/*"}`);

/** The built-in AI site a URL belongs to, or null. */
export function aiSiteFor(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const hostname = url.hostname.toLowerCase();
  return (
    SITES.find((s) => {
      const hostOk = s.subdomains ? hostname === s.host || hostname.endsWith(`.${s.host}`) : hostname === s.host;
      if (!hostOk) return false;
      if (!s.path) return true;
      return url.pathname.startsWith(s.path.replace(/\*$/, ""));
    }) || null
  );
}
