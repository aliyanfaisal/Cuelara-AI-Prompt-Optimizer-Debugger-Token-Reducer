import { diffWordsWithSpace } from "diff";

export interface DiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

export function diffPrompts(basePrompt: string, newPrompt: string): DiffPart[] {
  return diffWordsWithSpace(basePrompt, newPrompt).map((part) => ({
    value: part.value,
    added: Boolean(part.added),
    removed: Boolean(part.removed),
  }));
}
