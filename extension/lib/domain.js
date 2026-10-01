// Mirrors src/lib/extension/domain.ts on the server — both must reduce a URL to the same stored domain.
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Reduces a hostname or URL to the bare domain a site rule is stored under, or null if it isn't a real hostname. */
export function normalizeDomain(input) {
  let host = String(input || "").trim().toLowerCase();
  if (!host || host.length > 253) return null;
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  host = host.split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/^\*\./, "").replace(/^www\./, "").replace(/\.$/, "");
  const labels = host.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null;
  if (labels.every((l) => /^\d+$/.test(l))) return null;
  return host;
}

/** True when `hostname` is `domain` itself or one of its subdomains. */
export function domainCovers(domain, hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === domain || h.endsWith(`.${domain}`);
}

/** Chrome match pattern covering a domain, its subdomains, and both schemes. */
export function matchPatternFor(domain) {
  return `*://*.${domain}/*`;
}
