import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/rate-limit";
import { Chunk } from "@/lib/rag/chunk";

export const DOCUMENT_TOOL = "context-extractor-document";
export const PROMPT_TOOL = "context-extractor-prompt";

const DOCUMENT_TTL_HOURS = 24;

export async function saveDocument(
  ip: string,
  filename: string,
  totalTokens: number,
  chunks: Chunk[],
  chunkEmbeddings: number[][]
): Promise<string> {
  const ipHash = hashIp(ip);

  // Self-cleaning: expire this IP's own stale documents whenever it uploads a new one,
  // so uploaded content doesn't sit around forever for visitors who never come back.
  const cutoff = new Date(Date.now() - DOCUMENT_TTL_HOURS * 60 * 60 * 1000);
  await prisma.extractedDocument.deleteMany({ where: { ipHash, createdAt: { lt: cutoff } } });

  const document = await prisma.extractedDocument.create({
    data: {
      ipHash,
      filename,
      totalTokens,
      chunks: {
        create: chunks.map((chunk, i) => ({
          position: i,
          section: chunk.section,
          content: chunk.content,
          embedding: chunkEmbeddings[i] as unknown as object,
        })),
      },
    },
  });

  return document.id;
}

export async function loadDocumentForIp(
  documentId: string,
  ip: string
): Promise<{ totalTokens: number; chunks: Chunk[]; chunkEmbeddings: number[][] } | null> {
  const ipHash = hashIp(ip);
  const cutoff = new Date(Date.now() - DOCUMENT_TTL_HOURS * 60 * 60 * 1000);

  const document = await prisma.extractedDocument.findFirst({
    where: { id: documentId, ipHash, createdAt: { gte: cutoff } },
    include: { chunks: { orderBy: { position: "asc" } } },
  });

  if (!document) return null;

  return {
    totalTokens: document.totalTokens,
    chunks: document.chunks.map((c) => ({ section: c.section, content: c.content })),
    chunkEmbeddings: document.chunks.map((c) => c.embedding as unknown as number[]),
  };
}
