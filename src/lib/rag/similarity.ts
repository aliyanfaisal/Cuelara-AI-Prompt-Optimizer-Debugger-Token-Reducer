import { Chunk } from "./chunk";

export interface RankedChunk {
  id: number;
  relevance: number;
  section: string;
  content: string;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const RELEVANCE_MIN_DISPLAY = 35;
const RELEVANCE_MAX_DISPLAY = 99;

function toDisplayRelevance(cosine: number): number {
  const clamped = Math.max(0, Math.min(1, cosine));
  const scaled = RELEVANCE_MIN_DISPLAY + clamped * (RELEVANCE_MAX_DISPLAY - RELEVANCE_MIN_DISPLAY);
  return Math.round(scaled);
}

export function rankTopK(
  chunks: Chunk[],
  chunkEmbeddings: number[][],
  queryEmbedding: number[],
  k: number
): RankedChunk[] {
  const scored = chunks.map((chunk, i) => ({
    chunk,
    cosine: cosineSimilarity(chunkEmbeddings[i], queryEmbedding),
  }));

  scored.sort((a, b) => b.cosine - a.cosine);

  return scored.slice(0, k).map((s, i) => ({
    id: i + 1,
    relevance: toDisplayRelevance(s.cosine),
    section: s.chunk.section,
    content: s.chunk.content,
  }));
}
