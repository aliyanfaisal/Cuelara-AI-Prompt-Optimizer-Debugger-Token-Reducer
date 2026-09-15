// A streamed route sends plain generated text, then one trailing control message
// carrying metadata (usage counters) or an error that only became known once
// generation finished. NUL never appears in generated text, so it's a safe delimiter
// between the visible text and the trailer — this file is the one place both the
// server (encode) and the client (decode) agree on that format.
const NUL = String.fromCharCode(0);
const META_MARKER = `${NUL}__META__`;
const ERROR_MARKER = `${NUL}__ERROR__`;

export function encodeStreamMeta(meta: unknown): string {
  return `${META_MARKER}${JSON.stringify(meta)}`;
}

export function encodeStreamError(message: string): string {
  return `${ERROR_MARKER}${message}`;
}

export interface StreamTrailer<TMeta> {
  text: string;
  meta: TMeta | null;
  error: string | null;
}

export function splitStreamTrailer<TMeta>(buffer: string): StreamTrailer<TMeta> {
  const idx = buffer.indexOf(NUL);
  if (idx === -1) return { text: buffer, meta: null, error: null };

  const text = buffer.slice(0, idx);
  const tail = buffer.slice(idx);

  if (tail.startsWith(META_MARKER)) {
    try {
      return { text, meta: JSON.parse(tail.slice(META_MARKER.length)) as TMeta, error: null };
    } catch {
      return { text, meta: null, error: null };
    }
  }
  if (tail.startsWith(ERROR_MARKER)) {
    return { text, meta: null, error: tail.slice(ERROR_MARKER.length) || null };
  }
  return { text, meta: null, error: null };
}
