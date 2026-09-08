export interface Chunk {
  section: string;
  content: string;
}

const TARGET_WORDS = 400;
const MAX_WORDS = 500;
const OVERLAP_WORDS = 50;

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  return true;
}

function splitOversizedParagraph(paragraph: string): string[] {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length <= MAX_WORDS) return [paragraph];

  const parts: string[] = [];
  for (let i = 0; i < words.length; i += TARGET_WORDS) {
    parts.push(words.slice(i, i + TARGET_WORDS).join(" "));
  }
  return parts;
}

export function chunkText(text: string): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap(splitOversizedParagraph);

  if (paragraphs.length === 0) return [];

  const rawChunks: string[] = [];
  let current: string[] = [];
  let currentWordCount = 0;

  const flush = () => {
    if (current.length > 0) {
      rawChunks.push(current.join("\n\n"));
    }
  };

  for (const paragraph of paragraphs) {
    const wordCount = paragraph.split(/\s+/).filter(Boolean).length;

    if (currentWordCount > 0 && currentWordCount + wordCount > MAX_WORDS) {
      flush();
      const overlapWords = current.join(" ").split(/\s+/).filter(Boolean).slice(-OVERLAP_WORDS);
      current = overlapWords.length > 0 ? [overlapWords.join(" ")] : [];
      currentWordCount = overlapWords.length;
    }

    current.push(paragraph);
    currentWordCount += wordCount;

    if (currentWordCount >= TARGET_WORDS) {
      flush();
      const overlapWords = current.join(" ").split(/\s+/).filter(Boolean).slice(-OVERLAP_WORDS);
      current = overlapWords.length > 0 ? [overlapWords.join(" ")] : [];
      currentWordCount = overlapWords.length;
    }
  }
  flush();

  const total = rawChunks.length;
  return rawChunks.map((content, i) => {
    const firstLine = content.split("\n")[0];
    const section = looksLikeHeading(firstLine) ? firstLine.trim() : `Excerpt ${i + 1} of ${total}`;
    return { section, content };
  });
}
