import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export class UnsupportedFileTypeError extends Error {
  constructor(extension: string) {
    super(`Unsupported file type: ${extension}`);
    this.name = "UnsupportedFileTypeError";
  }
}

const TEXT_EXTENSIONS = new Set(["txt", "md", "json", "csv"]);

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedFile(filename: string): boolean {
  const ext = getExtension(filename);
  return TEXT_EXTENSIONS.has(ext) || ext === "pdf" || ext === "docx";
}

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = getExtension(filename);

  if (TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new UnsupportedFileTypeError(ext);
}
