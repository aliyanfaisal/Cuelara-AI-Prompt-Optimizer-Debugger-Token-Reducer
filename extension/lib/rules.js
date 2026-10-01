import { AI_SITE_MATCHES } from "./ai-sites.js";
import { CUELARA_ORIGINS } from "./config.js";
import { deleteRule, mergeRules, putRule } from "./api.js";
import { domainCovers, matchPatternFor, normalizeDomain } from "./domain.js";
import { getPendingDeletes, getRules, getToken, setPendingDeletes, setRules } from "./storage.js";

const WIDGET_SCRIPT_ID = "cuelara-widget";
const WIDGET_FILE = "content/widget.js";

/** The rule that applies to a hostname, if any. A rule on a domain covers its subdomains; "block" beats "allow". */
export function ruleFor(rules, hostname) {
  const covering = rules.filter((r) => domainCovers(r.domain, hostname));
  return covering.find((r) => r.mode === "block") || covering.find((r) => r.mode === "allow") || null;
}

/**
 * Registers the field widget for the built-in AI sites plus every site the user chose to always allow, minus every
 * blocked domain. A blocked site is excluded at registration, so the script is never injected there at all.
 */
export async function registerWidget() {
  const rules = await getRules();
  const allowed = [];
  for (const rule of rules) {
    if (rule.mode !== "allow") continue;
    const pattern = matchPatternFor(rule.domain);
    // A synced "allow" rule is only honoured on browsers where the user granted that site's permission.
    if (await chrome.permissions.contains({ origins: [pattern] }).catch(() => false)) allowed.push(pattern);
  }
  const excludeMatches = [
    ...rules.filter((r) => r.mode === "block").map((r) => matchPatternFor(r.domain)),
    ...CUELARA_ORIGINS.map((o) => `${o}/*`),
  ];
  const script = {
    id: WIDGET_SCRIPT_ID,
    js: [WIDGET_FILE],
    matches: [...new Set([...AI_SITE_MATCHES, ...allowed])],
    excludeMatches,
    runAt: "document_idle",
    allFrames: false,
    persistAcrossSessions: true,
  };
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [WIDGET_SCRIPT_ID] });
    if (existing.length > 0) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
  } catch (error) {
    console.warn("Cuelara: could not register the field widget.", error);
  }
}

/** Saves a rule locally right away (the widget reacts instantly), then pushes it to the account in the background. */
export async function saveRule(rawDomain, mode) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) throw new Error("That isn't a valid website address.");
  const rules = (await getRules()).filter((r) => r.domain !== domain);
  rules.push({ domain, mode });
  await setRules(rules);
  await registerWidget();
  if (await getToken()) putRule(domain, mode).catch(() => {});
}

export async function removeRule(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) return;
  await setRules((await getRules()).filter((r) => r.domain !== domain));
  await registerWidget();
  if (await getToken()) {
    try {
      await deleteRule(domain);
    } catch {
      // Offline: remember the removal so it isn't resurrected by the next merge.
      await setPendingDeletes([...new Set([...(await getPendingDeletes()), domain])]);
    }
  }
}

/**
 * Brings this browser and the account in line: replays offline removals, uploads rules made while signed out
 * (the account's existing choices win), and adopts the account's list. Signed out, it only re-registers the widget.
 */
export async function syncRules() {
  if (await getToken()) {
    try {
      for (const domain of await getPendingDeletes()) await deleteRule(domain);
      await setPendingDeletes([]);
      const merged = await mergeRules(await getRules());
      if (merged && Array.isArray(merged.rules)) await setRules(merged.rules);
    } catch {
      // Keep working from the local copy; the next sync tries again.
    }
  }
  await registerWidget();
}
