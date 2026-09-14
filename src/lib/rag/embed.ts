import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { GENAI_TIMEOUT_MS } from "@/lib/genai-timeout";

const EMBEDDING_MODEL = "gemini-embedding-001";
const BATCH_SIZE = 100;

export async function getGeminiApiKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
  return setting?.value || process.env.GEMINI_API_KEY || null;
}

export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GENAI_TIMEOUT_MS } });
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: { taskType },
    });

    if (!response.embeddings) {
      throw new Error("Embedding API returned no embeddings");
    }

    for (const embedding of response.embeddings) {
      if (!embedding.values) {
        throw new Error("Embedding API returned an embedding with no values");
      }
      results.push(embedding.values);
    }
  }

  return results;
}
