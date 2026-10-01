export type SiteRuleMode = "block" | "allow";

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Reduces a hostname or URL to the bare domain a site rule is stored under: lowercase, no scheme, path, port,
 * "www." or "*." prefix. A rule on "example.com" covers every subdomain of it. Returns null for anything that
 * isn't a real hostname (IP addresses and single-label hosts like "localhost" included).
 */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  if (!host || host.length > 253) return null;
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  host = host.split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/^\*\./, "").replace(/^www\./, "").replace(/\.$/, "");

  const labels = host.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null;
  if (labels.every((l) => /^\d+$/.test(l))) return null;
  return host;
}

/** True when `hostname` is `domain` itself or one of its subdomains. */
export function domainCovers(domain: string, hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === domain || h.endsWith(`.${domain}`);
}
