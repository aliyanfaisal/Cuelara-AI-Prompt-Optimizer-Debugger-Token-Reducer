import { prisma } from "@/lib/prisma";
import { Chunk } from "@/lib/rag/chunk";

export const DOCUMENT_TOOL = "context-extractor-document";
export const PROMPT_TOOL = "context-extractor-prompt";

const DOCUMENT_TTL_HOURS = 24;

export async function saveDocument(
  subjectKey: string,
  filename: string,
  totalTokens: number,
  chunks: Chunk[],
  chunkEmbeddings: number[][]
): Promise<string> {
  // Self-cleaning: expire this subject's own stale documents whenever it uploads a new
  // one, so uploaded content doesn't sit around forever for visitors who never come back.
  const cutoff = new Date(Date.now() - DOCUMENT_TTL_HOURS * 60 * 60 * 1000);
  await prisma.extractedDocument.deleteMany({ where: { subjectKey, createdAt: { lt: cutoff } } });

  const document = await prisma.extractedDocument.create({
    data: {
      subjectKey,
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

export async function loadDocumentForSubject(
  documentId: string,
  subjectKey: string
): Promise<{ totalTokens: number; chunks: Chunk[]; chunkEmbeddings: number[][] } | null> {
  const cutoff = new Date(Date.now() - DOCUMENT_TTL_HOURS * 60 * 60 * 1000);

  const document = await prisma.extractedDocument.findFirst({
    where: { id: documentId, subjectKey, createdAt: { gte: cutoff } },
    include: { chunks: { orderBy: { position: "asc" } } },
  });

  if (!document) return null;

  return {
    totalTokens: document.totalTokens,
    chunks: document.chunks.map((c) => ({ section: c.section, content: c.content })),
    chunkEmbeddings: document.chunks.map((c) => c.embedding as unknown as number[]),
  };
}
